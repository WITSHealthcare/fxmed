import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { getRequestUser } from '@/lib/ambassador-portal'
import { getEmrDatabase } from '@/lib/emr'

export const portalSections = ['overview', 'care_plan', 'documents', 'messages'] as const
export type PortalSection = typeof portalSections[number]

export const portalDocumentTypes = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const PORTAL_MAX_UPLOAD_BYTES = 15 * 1024 * 1024

// The patient-facing columns of an EMR record. Internal fields such as CRM
// links and who created the record are never sent to the portal.
export const portalPatientColumns = 'id,mrn,first_name,middle_name,last_name,date_of_birth,sex,phone,email,address,city,state'
export const portalDocumentColumns = 'id,title,category,original_name,mime_type,file_size,notes,source,portal_status,shared_at,created_at'

/**
 * The signed-in patient, their EMR record and their portal account. Returns
 * null for anyone who is not a linked, non-suspended portal patient.
 */
export async function getRequestPatient(request: NextRequest) {
  const user = await getRequestUser(request)
  const database = getEmrDatabase()
  if (!user || !database) return null

  const { data: account, error } = await database
    .from('patient_portal_accounts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !account || account.status === 'suspended') return null
  return { user, account, database, patientId: account.patient_id as string }
}

export async function notifyPatient(database: SupabaseClient, patientId: string, notification: {
  kind: 'message' | 'document' | 'care_plan'
  title: string
  detail?: string | null
  section: PortalSection
}) {
  const { error } = await database.from('patient_portal_notifications').insert({
    patient_id: patientId,
    kind: notification.kind,
    title: notification.title.slice(0, 240),
    detail: notification.detail ? notification.detail.slice(0, 600) : null,
    section: notification.section,
  })
  // A missed notification must never fail the clinical action that raised it.
  if (error) console.error('Failed to write patient portal notification:', error.message)
}

export function portalErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (message.includes('patient_portal') && (message.includes('Could not find the table') || message.includes('schema cache'))) {
    return 'The patient portal database migration has not been applied yet.'
  }
  return message || 'The patient portal request could not be completed.'
}
