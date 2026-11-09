import { lagosDate } from '@/lib/follow-ups'
import { hrDocumentBucket } from '@/lib/hr'
import { candidateHealthDocumentTypes, isClosedStage, type ScorecardRating } from '@/lib/hr-recruiting'
import { refreshCandidateRetention, type HrDatabase } from '../shared'

// Candidate retention under the NDPA (recruiting-process.md 8): unsuccessful
// candidates are anonymised 12 months after the role closes (24 months in the
// talent pool, only with consent), health data of candidates not hired is
// deleted within 30 days. Pipeline stages and dates stay for anonymised
// fairness statistics. Every action is written to hr_retention_log.
type LogRow = { entity_type: string; record_id: string; action: 'deleted' | 'anonymised'; retention_rule: string; performed_by: string | null }

async function writeLog(database: HrDatabase, rows: LogRow[]) {
  if (!rows.length) return
  const { error } = await database.from('hr_retention_log').insert(rows)
  if (error) throw error
}
async function removeFiles(database: HrDatabase, paths: string[]) {
  if (!paths.length) return
  const { error } = await database.storage.from(hrDocumentBucket).remove(paths)
  if (error) console.error('Error removing candidate files:', error.message)
}

export async function anonymiseCandidate(database: HrDatabase, candidateId: string, rule: string, performedBy: string | null) {
  const [{ data: candidate }, { data: applications, error }] = await Promise.all([
    database.from('hr_candidates').select('id,anonymised_at').eq('id', candidateId).maybeSingle(),
    database.from('hr_applications').select('id,stage,employee_id').eq('candidate_id', candidateId),
  ])
  if (error) throw error
  if (!candidate || candidate.anonymised_at) return { ok: false, reason: 'This candidate is already anonymised.' } as const
  const apps = applications || []
  if (apps.some((app) => app.employee_id || app.stage === 'hired')) return { ok: false, reason: 'This candidate was hired; their records are on the employee file.' } as const
  if (apps.some((app) => !isClosedStage(app.stage))) return { ok: false, reason: 'Reject or withdraw the open application first.' } as const
  const ids = apps.map((app) => app.id); const log: LogRow[] = []
  if (ids.length) {
    const { data: documents } = await database.from('hr_documents').select('id,storage_path').in('application_id', ids).is('employee_id', null)
    // Also clear anything left in the candidate folders (e.g. a CV replaced earlier).
    const listed = await Promise.all(ids.map(async (id) => { const { data } = await database.storage.from(hrDocumentBucket).list(`candidates/${id}`, { limit: 1000 }); return (data || []).map((file) => `candidates/${id}/${file.name}`) }))
    await removeFiles(database, Array.from(new Set([...(documents || []).map((doc) => doc.storage_path), ...listed.flat()])))
    if ((documents || []).length) { await database.from('hr_documents').delete().in('id', documents!.map((doc) => doc.id)); log.push(...documents!.map((doc) => ({ entity_type: 'hr_documents', record_id: doc.id, action: 'deleted' as const, retention_rule: rule, performed_by: performedBy }))) }
    const { data: credentials } = await database.from('hr_credentials').delete().in('application_id', ids).is('employee_id', null).select('id')
    log.push(...(credentials || []).map((row) => ({ entity_type: 'hr_credentials', record_id: row.id, action: 'deleted' as const, retention_rule: rule, performed_by: performedBy })))
    const { data: references } = await database.from('hr_reference_checks').delete().in('application_id', ids).select('id')
    log.push(...(references || []).map((row) => ({ entity_type: 'hr_reference_checks', record_id: row.id, action: 'deleted' as const, retention_rule: rule, performed_by: performedBy })))
    const { data: offers } = await database.from('hr_offers').delete().in('application_id', ids).select('id')
    log.push(...(offers || []).map((row) => ({ entity_type: 'hr_offers', record_id: row.id, action: 'deleted' as const, retention_rule: rule, performed_by: performedBy })))
    // Keep the numeric ratings for pass-rate reviews; drop written evidence and notes.
    const { data: cards } = await database.from('hr_scorecards').select('id,ratings').in('application_id', ids)
    for (const card of cards || []) await database.from('hr_scorecards').update({ notes: '', conflict_note: null, ratings: (card.ratings as ScorecardRating[] || []).map((item) => ({ competency_code: item.competency_code, rating: item.rating, evidence: '' })) }).eq('id', card.id)
    await database.from('hr_interviews').update({ adjustments_requested: null, location_or_link: null }).in('application_id', ids)
    await database.from('hr_application_events').update({ note: '' }).in('application_id', ids)
    const { error: appError } = await database.from('hr_applications').update({ cv_path: null, cover_note: '', salary_expectation_ngn: null, notice_period: null, right_to_work_status: null, rejection_reason: null, withdrawal_reason: null, decision_reason: null }).in('id', ids)
    if (appError) throw appError
    log.push(...ids.map((id) => ({ entity_type: 'hr_applications', record_id: id, action: 'anonymised' as const, retention_rule: rule, performed_by: performedBy })))
  }
  const { error: candidateError } = await database.from('hr_candidates').update({ full_name: 'Anonymised candidate', email: `anonymised-${candidateId}@invalid.local`, phone: null, location: null, talent_pool_consent: false, talent_pool_consent_at: null, talent_pool_expires_at: null, retention_delete_after: null, anonymised_at: new Date().toISOString() }).eq('id', candidateId)
  if (candidateError) throw candidateError
  log.push({ entity_type: 'hr_candidates', record_id: candidateId, action: 'anonymised', retention_rule: rule, performed_by: performedBy })
  await writeLog(database, log)
  return { ok: true, records: log.length } as const
}

