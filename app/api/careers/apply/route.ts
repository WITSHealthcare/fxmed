import { NextRequest, NextResponse } from 'next/server'
import { lagosDate } from '@/lib/follow-ups'
import { candidatePrivacyNoticeVersion, cleanHrEmail, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, getHrDatabase, hrDocumentBucket } from '@/lib/hr'
import { addMonths, unsuccessfulRetentionMonths } from '@/lib/hr-recruiting'
import { checkRateLimit } from '@/lib/request-security'
import { checkUpload, cvMimeTypes, recordEvent, refreshCandidateRetention, stageDueAt, talentPoolExpiry } from '@/app/api/admin/hr/recruiting/shared'

// Public careers application (replaces apply-by-email). No dashboard auth: it
// accepts only published openings, requires the privacy notice, rate-limits
// by connection and never returns stored data. The CV goes to the private
// hr-documents bucket under candidates/<application_id>/.
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, 'careers-apply', 5, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: `Too many applications from your connection. Please try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const database = getHrDatabase()
  if (!database) return NextResponse.json({ error: 'Applications are unavailable right now. Please try again later.' }, { status: 503 })
  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Please complete the application form.' }, { status: 400 })
  if (cleanHrText(form.get('website'), 200)) return NextResponse.json({ error: 'Your application could not pass our spam check. Please email us instead.' }, { status: 400 })

  const openingId = cleanHrUuid(form.get('opening_id')); const fullName = cleanHrText(form.get('full_name'), 160); const email = cleanHrEmail(form.get('email'))
  const phone = cleanHrOptionalText(form.get('phone'), 40); const location = cleanHrOptionalText(form.get('location'), 160)
  const talentPool = form.get('talent_pool') === 'true'; const file = form.get('cv')
  if (!openingId || !fullName || !email) return NextResponse.json({ error: 'Choose a role and enter your full name and a valid email address.' }, { status: 400 })
  if (form.get('privacy_acknowledged') !== 'true') return NextResponse.json({ error: 'Please confirm you have read the candidate privacy notice.' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'Please attach your CV (PDF or Word, up to 15 MB).' }, { status: 400 })
  const upload = await checkUpload(file, cvMimeTypes)
  if ('error' in upload) return NextResponse.json({ error: `CV: ${upload.error} Use PDF or Word, up to 15 MB.` }, { status: 400 })

  let createdCandidateId: string | null = null; let applicationId: string | null = null; let storedPath: string | null = null
  try {
    const { data: opening, error: openingError } = await database.from('career_openings').select('id,title,department,status').eq('id', openingId).maybeSingle()
    if (openingError) throw openingError
    if (!opening || opening.status !== 'published') return NextResponse.json({ error: 'This role is no longer open for applications.' }, { status: 400 })

    // One live candidate per email. Repeat applicants keep their consent history:
    // a new tick can grant talent-pool consent but an empty box never removes it.
    // The form is unauthenticated, so it never overwrites stored details; it only fills blanks.
    const now = new Date().toISOString()
    const { data: existing, error: candidateError } = await database.from('hr_candidates').select('id,phone,location,talent_pool_consent,talent_pool_consent_at').eq('email', email).is('anonymised_at', null).maybeSingle()
    if (candidateError) throw candidateError
    let candidateId = existing?.id as string | undefined
    if (existing) {
      const grant = talentPool && !existing.talent_pool_consent
      const { error } = await database.from('hr_candidates').update({ ...(phone && !existing.phone ? { phone } : {}), ...(location && !existing.location ? { location } : {}), privacy_notice_version: candidatePrivacyNoticeVersion, privacy_acknowledged_at: now, ...(grant ? { talent_pool_consent: true, talent_pool_consent_at: now, talent_pool_expires_at: talentPoolExpiry(now) } : {}) }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { data, error } = await database.from('hr_candidates').insert({ full_name: fullName, email, phone, location, source: 'careers_page', privacy_notice_version: candidatePrivacyNoticeVersion, privacy_acknowledged_at: now, talent_pool_consent: talentPool, talent_pool_consent_at: talentPool ? now : null, talent_pool_expires_at: talentPool ? talentPoolExpiry(now) : null, retention_delete_after: addMonths(lagosDate(), unsuccessfulRetentionMonths) }).select('id').single()
      if (error) throw error
      candidateId = createdCandidateId = data.id
    }

    // The approved requisition (migration 042) supplies the role family and hiring manager.
    const { data: requisitions, error: requisitionError } = await database.from('hr_requisitions').select('id,role_family,hiring_manager_id,status').eq('career_opening_id', openingId).in('status', ['approved', 'on_hold', 'pending_approval', 'draft'])
    if (requisitionError) console.error('Requisition lookup failed (migration 042?):', requisitionError.message)
    const requisition = (requisitions || []).find((row) => row.status === 'approved') || (requisitions || [])[0]
    const { data: application, error: applicationError } = await database.from('hr_applications').insert({
      candidate_id: candidateId, career_opening_id: opening.id, opening_title: opening.title, department: opening.department,
      ...(requisition ? { requisition_id: requisition.id, role_family: requisition.role_family, hiring_manager_id: requisition.hiring_manager_id } : {}),
      cover_note: cleanHrText(form.get('cover_note'), 5000), salary_expectation_ngn: cleanHrNumber(form.get('salary_expectation_ngn'), 0, 1e11),
      notice_period: cleanHrOptionalText(form.get('notice_period'), 120), right_to_work_status: cleanHrOptionalText(form.get('right_to_work_status'), 120),
      stage: 'applied', stage_due_at: await stageDueAt(database, 'applied'),
    }).select('id').single()
    if (applicationError) {
      if (applicationError.code === '23505') { await cleanup(); return NextResponse.json({ error: 'You have already applied for this role. We will be in touch about your application.' }, { status: 409 }) }
      throw applicationError
    }
    applicationId = application.id
    storedPath = `candidates/${application.id}/${crypto.randomUUID()}-${upload.safeName}`
    const { error: uploadError } = await database.storage.from(hrDocumentBucket).upload(storedPath, file, { contentType: upload.mime, upsert: false })
    if (uploadError) { storedPath = null; throw uploadError }
    const [{ error: cvError }, { error: documentError }] = await Promise.all([
      database.from('hr_applications').update({ cv_path: storedPath }).eq('id', application.id),
      database.from('hr_documents').insert({ application_id: application.id, document_type: 'cv', title: `CV — ${fullName}`.slice(0, 200), storage_path: storedPath, mime_type: upload.mime, size_bytes: file.size, status: 'uploaded' }),
    ])
    if (cvError || documentError) throw cvError || documentError
    await recordEvent(database, { application_id: application.id, to_stage: 'applied', note: `Applied through the careers page (privacy notice ${candidatePrivacyNoticeVersion}${talentPool ? ', talent-pool consent given' : ''}).`, changed_by: null })
    await refreshCandidateRetention(database, candidateId!)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error saving career application:', error)
    await cleanup()
    const code = (error as { code?: string } | null)?.code
    return NextResponse.json({ error: code === '42P01' || code === 'PGRST205' ? 'Online applications are not available yet. Please email your CV instead.' : 'We could not save your application. Please try again or email your CV.' }, { status: 500 })
  }

  async function cleanup() {
    if (storedPath) await database!.storage.from(hrDocumentBucket).remove([storedPath])
    if (applicationId) await database!.from('hr_applications').delete().eq('id', applicationId)
    if (createdCandidateId) await database!.from('hr_candidates').delete().eq('id', createdCandidateId)
  }
}
