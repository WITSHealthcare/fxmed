import { credentialReminderDays, type ChecklistItemStatus, type ChecklistOwner, type CredentialStatus, type CredentialType, type DocumentType, type HrEmployee, type HrRelation, type OnboardingCategory, type OnboardingStage, type Option } from './hr'

// People area (employee file, payroll identifiers, documents, credentials,
// onboarding, NDPA requests). Shared by /api/admin/hr/people/* and
// components/admin/hr/people. No server imports here.

const options = <T extends string>(pairs: [T, string][]): Option<T>[] => pairs.map(([value, label]) => ({ value, label }))

// Personal columns an employee may read on their own file (canHr 'employee_private' self).
export const hrEmployeeSelfColumns = 'personal_email,date_of_birth,gender,nin,address,emergency_contacts'
// Admin-only columns: HR notes, retention and legal hold.
export const hrEmployeeAdminColumns = 'photo_path,leaving_reason,legal_hold,retention_until,notes,created_by'

export type EmergencyContact = { name: string; relationship: string; phone: string; address?: string }
export type WorkPattern = 'office' | 'field' | 'virtual' | 'mixed'
export const workPatterns = options<WorkPattern>([['office', 'Office'], ['field', 'Field / home visits'], ['virtual', 'Virtual'], ['mixed', 'Mixed']])
export type HrEmployeeFile = HrEmployee & Partial<{
  personal_email: string | null; date_of_birth: string | null; gender: string | null; nin: string | null; address: string | null; emergency_contacts: EmergencyContact[]; work_pattern: WorkPattern | null
  photo_path: string | null; leaving_reason: string | null; legal_hold: boolean; retention_until: string | null; notes: string; created_by: string | null
}>

export type HrPayrollProfile = {
  employee_id: string; bank_name: string | null; account_number: string | null; account_name: string | null; bvn: string | null; tin: string | null; paye_state: string | null
  pfa_name: string | null; rsa_pin: string | null; nhf_number: string | null; pension_employee_rate: number; pension_employer_rate: number
  group_life_enrolled_at: string | null; hmo_enrolled_at: string | null; updated_by: string | null; updated_at: string
}

