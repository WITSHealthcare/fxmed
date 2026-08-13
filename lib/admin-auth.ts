import type { User } from '@supabase/supabase-js'

export type AdminRole = 'admin' | 'clinical' | 'sales'
export type AdminTab = 'blog' | 'crm' | 'seo' | 'messages' | 'requests' | 'ambassador' | 'tools' | 'users' | 'zara' | 'contacts' | 'healthcare'
export type CrmAccess = 'clinical' | 'financial'

export const adminRoleLabels: Record<AdminRole, string> = {
  admin: 'Admin',
  clinical: 'Clinical Team Member',
  sales: 'Sales Rep',
}

export const adminRolePermissions: Record<AdminRole, { tabs: AdminTab[]; crmViews: CrmAccess[] }> = {
  admin: {
    tabs: ['blog', 'crm', 'seo', 'messages', 'requests', 'ambassador', 'tools', 'users', 'zara', 'contacts', 'healthcare'],
    crmViews: ['clinical', 'financial'],
  },
  clinical: {
    tabs: ['blog', 'crm', 'requests', 'tools', 'contacts', 'healthcare'],
    crmViews: ['clinical'],
  },
  sales: {
    tabs: ['crm', 'seo', 'messages', 'requests', 'tools', 'contacts'],
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
  const role = appMetadata?.role || userMetadata?.role

  if (role === 'admin' || appMetadata?.is_admin === true || userMetadata?.is_admin === true) return 'admin'
  if (role === 'clinical') return 'clinical'
  if (role === 'sales') return 'sales'
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
