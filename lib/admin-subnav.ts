import type { AdminRole, AdminTab } from '@/lib/admin-auth'
import type { HrArea } from '@/lib/hr'
import { defaultEmrView, emrViewGroups, emrViewsForRole } from '@/lib/emr-views'

// Areas whose sections are listed in the sidebar instead of a row of tabs on
// the page. The open section is kept in the URL as ?<param>=<id>.
export type SubNav = {
  param: string
  defaultId: string
  groups: Array<{ label?: string; items: Array<{ id: string; label: string }> }>
}

const hrAreas: Array<{ id: HrArea; admin: string; staff: string }> = [
  { id: 'recruiting', admin: 'Recruiting', staff: 'My interviews' },
  { id: 'people', admin: 'Staff & onboarding', staff: 'My file & onboarding' },
  { id: 'performance', admin: 'Performance, leave & pay', staff: 'Performance & leave' },
]

export function defaultHrArea(role: AdminRole): HrArea {
  return role === 'admin' ? 'recruiting' : 'people'
}

export function subNavFor(tab: AdminTab, role: AdminRole): SubNav | null {
  if (tab === 'healthcare') {
    const allowed = emrViewsForRole(role).map((view) => view.id)
    return {
      param: 'view',
      defaultId: defaultEmrView(role),
      groups: emrViewGroups
        .map((group) => ({ label: group.label, items: group.views.filter((view) => allowed.includes(view.id)).map(({ id, label }) => ({ id, label })) }))
        .filter((group) => group.items.length),
    }
  }
  if (tab === 'hr') {
    // Staff mostly use their own file, so it comes first for them.
    const ordered = role === 'admin' ? hrAreas : [hrAreas[1], hrAreas[2], hrAreas[0]]
    return {
      param: 'area',
      defaultId: defaultHrArea(role),
      groups: [{ items: ordered.map((area) => ({ id: area.id, label: role === 'admin' ? area.admin : area.staff })) }],
    }
  }
  return null
}

export function openSubNavItem(subNav: SubNav, value: string | null) {
  const items = subNav.groups.flatMap((group) => group.items)
  return items.find((item) => item.id === value) || items.find((item) => item.id === subNav.defaultId)
}