export type DocumentStatus = 'requested' | 'uploaded' | 'verified' | 'rejected' | 'expired' | 'deleted'
export const documentStatuses = options<DocumentStatus>([['requested', 'Requested'], ['uploaded', 'Uploaded'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['expired', 'Expired'], ['deleted', 'Deleted']])
export type HrDocument = {
  id: string; employee_id: string | null; application_id: string | null; document_type: DocumentType; title: string; storage_path: string; mime_type: string | null; size_bytes: number | null
  is_restricted: boolean; original_seen_at: string | null; original_seen_by: string | null; verified_at: string | null; verified_by: string | null; verification_method: string | null
  status: DocumentStatus; retention_until: string | null; deleted_at: string | null; uploaded_by: string | null; created_at: string; updated_at: string
}
// Columns that never expose the storage path to the browser.
export const hrDocumentColumns = 'id,employee_id,application_id,document_type,title,mime_type,size_bytes,is_restricted,original_seen_at,verified_at,verification_method,status,retention_until,deleted_at,uploaded_by,created_at,updated_at'
export const hrDocumentMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export const hrDocumentMaxBytes = 15 * 1024 * 1024

export type HrCredential = {
  id: string; employee_id: string | null; application_id: string | null; credential_type: CredentialType; issuing_body: string | null; registration_number: string | null; licence_number: string | null
  issued_on: string | null; expires_on: string | null; cpd_points_required: number | null; verification_method: string | null; verified_by: string | null; verified_at: string | null
  document_id: string | null; status: CredentialStatus; supersedes_id: string | null; reminder_90_sent_at: string | null; reminder_60_sent_at: string | null; reminder_30_sent_at: string | null; reminder_7_sent_at: string | null
  notes: string; created_at: string; updated_at: string
}
// What the API adds when it loads credentials (computed against today's Lagos date).
export type HrCredentialView = HrCredential & { days_to_expiry: number | null; reminder_due: number | null; renewal_pending: boolean; employee_name?: string }
export const credentialVerificationMethods = ['Council portal', 'Phone call to council', 'Letter from council', 'Insurer confirmation', 'Original seen', 'Other']

const dayMs = 86_400_000
export function dayDiff(from: string, to: string) { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs) }
export function addDays(day: string, days: number) { return new Date(Date.parse(`${day}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10) }

// Verified credentials move between current / expiring_soon (90 days or less) /
// expired by date. Pending, suspended, failed and superseded rows keep their status.
export const verifiedCredentialStatuses: CredentialStatus[] = ['current', 'expiring_soon', 'expired']
export function credentialStatusOn(credential: Pick<HrCredential, 'status' | 'expires_on'>, today: string): CredentialStatus {
  if (!verifiedCredentialStatuses.includes(credential.status)) return credential.status
  if (!credential.expires_on) return 'current'
  const days = dayDiff(today, credential.expires_on)
  return days < 0 ? 'expired' : days <= credentialReminderDays[0] ? 'expiring_soon' : 'current'
}
// The tightest reminder threshold (90/60/30/7) reached and not yet raised.
export function credentialReminderDue(credential: HrCredential, today: string): number | null {
  if (!credential.expires_on || !verifiedCredentialStatuses.includes(credential.status)) return null
  const days = dayDiff(today, credential.expires_on); if (days < 0) return null
  const reached = credentialReminderDays.filter((threshold) => days <= threshold)
  const tightest = reached[reached.length - 1]
  return tightest !== undefined && !credential[`reminder_${tightest}_sent_at`] ? tightest : null
}
export const credentialStatusTone: Record<CredentialStatus, string> = {
  current: 'bg-green-50 text-green-700', expiring_soon: 'bg-amber-50 text-amber-700', expired: 'bg-red-50 text-red-700', pending_verification: 'bg-blue-50 text-blue-700',
  suspended: 'bg-red-50 text-red-700', failed: 'bg-red-50 text-red-700', superseded: 'bg-gray-100 text-gray-500',
}

export type ChecklistTemplateItem = { stage: OnboardingStage; category: OnboardingCategory; item: string; owner: ChecklistOwner; due_offset_days: number }
export type HrChecklistTemplate = { id: string; kind: 'onboarding' | 'offboarding'; title: string; departments: string[]; employment_types: string[]; items: ChecklistTemplateItem[]; active: boolean; created_at: string; updated_at: string }
export type HrOnboardingItem = {
  id: string; employee_id: string; stage: OnboardingStage; category: OnboardingCategory; item: string; owner: ChecklistOwner; owner_user_id: string | null; due_date: string | null
  status: ChecklistItemStatus; completed_at: string | null; completed_by: string | null; evidence_document_id: string | null; exception_reason: string | null
  exception_approved_by: string | null; exception_approved_at: string | null; sort_order: number; created_at: string; updated_at: string
}
// The owner a non-admin may tick for each relation; admin ticks everything.
export const onboardingOwnerFor: Partial<Record<HrRelation, ChecklistOwner>> = { self: 'employee', report: 'manager' }

// The standard checklist from docs/hr/onboarding.md. Offsets are days from the start date.
export const standardOnboardingItems: ChecklistTemplateItem[] = [
  ['pre_start', 'contract', 'Offer letter signed and returned; start date agreed', 'hr', -14],
  ['pre_start', 'contract', 'Contract of employment (or service agreement for locums/contractors) issued from the template', 'hr', -10],
  ['pre_start', 'contract', 'Confidentiality and data-protection undertaking signed', 'employee', -5],
  ['pre_start', 'documents', 'Government photo ID uploaded; NIN recorded', 'employee', -10],
  ['pre_start', 'documents', 'Passport photograph uploaded', 'employee', -10],
  ['pre_start', 'documents', 'CV and certificates uploaded; originals seen and stamped', 'hr', -7],
  ['pre_start', 'documents', 'NYSC discharge or exemption certificate (graduates)', 'employee', -7],
  ['pre_start', 'documents', 'Proof of address (last 3 months)', 'employee', -7],
  ['pre_start', 'documents', 'Next of kin and two emergency contacts given', 'employee', -7],
  ['pre_start', 'licence', 'Practising licence verified with the council; number and expiry recorded (clinical)', 'hr', -5],
  ['pre_start', 'licence', 'Professional indemnity certificate filed (clinical)', 'hr', -5],
  ['pre_start', 'checks', 'Two references taken and recorded', 'hr', -7],
  ['pre_start', 'checks', 'Medical fitness questionnaire and Hepatitis B status (clinical and home-visit staff)', 'employee', -5],
  ['pre_start', 'checks', 'Guarantor form and guarantor call (cash, stock, equipment, home-visit roles)', 'hr', -3],
  ['pre_start', 'checks', 'Police character check with consent (children, home visits, controlled stock)', 'hr', -3],
  ['pre_start', 'statutory', 'Bank details, TIN, PFA and RSA PIN, NHF number collected', 'employee', -7],
  ['pre_start', 'statutory', 'Added to pension, PAYE, NHF, group life and NSITF schedules', 'hr', -1],
  ['pre_start', 'it_accounts', 'Work email and portal account created with the right role (no earlier than 3 working days before start)', 'it', -3],
  ['pre_start', 'it_accounts', 'Portal role confirmed in writing by the supervisor', 'manager', -3],
  ['pre_start', 'training', 'FXMed Foundations and the role track assigned in the Training tab', 'hr', -1],
  ['pre_start', 'equipment', 'Laptop/phone/home-visit kit and ID card prepared and on the equipment form', 'it', -1],
  ['day_one', 'contract', 'Contract signed; every pre-start document on file', 'hr', 0],
  ['day_one', 'it_accounts', 'First portal login, 2-step verification, correct tabs showing', 'it', 0],
  ['day_one', 'other', 'Buddy and supervisor met', 'manager', 0],
  ['day_one', 'other', 'Health and safety briefing: emergency contacts, home-visit safety, incident reporting', 'manager', 0],
  ['day_one', 'training', 'Foundations Module 1.1 started and day-one survey completed', 'employee', 0],
  ['week_one', 'training', 'Foundations programme 100% in the Training tab', 'employee', 4],
  ['week_one', 'other', 'Staff handbook read and acknowledged', 'employee', 4],
  ['week_one', 'statutory', 'Payroll, pension, PAYE and NHF details with the accountant before cut-off', 'hr', 4],
  ['week_one', 'other', 'End of week-one check-in held and recorded', 'manager', 4],
  ['probation', 'other', 'Day-30 check-in recorded', 'manager', 30],
  ['probation', 'other', 'Day-60 check-in recorded (written improvement plan if not on track)', 'manager', 60],
  ['probation', 'other', 'Day-90 probation decision and outcome letter', 'hr', 90],
].map(([stage, category, item, owner, due]) => ({ stage, category, item, owner, due_offset_days: due }) as ChecklistTemplateItem)

export type DataRequestType = 'access' | 'rectification' | 'erasure' | 'withdraw_consent' | 'objection' | 'reference' | 'breach'
export const dataRequestTypes = options<DataRequestType>([['access', 'Copy of file (access)'], ['rectification', 'Correction'], ['erasure', 'Erasure'], ['withdraw_consent', 'Withdraw consent'], ['objection', 'Objection'], ['reference', 'Reference request'], ['breach', 'Breach report']])
export type DataRequestStatus = 'received' | 'in_progress' | 'completed' | 'refused_with_reason'
export const dataRequestStatuses = options<DataRequestStatus>([['received', 'Received'], ['in_progress', 'In progress'], ['completed', 'Completed'], ['refused_with_reason', 'Refused with reason']])
// Working default until counsel confirms the NDPA response deadline (employee-records.md section 5).
export const dataRequestDueDays = 30
export type HrDataRequest = {
  id: string; candidate_id: string | null; employee_id: string | null; subject_name: string; request_type: DataRequestType; received_at: string; due_at: string | null; handled_by: string | null
  status: DataRequestStatus; outcome: string | null; completed_at: string | null; ndpc_notified_at: string | null; notes: string; created_at: string; updated_at: string
}
export type HrRetentionLogEntry = { id: number; run_at: string; entity_type: string; record_id: string; action: 'deleted' | 'anonymised' | 'moved_to_employee_file'; retention_rule: string; performed_by: string | null; reviewed_by: string | null; reviewed_at: string | null }

export type PortalAccount = { id: string; email: string; role: string; linked_employee_id: string | null }
