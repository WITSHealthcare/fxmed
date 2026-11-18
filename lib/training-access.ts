import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminRole } from './admin-auth'
import {
  gradeTrainingResponse, hasForm, isLessonUnlocked, programLessons, progressPercent,
  type TrainingAnswer, type TrainingAttemptSummary, type TrainingEnrolment, type TrainingLesson, type TrainingProgram,
} from './training'

// Who is learning: a dashboard staff member (any role, admins included) or an
// external learner who signed up through /learn.
export type TrainingLearner =
  | { kind: 'staff'; id: string; email: string; role: AdminRole }
  | { kind: 'external'; id: string; email: string }

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const heldEnrolment = (enrolment: TrainingEnrolment | null) => enrolment && enrolment.status !== 'revoked'

export const isInternal = (program: Pick<TrainingProgram, 'visibility'>) => program.visibility !== 'public'
export const isPublic = (program: Pick<TrainingProgram, 'visibility'>) => program.visibility !== 'internal'

/** Assigned to a staff member by role or email (an admin has no automatic assignment). */
export function isAssigned(program: TrainingProgram, learner: TrainingLearner) {
  if (learner.kind !== 'staff' || program.status !== 'published' || !isInternal(program)) return false
  return (program.audience_roles || []).includes(learner.role) || (program.assigned_emails || []).includes(learner.email.toLowerCase())
}

/** Whether a learner may join the course themselves (free staff self-enrol, or a public course). */
export function canSelfEnrol(program: TrainingProgram, learner: TrainingLearner) {
  if (program.status !== 'published') return false
  if (learner.kind === 'staff') return isInternal(program) && (program.self_enrol || learner.role === 'admin')
  return isPublic(program)
}

export function canOpenProgram(program: TrainingProgram, learner: TrainingLearner, enrolment: TrainingEnrolment | null) {
  if (program.status !== 'published' || enrolment?.status === 'revoked') return false
  if (learner.kind === 'external') return isPublic(program) && Boolean(heldEnrolment(enrolment))
  return isAssigned(program, learner) || (isInternal(program) && Boolean(heldEnrolment(enrolment)))
}

