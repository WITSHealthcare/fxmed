import type { AdminRole } from './admin-auth'
import type { FormAnswers, FormDefinition } from './forms'

export type FormAudience = 'customers' | 'staff' | 'patients'
export type FormStatus = 'draft' | 'published' | 'closed'

export type FormRecord = {
  id: string; slug: string; title: string; description: string; audience: FormAudience; status: FormStatus
  definition: FormDefinition; collect_contact: 'none' | 'optional' | 'required'; one_response_per_person: boolean
  // Customer forms only: each response joins the EMR Outreaches list (migration 044).
  outreach: boolean
  audience_roles: AdminRole[]; assigned_emails: string[]; confirmation_message: string
  created_at: string; updated_at: string; response_count?: number
}

// What a respondent receives from /api/forms/<slug>.
export type PublicFormRecord = Pick<FormRecord, 'id' | 'slug' | 'title' | 'description' | 'audience' | 'status' | 'definition' | 'collect_contact' | 'one_response_per_person' | 'confirmation_message'>

export type StoredFormResponse = {
  id: string; form_id: string; respondent_type: 'public' | 'staff' | 'patient'; user_id: string | null; patient_id: string | null
  contact_name: string | null; contact_email: string | null; contact_phone: string | null
  answers: FormAnswers; score: number | null; passed: boolean | null; submitted_at: string; respondent?: string
}

export const audienceLabels: Record<FormAudience, { label: string; detail: string }> = {
  customers: { label: 'Customers', detail: 'Anyone with the link. Optionally asks for name, email and phone, which are added to Contacts.' },
  staff: { label: 'Employees', detail: 'Dashboard staff, by role or email. Filled in under Forms in the admin portal.' },
  patients: { label: 'Patients', detail: 'Patient portal users, all or by email. Filled in under Forms in the patient portal.' },
}
