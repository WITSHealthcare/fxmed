import { createClient } from '@supabase/supabase-js'
import type { AdminRole } from './admin-auth'

export type TrainingAudienceRole = Exclude<AdminRole, 'admin'>
export type TrainingLesson = { id: string; title: string; content: string; resourceUrl: string; durationMinutes: number }
export type TrainingModule = { id: string; title: string; lessons: TrainingLesson[] }
export type TrainingProgram = {
  id: string; title: string; description: string; status: 'draft' | 'published'; audience_roles: TrainingAudienceRole[]
  assigned_emails: string[]; modules: TrainingModule[]; created_at: string; updated_at: string
  completed_lesson_ids?: string[]; progress_percent?: number
}

export function getTrainingDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function cleanTrainingText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
