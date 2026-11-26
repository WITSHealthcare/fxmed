import { adminRolePermissions, type AdminRole, type AdminTab } from '@/lib/admin-auth'

// Where each admin area lives. The sidebar, the role gate, the page header and
// the redirect for old /admin?tab=<id> links all read from this one list.
export type AdminGroupId = 'inbox' | 'clinical' | 'growth' | 'people' | 'settings'

export const adminGroups: Array<{ id: AdminGroupId; label: string }> = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'growth', label: 'Growth' },
  { id: 'people', label: 'People' },
  { id: 'settings', label: 'Settings' },
]

export type AdminRoute = {
  tab: AdminTab
  group: AdminGroupId
  path: string
  label: string
  title: string
  description: string
}

export const adminRoutes: AdminRoute[] = [
  { tab: 'messages', group: 'inbox', path: '/admin/inbox/messages', label: 'Messages', title: 'Messages', description: 'Messages from patients and visitors' },
  { tab: 'requests', group: 'inbox', path: '/admin/inbox/requests', label: 'Bookings & requests', title: 'Bookings & requests', description: 'Appointment bookings, festive offers and consultation requests' },
  { tab: 'zara', group: 'inbox', path: '/admin/inbox/zara', label: 'Zara conversations', title: 'Zara conversations', description: 'Every conversation people have had with Zara, the AI assistant' },

  { tab: 'healthcare', group: 'clinical', path: '/admin/clinical', label: 'Clinical workspace', title: 'Clinical workspace', description: 'Patients, appointments, encounters, records, investigations, medications and care plans' },
  { tab: 'fm_analysis', group: 'clinical', path: '/admin/clinical/lab-analysis', label: 'Health analysis: labs', title: 'Functional Health Analysis: lab report', description: 'Read lab results against FXMed optimal ranges and issue the Functional Health Analysis lab report' },

  { tab: 'crm', group: 'growth', path: '/admin/growth/crm', label: 'CRM', title: 'CRM', description: 'Leads, pipeline, follow-ups and revenue' },
  { tab: 'contacts', group: 'growth', path: '/admin/growth/contacts', label: 'Contacts', title: 'Contacts', description: 'Contact details from every form, booking, enquiry and outreach' },
  { tab: 'ambassador', group: 'growth', path: '/admin/growth/ambassadors', label: 'Ambassadors', title: 'Ambassador programme', description: 'Applications, ambassadors, referrals and payouts' },
  { tab: 'blog', group: 'growth', path: '/admin/growth/blog', label: 'Blog', title: 'Blog', description: 'Write, schedule and publish posts' },
  { tab: 'seo', group: 'growth', path: '/admin/growth/seo', label: 'SEO analytics', title: 'SEO analytics', description: 'Search performance and content opportunities' },
  { tab: 'forms', group: 'growth', path: '/admin/growth/forms', label: 'Forms & surveys', title: 'Forms & surveys', description: 'Build surveys and quizzes, share them and review responses' },

  { tab: 'hr', group: 'people', path: '/admin/people/hr', label: 'HR', title: 'HR', description: 'Recruiting, staff files, onboarding, performance, leave, pay and offboarding' },
  { tab: 'careers', group: 'people', path: '/admin/people/careers', label: 'Job openings', title: 'Job openings', description: 'The openings shown on the public careers page' },
  { tab: 'training', group: 'people', path: '/admin/people/training', label: 'Training', title: 'Staff training', description: 'Role-based courses, quizzes and progress tracking' },

  { tab: 'users', group: 'settings', path: '/admin/settings/users', label: 'Users & roles', title: 'Users & roles', description: 'Dashboard users and role-based access' },
  { tab: 'tools', group: 'settings', path: '/admin/settings/tools', label: 'Tools', title: 'Tools', description: 'Letterhead formatter, meal plan designer and document stamp' },
]

export const adminTabPath = Object.fromEntries(adminRoutes.map((route) => [route.tab, route.path])) as Record<AdminTab, string>

// The route a pathname belongs to: the longest matching path wins, so
// /admin/clinical/lab-analysis is not read as /admin/clinical.
export function findAdminRoute(pathname: string) {
  return adminRoutes
    .filter((route) => pathname === route.path || pathname.startsWith(`${route.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

export function routesForRole(role: AdminRole | null) {
  if (!role) return []
  const tabs = adminRolePermissions[role].tabs
  return adminRoutes.filter((route) => tabs.includes(route.tab))
}

// Where a role lands on /admin until there is a home page.
export function defaultAdminPath(role: AdminRole) {
  // Sales work starts in the CRM; everyone else in the clinical workspace.
  const preferred: AdminTab[] = role === 'sales' ? ['crm', 'messages'] : ['healthcare', 'crm', 'messages']
  const tabs = adminRolePermissions[role].tabs
  const tab = preferred.find((item) => tabs.includes(item)) || tabs[0]
  return adminTabPath[tab]
}

// Old links are /admin?tab=<id>&... (emails, notifications, shared course
// links). Returns the new URL with the other parameters kept, or null.
export function legacyAdminUrl(search: URLSearchParams) {
  const tab = search.get('tab') as AdminTab | null
  if (!tab || !(tab in adminTabPath)) return null
  const rest = new URLSearchParams(search)
  rest.delete('tab')
  const query = rest.toString()
  return `${adminTabPath[tab]}${query ? `?${query}` : ''}`
}
