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
export type TrainingProgram = {
  id: string; title: string; description: string; status: 'draft' | 'published'; audience_roles: TrainingAudienceRole[]
  assigned_emails: string[]; modules: TrainingModule[]; created_at: string; updated_at: string
  completed_lesson_ids?: string[]; progress_percent?: number; form_responses?: TrainingFormResponse[]
}

export const hasForm = (lesson: TrainingLesson) => Boolean(lesson.form?.questions.length)

export function getTrainingDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export const cleanTrainingText = cleanFormText
export const cleanTrainingForm = cleanFormDefinition
export const gradeTrainingResponse = gradeFormResponse
