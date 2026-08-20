import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole, type AdminRole } from '@/lib/admin-auth'

export type EmrPermission =
  | 'view_patients' | 'create_patients' | 'edit_patients'
  | 'view_clinical_records' | 'create_encounters' | 'edit_encounters' | 'finalize_encounters'
  | 'create_notes' | 'finalize_notes' | 'record_vitals' | 'manage_diagnoses'
  | 'manage_allergies' | 'prescribe_medication' | 'order_investigations'
  | 'record_results' | 'review_results' | 'upload_documents' | 'manage_care_plans'
  | 'view_financial_records' | 'manage_financial_records'

const clinicalPermissions: EmrPermission[] = [
  'view_patients', 'create_patients', 'edit_patients', 'view_clinical_records',
  'create_encounters', 'edit_encounters', 'finalize_encounters', 'create_notes',
  'finalize_notes', 'record_vitals', 'manage_diagnoses', 'manage_allergies',
  'prescribe_medication', 'order_investigations', 'record_results',
  'review_results', 'upload_documents', 'manage_care_plans',
  'view_financial_records', 'manage_financial_records',
]

export const emrRolePermissions: Record<AdminRole, EmrPermission[]> = {
  admin: clinicalPermissions,
  clinical: clinicalPermissions,
  sales: [],
}

export function getEmrDatabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null
}

export async function getEmrContext(request: NextRequest, permission: EmrPermission) {
  const user = await getRequestAdminUser(request)
  const role = getUserAdminRole(user)
  const database = getEmrDatabase()
  if (!user || !role || !database || !emrRolePermissions[role].includes(permission)) {
    if (user && database) await writeEmrAudit(database, user, { action: 'access_denied', entityType: 'emr_permission', metadata: { permission, path: request.nextUrl.pathname } })
    return null
  }
  return { user, role, database }
}

export async function writeEmrAudit(database: SupabaseClient, user: User, details: {
  action: string
  entityType: string
  entityId?: string | null
  patientId?: string | null
  metadata?: Record<string, unknown>
}) {
  const { error } = await database.from('emr_audit_logs').insert({
    user_id: user.id,
    user_email: user.email || null,
    action: details.action,
    entity_type: details.entityType,
    entity_id: details.entityId || null,
    patient_id: details.patientId || null,
    metadata: details.metadata || {},
  })
  if (error) console.error('Failed to write EMR audit log:', error.message)
}

export function cleanText(value: unknown, max = 4000): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().slice(0, max)
  return clean || null
}

export function cleanDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null
  return value.slice(0, 10)
}

export function cleanNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function calculateBmi(weight: unknown, height: unknown) {
  const kg = cleanNumber(weight)
  const cm = cleanNumber(height)
  return kg && cm ? Number((kg / ((cm / 100) ** 2)).toFixed(2)) : null
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function ageFromDob(value?: string | null) {
  if (!value) return null
  const dob = new Date(`${value}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--
  return age
}

export function emrErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (message.includes('Could not find the table') || message.includes('schema cache')) return 'The EMR database migration has not been applied yet.'
  return message || 'The clinical request could not be completed.'
}
