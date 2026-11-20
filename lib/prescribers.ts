import type { SupabaseClient } from '@supabase/supabase-js'

// Who signed a prescription, for printing: name, job title and professional
// registration (MDCN for doctors, PCN for pharmacists, NMCN for nurses and
// midwives), taken from the staff member's HR file. Expired, suspended or
// superseded registrations, and ones not yet verified, are left off.
export type Prescriber = { name: string; title: string | null; registrations: Array<{ body: string; number: string }> }

const registrationBodies: Record<string, string> = { MDCN: 'MDCN', PCN: 'PCN', NMCN_RN: 'NMCN (RN)', NMCN_RM: 'NMCN (RM)', dietitians_council: 'Dietitians Council' }

export async function loadPrescribers(database: SupabaseClient, userIds: string[]): Promise<Record<string, Prescriber>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)))
  if (!ids.length) return {}
  const { data: employees, error } = await database.from('hr_employees').select('id,auth_user_id,legal_name,preferred_name,job_title').in('auth_user_id', ids)
  if (error) { console.error('Prescribers: HR lookup failed:', error); return {} }
  const { data: credentials } = employees?.length
    ? await database.from('hr_credentials').select('employee_id,credential_type,registration_number,licence_number,status').in('employee_id', employees.map((item) => item.id)).in('credential_type', Object.keys(registrationBodies))
    : { data: [] as Array<{ employee_id: string; credential_type: string; registration_number: string | null; licence_number: string | null; status: string }> }
  const result: Record<string, Prescriber> = {}
  for (const employee of employees || []) {
    result[employee.auth_user_id] = {
      name: employee.legal_name,
      title: employee.job_title,
      registrations: (credentials || [])
        .filter((item) => item.employee_id === employee.id && (item.registration_number || item.licence_number) && ['current', 'expiring_soon'].includes(item.status))
        .map((item) => ({ body: registrationBodies[item.credential_type], number: (item.registration_number || item.licence_number) as string })),
    }
  }
  // Staff without an HR file still get their sign-in name or email.
  for (const id of ids.filter((item) => !result[item])) {
    const { data } = await database.auth.admin.getUserById(id)
    const user = data?.user
    if (user) result[id] = { name: (user.user_metadata?.full_name as string) || user.email || 'FXMed clinician', title: null, registrations: [] }
  }
  return result
}
