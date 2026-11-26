import { NextRequest, NextResponse } from 'next/server'
import { getUserAdminRole, adminRoles } from '@/lib/admin-auth'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { cleanTrainingForm, cleanTrainingText, getTrainingDatabase, slugify, toPreview, type TrainingEnrolment, type TrainingLesson, type TrainingModule, type TrainingProgram } from '@/lib/training'
import { accessProgram, canOpenProgram, canSelfEnrol, isAssigned, loadProgram, tickLesson, trainingErrorMessage, uuidPattern, withLearnerState } from '@/lib/training-access'
import { getRequestStaffLearner } from '@/lib/training-learner'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Only http(s) links, so a lesson can never hand learners a javascript: or data: URL.
function cleanResourceUrl(value: unknown) {
  const url = cleanTrainingText(value, 2000)
  if (!url) return ''
  try { return ['https:', 'http:'].includes(new URL(url).protocol) ? url : '' } catch { return '' }
}

function cleanModules(value: unknown): TrainingModule[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 50).flatMap((raw, moduleIndex) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>
    const title = cleanTrainingText(item.title, 160)
    if (!title) return []
    const lessons = Array.isArray(item.lessons) ? item.lessons.slice(0, 100).flatMap((lessonRaw, lessonIndex) => {
      if (!lessonRaw || typeof lessonRaw !== 'object') return []
      const lesson = lessonRaw as Record<string, unknown>
      const lessonTitle = cleanTrainingText(lesson.title, 160)
      if (!lessonTitle) return []
      return [{
        id: cleanTrainingText(lesson.id, 80) || `lesson-${moduleIndex + 1}-${lessonIndex + 1}`,
        title: lessonTitle,
        content: cleanTrainingText(lesson.content, 60000),
        resourceUrl: cleanResourceUrl(lesson.resourceUrl),
        durationMinutes: Math.max(0, Math.min(1440, Math.trunc(Number(lesson.durationMinutes) || 0))),
        form: cleanTrainingForm(lesson.form),
      } satisfies TrainingLesson]
    }) : []
    return [{ id: cleanTrainingText(item.id, 80) || `module-${moduleIndex + 1}`, title, lessons }]
  })
}

function payload(body: Record<string, unknown>) {
  const title = cleanTrainingText(body.title, 160)
  if (!title) return { error: 'Add a program title.' }
  const visibility = body.visibility === 'public' || body.visibility === 'both' ? body.visibility : 'internal'
  const audienceRoles = Array.isArray(body.audience_roles)
    ? Array.from(new Set(body.audience_roles.filter((role): role is string => (adminRoles as string[]).includes(role))))
    : []
  const assignedEmails = Array.isArray(body.assigned_emails)
    ? Array.from(new Set(body.assigned_emails.map((email) => cleanTrainingText(email, 254).toLowerCase()).filter((email) => emailPattern.test(email)))).slice(0, 500)
    : []
  const selfEnrol = body.self_enrol === true
  if (visibility !== 'public' && !audienceRoles.length && !assignedEmails.length && !selfEnrol) return { error: 'Choose a role, add member emails, or allow staff to self-enrol.' }
  const slug = slugify(cleanTrainingText(body.slug, 120) || title)
  if (visibility !== 'internal' && !slug) return { error: 'Public courses need a web address (slug).' }
  const price = Math.round(Number(body.price_naira) * 100)
  const dueDays = Math.trunc(Number(body.default_due_days))
  const outcomes = Array.isArray(body.learning_outcomes) ? body.learning_outcomes.map((item) => cleanTrainingText(item, 300)).filter(Boolean).slice(0, 20) : []
  const cover = cleanTrainingText(body.cover_image_url, 2000)
  return {
    clean: {
      title, description: cleanTrainingText(body.description, 3000), status: body.status === 'published' ? 'published' : 'draft',
      audience_roles: audienceRoles, assigned_emails: assignedEmails, modules: cleanModules(body.modules),
      slug: slug || null, visibility, price_kobo: Number.isFinite(price) && price > 0 ? Math.min(price, 2_000_000_000) : 0, currency: 'NGN',
      cover_image_url: /^(https:\/\/|\/)/.test(cover) ? cover : '', summary: cleanTrainingText(body.summary, 600), learning_outcomes: outcomes,
      self_enrol: selfEnrol, listed: body.listed !== false, sequential: body.sequential === true, certificate_enabled: body.certificate_enabled === true,
      default_due_days: Number.isFinite(dueDays) && dueDays >= 1 && dueDays <= 365 ? dueDays : null,
    },
  }
}