// What the monthly run would do today.
export async function retentionPreview(database: HrDatabase) {
  const today = lagosDate()
  const [due, pool, health] = await Promise.all([
    database.from('hr_candidates').select('id,full_name,retention_delete_after,talent_pool_consent').is('anonymised_at', null).lt('retention_delete_after', today).order('retention_delete_after').limit(500),
    database.from('hr_candidates').select('id,full_name,talent_pool_expires_at').is('anonymised_at', null).eq('talent_pool_consent', true).lt('talent_pool_expires_at', today).limit(500),
    database.from('hr_documents').select('id,title,document_type,application:hr_applications(stage,employee_id)').in('document_type', [...candidateHealthDocumentTypes]).is('employee_id', null).not('application_id', 'is', null).neq('status', 'deleted').limit(500),
  ])
  for (const result of [due, pool, health]) if (result.error) throw result.error
  type HealthRow = { id: string; title: string; document_type: string; application: { stage: string; employee_id: string | null } | { stage: string; employee_id: string | null }[] | null }
  const healthDue = ((health.data || []) as HealthRow[]).filter((doc) => { const app = Array.isArray(doc.application) ? doc.application[0] : doc.application; return app && !app.employee_id && ['rejected', 'withdrawn'].includes(app.stage) })
  return { today, candidates: due.data || [], talentPoolExpired: pool.data || [], healthDocuments: healthDue.map(({ id, title, document_type }) => ({ id, title, document_type })) }
}

export async function runRetention(database: HrDatabase, performedBy: string | null) {
  const preview = await retentionPreview(database); const log: LogRow[] = []
  // 1. Talent-pool consent that has run out ends; retention falls back to 12 months after the role closed.
  for (const candidate of preview.talentPoolExpired) {
    await database.from('hr_candidates').update({ talent_pool_consent: false }).eq('id', candidate.id)
    await refreshCandidateRetention(database, candidate.id)
  }
  // 2. Health data of candidates not hired.
  if (preview.healthDocuments.length) {
    const ids = preview.healthDocuments.map((doc) => doc.id)
    const { data: documents } = await database.from('hr_documents').select('id,storage_path').in('id', ids)
    await removeFiles(database, (documents || []).map((doc) => doc.storage_path))
    await database.from('hr_documents').delete().in('id', ids)
    log.push(...ids.map((id) => ({ entity_type: 'hr_documents', record_id: id, action: 'deleted' as const, retention_rule: 'Health data of a candidate not hired: deleted within 30 days', performed_by: performedBy })))
  }
  await writeLog(database, log)
  // 3. Candidates past retention_delete_after (re-read: step 1 may have moved dates).
  const { data: due, error } = await database.from('hr_candidates').select('id,talent_pool_expires_at').is('anonymised_at', null).lt('retention_delete_after', lagosDate()).limit(500)
  if (error) throw error
  let anonymised = 0; const skipped: string[] = []
  for (const candidate of due || []) {
    const result = await anonymiseCandidate(database, candidate.id, candidate.talent_pool_expires_at ? 'Talent pool expired (24 months with consent)' : 'Unsuccessful candidate: 12 months after the role closed', performedBy)
    if (result.ok) anonymised += 1; else skipped.push(result.reason)
  }
  return { talentPoolEnded: preview.talentPoolExpired.length, healthDocumentsDeleted: preview.healthDocuments.length, anonymised, skipped: skipped.length }
}