export async function getEnrolment(database: SupabaseClient, programId: string, userId: string) {
  const { data, error } = await database.from('training_enrolments').select('*').eq('program_id', programId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as TrainingEnrolment | null
}

const dueFrom = (program: TrainingProgram) => program.default_due_days ? new Date(Date.now() + program.default_due_days * 86400000).toISOString() : null

/** Create the enrolment row for a learner who has access but none yet (assigned staff, a free join, a purchase). */
export async function enrol(database: SupabaseClient, program: TrainingProgram, learner: TrainingLearner, source: TrainingEnrolment['source'], dueAt?: string | null) {
  const existing = await getEnrolment(database, program.id, learner.id)
  if (existing) {
    if (existing.status !== 'revoked' || source === 'assigned') return existing
    // A purchase or an admin's manual enrolment restores a revoked place.
    const { data, error } = await database.from('training_enrolments').update({ status: 'active', source }).eq('id', existing.id).select('*').single()
    if (error) throw error
    return data as TrainingEnrolment
  }
  const { data, error } = await database.from('training_enrolments')
    .upsert({ program_id: program.id, user_id: learner.id, learner_type: learner.kind, source, due_at: dueAt === undefined ? dueFrom(program) : dueAt }, { onConflict: 'program_id,user_id', ignoreDuplicates: true })
    .select('*').maybeSingle()
  if (error) throw error
  return (data as TrainingEnrolment | null) || await getEnrolment(database, program.id, learner.id)
}

/** The learner's enrolment, creating it on first open for assigned staff. Null if they may not open the course. */
export async function accessProgram(database: SupabaseClient, program: TrainingProgram, learner: TrainingLearner) {
  let enrolment = await getEnrolment(database, program.id, learner.id)
  if (!canOpenProgram(program, learner, enrolment)) return null
  if (!enrolment) enrolment = await enrol(database, program, learner, 'assigned')
  return enrolment
}

export const newCertificateId = () => `FXM-${randomBytes(6).toString('hex').toUpperCase()}`

/**
 * Save a lesson as complete or not, then keep the enrolment in step: started,
 * last active, and completed (with a certificate number) at 100%.
 */
export async function setLessonComplete(database: SupabaseClient, program: TrainingProgram, enrolment: TrainingEnrolment, lessonId: string, completed: boolean) {
  const lessonIds = programLessons(program).map((lesson) => lesson.id)
  const { data: existing } = await database.from('training_progress').select('completed_lesson_ids').eq('program_id', program.id).eq('user_id', enrolment.user_id).maybeSingle()
  const set = new Set<string>(existing?.completed_lesson_ids || [])
  if (completed) set.add(lessonId); else set.delete(lessonId)
  const completedIds = Array.from(set).filter((id) => lessonIds.includes(id))
  const now = new Date().toISOString()
  const { error } = await database.from('training_progress').upsert({ program_id: program.id, user_id: enrolment.user_id, completed_lesson_ids: completedIds, updated_at: now })
  if (error) throw error

  const percent = progressPercent(program, completedIds)
  const finished = percent === 100
  const update: Partial<TrainingEnrolment> = { last_activity_at: now, started_at: enrolment.started_at || now }
  if (finished && enrolment.status !== 'completed') {
    Object.assign(update, { status: 'completed', completed_at: now, certificate_id: enrolment.certificate_id || (program.certificate_enabled ? newCertificateId() : null) })
  } else if (!finished && enrolment.status === 'completed') {
    // Content added after completion reopens the course; the certificate already issued stays valid.
    Object.assign(update, { status: 'active', completed_at: null })
  }
  const { data: saved, error: enrolmentError } = await database.from('training_enrolments').update(update).eq('id', enrolment.id).select('*').single()
  if (enrolmentError) throw enrolmentError
  return { completed_lesson_ids: completedIds, progress_percent: percent, enrolment: saved as TrainingEnrolment }
}

export async function completedLessons(database: SupabaseClient, programId: string, userId: string) {
  const { data } = await database.from('training_progress').select('completed_lesson_ids').eq('program_id', programId).eq('user_id', userId).maybeSingle()
  return (data?.completed_lesson_ids || []) as string[]
}

/** Tick a lesson without a form. Lessons with a form complete through submitLessonForm. */
export async function tickLesson(database: SupabaseClient, program: TrainingProgram, enrolment: TrainingEnrolment, lessonId: string, completed: boolean) {
  const lesson = programLessons(program).find((item) => item.id === lessonId)
  if (!lesson) return { error: 'Lesson not found.', status: 404 } as const
  if (hasForm(lesson)) return { error: 'Submit the lesson form to complete this lesson.', status: 400 } as const
  if (completed && !isLessonUnlocked(program, await completedLessons(database, program.id, enrolment.user_id), lessonId)) return { error: 'Finish the earlier lessons first.', status: 400 } as const
  return { result: await setLessonComplete(database, program, enrolment, lessonId, completed) } as const
}

/** Grade and save a lesson form: every attempt is kept, the latest is the response on record. */
export async function submitLessonForm(database: SupabaseClient, program: TrainingProgram, enrolment: TrainingEnrolment, lessonId: string, answers: unknown) {
  const lesson = programLessons(program).find((item) => item.id === lessonId) as TrainingLesson | undefined
  if (!lesson) return { error: 'Lesson not found.', status: 404 } as const
  if (!lesson.form?.questions.length) return { error: 'This lesson has no form.', status: 400 } as const
  if (!isLessonUnlocked(program, await completedLessons(database, program.id, enrolment.user_id), lessonId)) return { error: 'Finish the earlier lessons first.', status: 400 } as const
  const graded = gradeTrainingResponse(lesson.form, answers as Record<string, TrainingAnswer>)
  if ('error' in graded) return { error: graded.error, status: 400 } as const

  const submitted_at = new Date().toISOString()
  const record = { program_id: program.id, lesson_id: lessonId, user_id: enrolment.user_id, ...graded, submitted_at }
  const { error: attemptError } = await database.from('training_attempts').insert(record)
  if (attemptError) throw attemptError
  const { data: response, error } = await database.from('training_form_responses').upsert(record).select('*').single()
  if (error) throw error
  const progress = await setLessonComplete(database, program, enrolment, lessonId, graded.passed !== false)
  const attempts = await attemptSummary(database, program.id, enrolment.user_id)
  return { result: { response, attempts, ...progress } } as const
}

export async function attemptSummary(database: SupabaseClient, programId: string, userId: string): Promise<TrainingAttemptSummary[]> {
  const { data, error } = await database.from('training_attempts').select('lesson_id,score').eq('program_id', programId).eq('user_id', userId)
  if (error) { console.error('Training attempts unavailable:', error.message); return [] }
  const byLesson = new Map<string, TrainingAttemptSummary>()
  for (const row of data || []) {
    const item = byLesson.get(row.lesson_id) || { lesson_id: row.lesson_id, attempts: 0, best_score: null }
    item.attempts += 1
    if (row.score !== null && (item.best_score === null || row.score > item.best_score)) item.best_score = row.score
    byLesson.set(row.lesson_id, item)
  }
  return Array.from(byLesson.values())
}

/** A course with this learner's progress, latest responses, attempt counts and enrolment attached. */
export async function withLearnerState(database: SupabaseClient, program: TrainingProgram, userId: string, enrolment: TrainingEnrolment | null): Promise<TrainingProgram> {
  const [completed, responses, attempts] = await Promise.all([
    completedLessons(database, program.id, userId),
    database.from('training_form_responses').select('*').eq('program_id', program.id).eq('user_id', userId),
    attemptSummary(database, program.id, userId),
  ])
  return { ...program, completed_lesson_ids: completed, progress_percent: progressPercent(program, completed), form_responses: responses.data || [], attempts, enrolment }
}

export async function loadProgram(database: SupabaseClient, by: { id?: string; slug?: string }) {
  if (by.id && !uuidPattern.test(by.id)) return null
  if (by.slug && !/^[a-z0-9-]{1,120}$/.test(by.slug)) return null
  const query = database.from('training_programs').select('*')
  const { data, error } = await (by.id ? query.eq('id', by.id) : query.eq('slug', by.slug!)).maybeSingle()
  if (error) throw error
  return data as TrainingProgram | null
}

export function trainingErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : ''
  if (/training_(enrolments|attempts|learner_accounts|payments)|column .*(visibility|slug|price_kobo)/.test(message)) return 'The training database migration (056) has not been applied yet.'
  return 'The training request could not be completed.'
}
