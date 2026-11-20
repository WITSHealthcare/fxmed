import type { AdminRole } from '@/lib/admin-auth'

// What each dashboard role may see and do in the EMR. Shared by the server
// routes, which enforce it, and the EMR screens, which hide what a role
// cannot use.

export type EmrPermission =
  | 'view_patients' | 'create_patients' | 'edit_patients'
  | 'view_clinical_records' | 'create_encounters' | 'edit_encounters' | 'finalize_encounters'
  | 'create_notes' | 'finalize_notes' | 'record_vitals' | 'manage_diagnoses'
  | 'manage_allergies' | 'prescribe_medication' | 'order_investigations'
  | 'record_results' | 'review_results' | 'upload_documents' | 'manage_care_plans'
  | 'view_financial_records' | 'manage_financial_records'
  | 'manage_coverage' | 'manage_referrals'
  | 'view_follow_ups'

const clinicalPermissions: EmrPermission[] = [
  'view_patients', 'create_patients', 'edit_patients', 'view_clinical_records',
  'create_encounters', 'edit_encounters', 'finalize_encounters', 'create_notes',
  'finalize_notes', 'record_vitals', 'manage_diagnoses', 'manage_allergies',
  'prescribe_medication', 'order_investigations', 'record_results',
  'review_results', 'upload_documents', 'manage_care_plans',
  'view_financial_records', 'manage_financial_records',
  'manage_coverage', 'manage_referrals', 'view_follow_ups',
]

// Sales: patients' contact details, appointments, outreaches and follow-ups
// to read, and patients' finances to manage. No clinical records, and nothing
// else can be changed. Scheduling appointments comes with the Requests tab.
const salesPermissions: EmrPermission[] = [
  'view_patients', 'view_follow_ups', 'view_financial_records', 'manage_financial_records',
]

// Nurses: register and update patients, take vitals, write and sign nursing
// notes, record allergies, upload documents and work follow-ups. No
// prescribing, diagnoses, orders, results review or billing.
const nursePermissions: EmrPermission[] = [
  'view_patients', 'create_patients', 'edit_patients', 'view_clinical_records',
  'create_encounters', 'create_notes', 'finalize_notes', 'record_vitals',
  'manage_allergies', 'upload_documents', 'view_follow_ups',
]

// Lab scientists: read the chart for context, enter results and attach
// reports. Reviewing results stays with the doctor.
const labPermissions: EmrPermission[] = [
  'view_patients', 'view_clinical_records', 'record_results', 'upload_documents',
]

// Front desk: registration, demographics, insurance cover, billing and
// follow-up calls. No clinical records.
const frontDeskPermissions: EmrPermission[] = [
  'view_patients', 'create_patients', 'edit_patients', 'view_follow_ups',
  'view_financial_records', 'manage_financial_records', 'manage_coverage',
]

export const emrRolePermissions: Record<AdminRole, EmrPermission[]> = {
  admin: clinicalPermissions,
  clinical: clinicalPermissions,
  doctor: clinicalPermissions,
  nurse: nursePermissions,
  lab: labPermissions,
  front_desk: frontDeskPermissions,
  sales: salesPermissions,
}

export function hasEmrPermission(role: AdminRole | null | undefined, permission: EmrPermission) {
  return Boolean(role && emrRolePermissions[role].includes(permission))
}

/** Patient columns for staff without clinical access: contact details, no health fields. */
export const NON_CLINICAL_PATIENT_COLUMNS = 'id,mrn,first_name,middle_name,last_name,date_of_birth,sex,phone,email,address,city,state,country,occupation,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,status,created_at,updated_at'
