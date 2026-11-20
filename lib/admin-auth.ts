import type { User } from '@supabase/supabase-js'

// 'clinical' is the original all-round clinician role; existing accounts keep
// it. New clinical staff get a narrower role for their job: doctor, nurse,
// lab scientist or front desk.
export type AdminRole = 'admin' | 'clinical' | 'doctor' | 'nurse' | 'lab' | 'front_desk' | 'sales'

export const adminRoles: AdminRole[] = ['admin', 'doctor', 'nurse', 'lab', 'front_desk', 'clinical', 'sales']

// Roles that count as clinical staff, so material shared with "Clinical"
// (training courses, staff forms) reaches doctors, nurses and lab staff too.
export const clinicalFamily: AdminRole[] = ['clinical', 'doctor', 'nurse', 'lab']

export function roleMatchesAudience(role: AdminRole | null, audienceRoles: string[]) {
  if (!role) return false
  return audienceRoles.includes(role) || (clinicalFamily.includes(role) && audienceRoles.includes('clinical'))
}
export type AdminTab = 'blog' | 'crm' | 'seo' | 'messages' | 'requests' | 'ambassador' | 'careers' | 'training' | 'tools' | 'users' | 'zara' | 'contacts' | 'healthcare' | 'fm_analysis' | 'hr' | 'forms'
export type CrmAccess = 'clinical' | 'financial'

export const adminRoleLabels: Record<AdminRole, string> = {
  admin: 'Admin',
  clinical: 'Clinical Team Member',
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab: 'Lab Scientist',
  front_desk: 'Front Desk',
  sales: 'Sales Rep',
}

// 'hr' is open to every role: admin manages all HR records including pay;
// clinical and sales get self-service (own file, onboarding, leave, goals and
// reviews), line-manager views of direct reports, and the scorecards they are
// assigned as interviewers. Record-level rules live in lib/hr.ts canHr.
export const adminRolePermissions: Record<AdminRole, { tabs: AdminTab[]; crmViews: CrmAccess[] }> = {
  admin: {
    tabs: ['blog', 'crm', 'seo', 'messages', 'requests', 'ambassador', 'careers', 'training', 'forms', 'hr', 'tools', 'users', 'zara', 'contacts', 'healthcare', 'fm_analysis'],
    crmViews: ['clinical', 'financial'],
  },
  clinical: {
    tabs: ['blog', 'crm', 'requests', 'training', 'forms', 'hr', 'tools', 'contacts', 'healthcare', 'fm_analysis'],
    crmViews: ['clinical'],
  },
  doctor: {
    tabs: ['blog', 'crm', 'requests', 'training', 'forms', 'hr', 'tools', 'contacts', 'healthcare', 'fm_analysis'],
    crmViews: ['clinical'],
  },
  nurse: {
    tabs: ['requests', 'training', 'forms', 'hr', 'tools', 'contacts', 'healthcare'],
    crmViews: [],
  },
  lab: {
    tabs: ['training', 'forms', 'hr', 'healthcare'],
    crmViews: [],
  },
  front_desk: {
    // Reception: registration, bookings, messages, billing and cover. No
    // clinical records (see lib/emr-permissions.ts).
    tabs: ['messages', 'requests', 'training', 'forms', 'hr', 'contacts', 'healthcare'],
    crmViews: [],
  },
  sales: {
    // Healthcare is limited for sales: see lib/emr-permissions.ts.
    tabs: ['crm', 'seo', 'messages', 'requests', 'training', 'forms', 'hr', 'tools', 'contacts', 'healthcare'],
    crmViews: ['financial'],
  },
}

export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function getUserAdminRole(user: User | null): AdminRole | null {
  if (!user) return null

  const appMetadata = user.app_metadata
  const userMetadata = user.user_metadata
  if (appMetadata?.dashboard_active === false) return null
  const email = user.email?.toLowerCase()
  // Anyone signed in can edit their own user_metadata, so it only counts for
  // older staff accounts. Portal accounts (patients, ambassadors, course
  // learners) carry account_type in app_metadata, which only the server can
  // set, and get a dashboard role only from app_metadata.
  const trustUserMetadata = !appMetadata?.account_type
  const role = appMetadata?.role || (trustUserMetadata ? userMetadata?.role : undefined)

  if (role === 'admin' || appMetadata?.is_admin === true || (trustUserMetadata && userMetadata?.is_admin === true)) return 'admin'
  if (typeof role === 'string' && role !== 'admin' && (adminRoles as string[]).includes(role)) return role as AdminRole
  if (email && getConfiguredAdminEmails().includes(email)) return 'admin'

  return null
}

export function isAdminUser(user: User | null) {
  return getUserAdminRole(user) === 'admin'
}

export function isDashboardUser(user: User | null) {
  return getUserAdminRole(user) !== null
}

export function canAccessTab(role: AdminRole | null, tab: AdminTab) {
  return role ? adminRolePermissions[role].tabs.includes(tab) : false
}

export function canAccessCrmView(role: AdminRole | null, crmView: CrmAccess) {
  return role ? adminRolePermissions[role].crmViews.includes(crmView) : false
}