const saveError = (error: unknown, fallback: string) => {
  const code = typeof error === 'object' && error && 'code' in error ? (error as { code: string }).code : ''
  if (code === '23505') return NextResponse.json({ error: 'Another course already uses that web address. Choose a different slug.' }, { status: 409 })
  console.error(fallback, error)
  return NextResponse.json({ error: trainingErrorMessage(error) === 'The training request could not be completed.' ? fallback : trainingErrorMessage(error) }, { status: 500 })
}

// Admins get every program to manage (default). ?view=learn returns the
// caller's own courses plus the staff catalogue, for every role.
export async function GET(request: NextRequest) {
  try {
    const context = await getRequestStaffLearner(request)
    if (!context) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })
    const { database, learner, role } = context
    const { data, error } = await database.from('training_programs').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    const all = (data || []) as TrainingProgram[]
    if (role === 'admin' && request.nextUrl.searchParams.get('view') !== 'learn') return NextResponse.json({ programs: all })

    const { data: enrolmentRows, error: enrolmentError } = await database.from('training_enrolments').select('*').eq('user_id', learner.id)
    if (enrolmentError) throw enrolmentError
    const enrolments = new Map((enrolmentRows as TrainingEnrolment[]).map((row) => [row.program_id, row]))
    const mine = all.filter((program) => canOpenProgram(program, learner, enrolments.get(program.id) || null))
    const programs = await Promise.all(mine.map(async (program) => {
      // Assigned staff get an enrolment (and due date) the first time they see a course.
      const enrolment = enrolments.get(program.id) || (isAssigned(program, learner) ? await accessProgram(database, program, learner) : null)
      return withLearnerState(database, program, learner.id, enrolment)
    }))
    const catalogue = all.filter((program) => !mine.includes(program) && enrolments.get(program.id)?.status !== 'revoked' && canSelfEnrol(program, learner)).map(toPreview)
    return NextResponse.json({ programs, catalogue })
  } catch (error) { console.error('Error loading training:', error); return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const database = getTrainingDatabase()
    if (getUserAdminRole(user) !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const result = body ? payload(body) : { error: 'Add a program title.' }
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    const { data, error } = await database.from('training_programs').insert({ ...result.clean, created_by: user!.id }).select('*').single()
    if (error) throw error
    return NextResponse.json({ program: data }, { status: 201 })
  } catch (error) { return saveError(error, 'Failed to create training program.') }
}

// With lessonId: any staff member ticks a lesson in their own course.
// Without: an admin saves the whole program.
export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestStaffLearner(request)
    if (!context) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })
    const { database, learner, role } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.id !== 'string' || !uuidPattern.test(body.id)) return NextResponse.json({ error: 'A valid program is required.' }, { status: 400 })

    if (body.lessonId !== undefined) {
      const lessonId = cleanTrainingText(body.lessonId, 80)
      const program = await loadProgram(database, { id: body.id })
      const enrolment = program && lessonId ? await accessProgram(database, program, learner) : null
      if (!program || !enrolment) return NextResponse.json({ error: 'Training access denied.' }, { status: 403 })
      const outcome = await tickLesson(database, program, enrolment, lessonId, body.completed !== false)
      if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status })
      return NextResponse.json(outcome.result)
    }

    if (role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    const result = payload(body)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    const { data, error } = await database.from('training_programs').update(result.clean).eq('id', body.id).select('*').single()
    if (error) throw error
    return NextResponse.json({ program: data })
  } catch (error) { return saveError(error, 'Failed to update training program.') }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const database = getTrainingDatabase(); const id = new URL(request.url).searchParams.get('id') || ''
    if (getUserAdminRole(user) !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    if (!uuidPattern.test(id)) return NextResponse.json({ error: 'A valid program is required.' }, { status: 400 })
    const { error } = await database.from('training_programs').delete().eq('id', id); if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) { console.error('Error deleting training:', error); return NextResponse.json({ error: 'Failed to delete training program.' }, { status: 500 }) }
}
