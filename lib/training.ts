import { createClient } from '@supabase/supabase-js'
import type { AdminRole } from './admin-auth'
import { cleanFormDefinition, cleanFormText, gradeFormResponse, type FormAnswer, type FormDefinition, type FormQuestion, type FormQuestionType } from './forms'

export { choiceTypes, isGradable, questionOptions, questionTypes, yesNo } from './forms'

export type TrainingAudienceRole = Exclude<AdminRole, 'admin'>
// Lesson forms use the shared form model in lib/forms.ts.
export type TrainingQuestionType = FormQuestionType
export type TrainingQuestion = FormQuestion
export type TrainingForm = FormDefinition
export type TrainingAnswer = FormAnswer
export type TrainingFormResponse = {
  program_id: string; lesson_id: string; user_id: string; answers: Record<string, TrainingAnswer>
  score: number | null; passed: boolean | null; submitted_at: string; respondent?: string
}
export type TrainingLesson = { id: string; title: string; content: string; resourceUrl: string; durationMinutes: number; form?: TrainingForm | null }
export type TrainingModule = { id: string; title: string; lessons: TrainingLesson[] }
export type TrainingVisibility = 'internal' | 'public' | 'both'
export type TrainingEnrolmentStatus = 'active' | 'completed' | 'revoked'
export type TrainingEnrolment = {
  id: string; program_id: string; user_id: string; learner_type: 'staff' | 'external'
  source: 'assigned' | 'self' | 'purchase' | 'free' | 'manual'; status: TrainingEnrolmentStatus
  enrolled_at: string; due_at: string | null; started_at: string | null; completed_at: string | null
  last_activity_at: string | null; certificate_id: string | null
}
export type TrainingAttemptSummary = { lesson_id: string; attempts: number; best_score: number | null }
export type TrainingProgram = {
  id: string; title: string; description: string; status: 'draft' | 'published'; audience_roles: AdminRole[]
  assigned_emails: string[]; modules: TrainingModule[]; created_at: string; updated_at: string
  slug: string | null; visibility: TrainingVisibility; price_kobo: number; currency: string; cover_image_url: string
  summary: string; learning_outcomes: string[]; self_enrol: boolean; sequential: boolean
  certificate_enabled: boolean; default_due_days: number | null; listed: boolean
  completed_lesson_ids?: string[]; progress_percent?: number; form_responses?: TrainingFormResponse[]
  enrolment?: TrainingEnrolment | null; attempts?: TrainingAttemptSummary[]
}
// Admin tracking: one learner's place in one course.
export type TrackingStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'revoked'
export type TrackingRow = {
  program_id: string; user_id: string; enrolment_id: string | null; name: string; email: string
  learner_type: 'staff' | 'external'; source: string; status: TrackingStatus; progress_percent: number
  enrolled_at: string | null; due_at: string | null; last_activity_at: string | null; completed_at: string | null
  certificate_id: string | null; quiz_average: number | null; attempts: number
}

/** What anyone may see before enrolling: the outline, never lesson content or answers. */
export type TrainingPreview = Pick<TrainingProgram, 'id' | 'title' | 'description' | 'slug' | 'visibility' | 'price_kobo' | 'currency' | 'cover_image_url' | 'summary' | 'learning_outcomes' | 'sequential' | 'certificate_enabled' | 'self_enrol' | 'listed'> & {
  modules: { id: string; title: string; lessons: { id: string; title: string; durationMinutes: number; hasQuiz: boolean }[] }[]
  total_minutes: number; lesson_count: number; quiz_count: number
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const hasForm = (lesson: TrainingLesson) => Boolean(lesson.form?.questions.length)
export const programLessons = (program: Pick<TrainingProgram, 'modules'>) => (program.modules || []).flatMap((module) => module.lessons)
export const progressPercent = (program: Pick<TrainingProgram, 'modules'>, completed: string[]) => {
  const ids = programLessons(program).map((lesson) => lesson.id)
  return ids.length ? Math.round(ids.filter((id) => completed.includes(id)).length / ids.length * 100) : 0
}

/** A lesson in a sequential course opens once every lesson before it is complete. */
export function isLessonUnlocked(program: Pick<TrainingProgram, 'modules' | 'sequential'>, completed: string[], lessonId: string) {
  if (!program.sequential) return true
  for (const lesson of programLessons(program)) {
    if (lesson.id === lessonId) return true
    if (!completed.includes(lesson.id)) return false
  }
  return false
}

export function toPreview(program: TrainingProgram): TrainingPreview {
  const modules = (program.modules || []).map((module) => ({ id: module.id, title: module.title, lessons: module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, durationMinutes: lesson.durationMinutes, hasQuiz: lesson.form?.kind === 'quiz' && hasForm(lesson) })) }))
  const lessons = modules.flatMap((module) => module.lessons)
  return {
    id: program.id, title: program.title, description: program.description, slug: program.slug, visibility: program.visibility, price_kobo: program.price_kobo,
    currency: program.currency, cover_image_url: program.cover_image_url, summary: program.summary, learning_outcomes: program.learning_outcomes,
    sequential: program.sequential, certificate_enabled: program.certificate_enabled, self_enrol: program.self_enrol, listed: program.listed !== false, modules,
    total_minutes: lessons.reduce((sum, lesson) => sum + (lesson.durationMinutes || 0), 0), lesson_count: lessons.length, quiz_count: lessons.filter((lesson) => lesson.hasQuiz).length,
  }
}

export const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
export const formatPrice = (kobo: number, currency = 'NGN') => kobo > 0
  ? new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(kobo / 100)
  : 'Free'
export const formatMinutes = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}` : `${minutes} min`
export const isOverdue = (enrolment: Pick<TrainingEnrolment, 'due_at' | 'status'> | null | undefined) =>
  Boolean(enrolment?.due_at && enrolment.status === 'active' && new Date(enrolment.due_at).getTime() < Date.now())

/** YouTube and Vimeo links become an embeddable player URL; anything else stays a link. */
export function videoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`
    if (host.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'vimeo.com') { const id = parsed.pathname.match(/^\/(\d+)/)?.[1]; return id ? `https://player.vimeo.com/video/${id}` : null }
    if (host === 'player.vimeo.com') return url
  } catch { /* not a URL */ }
  return null
}

export function getTrainingDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export const cleanTrainingText = cleanFormText
export const cleanTrainingForm = cleanFormDefinition
export const gradeTrainingResponse = gradeFormResponse
