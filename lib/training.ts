import { createClient } from '@supabase/supabase-js'
import type { AdminRole } from './admin-auth'

export type TrainingAudienceRole = Exclude<AdminRole, 'admin'>
export type TrainingQuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'dropdown' | 'yes_no' | 'rating'
// `correct` holds option text for gradable questions; it is only used when the form is a quiz.
export type TrainingQuestion = { id: string; type: TrainingQuestionType; label: string; help: string; required: boolean; options: string[]; correct: string[]; scaleMax: number }
export type TrainingForm = { kind: 'survey' | 'quiz'; title: string; description: string; passPercent: number; questions: TrainingQuestion[] }
export type TrainingAnswer = string | string[] | number
export type TrainingFormResponse = {
  program_id: string; lesson_id: string; user_id: string; answers: Record<string, TrainingAnswer>
  score: number | null; passed: boolean | null; submitted_at: string; respondent?: string
}
export type TrainingLesson = { id: string; title: string; content: string; resourceUrl: string; durationMinutes: number; form?: TrainingForm | null }
export type TrainingModule = { id: string; title: string; lessons: TrainingLesson[] }
export type TrainingProgram = {
  id: string; title: string; description: string; status: 'draft' | 'published'; audience_roles: TrainingAudienceRole[]
  assigned_emails: string[]; modules: TrainingModule[]; created_at: string; updated_at: string
  completed_lesson_ids?: string[]; progress_percent?: number; form_responses?: TrainingFormResponse[]
}

export const questionTypes: { value: TrainingQuestionType; label: string }[] = [
  { value: 'short_text', label: 'Short answer' }, { value: 'long_text', label: 'Paragraph' },
  { value: 'single_choice', label: 'Multiple choice' }, { value: 'multi_choice', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' }, { value: 'yes_no', label: 'Yes / No' }, { value: 'rating', label: 'Rating scale' },
]
export const choiceTypes: TrainingQuestionType[] = ['single_choice', 'multi_choice', 'dropdown']
export const yesNo = ['Yes', 'No']

export function questionOptions(question: TrainingQuestion) {
  return question.type === 'yes_no' ? yesNo : choiceTypes.includes(question.type) ? question.options : []
}
export const isGradable = (question: TrainingQuestion) => questionOptions(question).length > 0 && question.correct.length > 0
export const hasForm = (lesson: TrainingLesson) => Boolean(lesson.form?.questions.length)

export function getTrainingDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function cleanTrainingText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function cleanTrainingForm(value: unknown): TrainingForm | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const types = questionTypes.map((type) => type.value)
  const questions = Array.isArray(raw.questions) ? raw.questions.slice(0, 100).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const q = item as Record<string, unknown>
    const label = cleanTrainingText(q.label, 500)
    const type = types.includes(q.type as TrainingQuestionType) ? q.type as TrainingQuestionType : 'short_text'
    if (!label) return []
    const options = choiceTypes.includes(type) && Array.isArray(q.options)
      ? Array.from(new Set(q.options.map((option) => cleanTrainingText(option, 200)).filter(Boolean))).slice(0, 30) : []
    if (choiceTypes.includes(type) && options.length < 2) return []
    const valid = type === 'yes_no' ? yesNo : options
    const correct = Array.isArray(q.correct) ? Array.from(new Set(q.correct.filter((c): c is string => typeof c === 'string' && valid.includes(c)))) : []
    return [{
      id: cleanTrainingText(q.id, 80) || `question-${index + 1}`, type, label, help: cleanTrainingText(q.help, 1000), required: q.required === true,
      options, correct: type === 'multi_choice' ? correct : correct.slice(0, 1), scaleMax: Number(q.scaleMax) === 10 ? 10 : 5,
    } satisfies TrainingQuestion]
  }) : []
  if (!questions.length) return null
  return {
    kind: raw.kind === 'quiz' ? 'quiz' : 'survey', title: cleanTrainingText(raw.title, 160), description: cleanTrainingText(raw.description, 3000),
    passPercent: Math.max(0, Math.min(100, Math.trunc(Number(raw.passPercent) || 0))), questions,
  }
}

// Validates a learner's answers against the form and grades quizzes.
export function gradeTrainingResponse(form: TrainingForm, value: unknown): { answers: Record<string, TrainingAnswer>; score: number | null; passed: boolean | null } | { error: string } {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const answers: Record<string, TrainingAnswer> = {}
  for (const question of form.questions) {
    const input = raw[question.id]; const options = questionOptions(question); let answer: TrainingAnswer | null = null
    if (question.type === 'rating') {
      const n = Math.trunc(Number(input)); if (n >= 1 && n <= question.scaleMax) answer = n
    } else if (question.type === 'multi_choice') {
      const picked = Array.isArray(input) ? Array.from(new Set(input.filter((v): v is string => typeof v === 'string' && options.includes(v)))) : []
      if (picked.length) answer = picked
    } else if (options.length) {
      if (typeof input === 'string' && options.includes(input)) answer = input
    } else {
      const text = cleanTrainingText(input, question.type === 'long_text' ? 10000 : 1000); if (text) answer = text
    }
    if (answer === null) { if (question.required) return { error: `Please answer “${question.label}”.` }; continue }
    answers[question.id] = answer
  }
  if (form.kind !== 'quiz') return { answers, score: null, passed: null }
  const graded = form.questions.filter(isGradable)
  if (!graded.length) return { answers, score: null, passed: true }
  const right = graded.filter((question) => {
    const given = answers[question.id]; const picked = Array.isArray(given) ? given : given === undefined ? [] : [String(given)]
    return picked.length === question.correct.length && picked.every((option) => question.correct.includes(option))
  }).length
  const score = Math.round(right / graded.length * 100)
  return { answers, score, passed: score >= form.passPercent }
}
