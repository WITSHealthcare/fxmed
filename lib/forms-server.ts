import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getUserAdminRole, type AdminRole } from './admin-auth'
import { cleanFormDefinition, cleanFormText } from './forms'
import type { FormAudience, FormRecord } from './forms-types'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const staffRoles: AdminRole[] = ['admin', 'clinical', 'sales']

export function cleanEmails(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((email) => cleanFormText(email, 254).toLowerCase()).filter((email) => emailPattern.test(email)))).slice(0, 1000)
    : []
}

export function slugify(title: string) {
  const base = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'form'
  return `${base.length < 3 ? `${base}-form` : base}-${Math.random().toString(36).slice(2, 7)}`
}

// Validates an admin's create/update request. Returns an error message or the row to write.
export function cleanFormPayload(body: Record<string, unknown>) {
  const title = cleanFormText(body.title, 160)
  if (!title) return 'Give the form a title.'
  const audience: FormAudience | null = body.audience === 'customers' || body.audience === 'staff' || body.audience === 'patients' ? body.audience : null
  if (!audience) return 'Choose who the form is for.'
  const definition = cleanFormDefinition({ ...(body.definition as object || {}), title: '', description: '' })
  if (!definition) return 'Add at least one question with a label (and two options for choice questions).'
  const status = body.status === 'published' || body.status === 'closed' ? body.status : 'draft'
  const collect = body.collect_contact === 'none' || body.collect_contact === 'required' ? body.collect_contact : 'optional'
  return {
    title, description: cleanFormText(body.description, 3000), audience, status, definition,
    collect_contact: audience === 'customers' ? collect : 'none',
    one_response_per_person: audience === 'customers' ? false : body.one_response_per_person !== false,
    audience_roles: audience === 'staff' && Array.isArray(body.audience_roles) ? Array.from(new Set(body.audience_roles.filter((role): role is AdminRole => staffRoles.includes(role as AdminRole)))) : [],
    assigned_emails: audience === 'customers' ? [] : cleanEmails(body.assigned_emails),
    confirmation_message: cleanFormText(body.confirmation_message, 1000),
  }
}

// Staff forms with no roles and no emails are open to every dashboard user.
export function staffCanFill(form: Pick<FormRecord, 'audience' | 'status' | 'audience_roles' | 'assigned_emails'>, user: User | null) {
  const role = getUserAdminRole(user)
  if (!user || !role || form.audience !== 'staff' || form.status !== 'published') return false
  const email = user.email?.toLowerCase() || ''
  if (!form.audience_roles.length && !form.assigned_emails.length) return true
  return form.audience_roles.includes(role) || form.assigned_emails.includes(email)
}

// Patient forms with no emails are open to every portal patient.
export function patientCanFill(form: Pick<FormRecord, 'audience' | 'status' | 'assigned_emails'>, patientEmail: string | null) {
  if (form.audience !== 'patients' || form.status !== 'published') return false
  return !form.assigned_emails.length || (!!patientEmail && form.assigned_emails.includes(patientEmail.toLowerCase()))
}

export async function getPatientEmail(database: SupabaseClient, patientId: string, user: User) {
  const { data } = await database.from('emr_patients').select('email').eq('id', patientId).maybeSingle()
  return (data?.email || user.email || '').toLowerCase() || null
}

// The questions and settings a respondent needs; never the admin-only fields.
export function publicForm(form: FormRecord) {
  const { id, slug, title, description, audience, status, definition, collect_contact, one_response_per_person, confirmation_message } = form
  return { id, slug, title, description, audience, status, definition, collect_contact, one_response_per_person, confirmation_message }
}

export function formsErrorMessage(error: unknown, fallback: string) {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
  return message.includes('form') && (message.includes('Could not find the table') || message.includes('schema cache'))
    ? 'The forms database migration (043) has not been applied yet.' : fallback
}
