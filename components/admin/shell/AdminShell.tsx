'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AddressBookIcon,
  ArticleIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  CaretDownIcon,
  ChartLineUpIcon,
  ChatCircleDotsIcon,
  ClipboardTextIcon,
  FlaskIcon,
  GraduationCapIcon,
  HandshakeIcon,
  HospitalIcon,
  IdentificationCardIcon,
  ListIcon,
  RobotIcon,
  ShieldCheckIcon,
  SignOutIcon,
  ToolboxIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react'
import Notifications from '@/components/admin/Notifications'
import AdminAccountMenu from '@/components/admin/AdminAccountMenu'
import { FeedbackProvider, Spinner } from '@/components/admin/ui'
import { getTwoStepStatus } from '@/lib/two-step-client'
import { getCurrentAdminRole, signOut } from '@/lib/supabase-auth'
import { adminRoleLabels, canAccessTab, type AdminRole, type AdminTab } from '@/lib/admin-auth'
import { adminGroups, defaultAdminPath, findAdminRoute, routesForRole, type AdminGroupId } from '@/lib/admin-routes'
import { openSubNavItem, subNavFor } from '@/lib/admin-subnav'

const icons: Record<AdminTab, typeof ArticleIcon> = {
  messages: ChatCircleDotsIcon,
  requests: CalendarCheckIcon,
  zara: RobotIcon,
  healthcare: HospitalIcon,
  fm_analysis: FlaskIcon,
  crm: UsersThreeIcon,
  contacts: AddressBookIcon,
  ambassador: HandshakeIcon,
  blog: ArticleIcon,
  seo: ChartLineUpIcon,
  forms: ClipboardTextIcon,
  hr: IdentificationCardIcon,
  careers: BriefcaseIcon,
  training: GraduationCapIcon,
  users: ShieldCheckIcon,
  tools: ToolboxIcon,
}


const RoleContext = createContext<AdminRole | null>(null)

// The signed-in user's dashboard role. Only usable inside the admin shell,
// which renders nothing until the role is known.
export function useAdminRole(): AdminRole {
  const role = useContext(RoleContext)
  if (!role) throw new Error('useAdminRole must be used inside the admin shell')
  return role
}

const collapsedKey = 'fxmed-admin-collapsed-groups'

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [role, setRole] = useState<AdminRole | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getCurrentAdminRole(), getTwoStepStatus().catch(() => null)])
      .then(([found, status]) => {
        if (cancelled) return
        if (!found) { router.replace('/admin/login'); return }
        // Signed in with the password but not yet the code: finish signing in.
        if (status?.enrolled && !status.verified) {
          router.replace(`/admin/login?step=code&next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
          return
        }
        setRole(found)
      })
      .catch((error) => {
        console.error('Admin auth check failed:', error)
        router.replace('/admin/login')
      })
    return () => { cancelled = true }
  }, [router])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
    router.push('/admin/login')
    router.refresh()
  }

  if (!role) {
    return <div className="clinic-theme flex min-h-screen items-center justify-center"><Spinner label="Loading admin panel" /></div>
  }

  return <AdminFrame role={role} onLogout={handleLogout}>{children}</AdminFrame>
}

/**
 * The admin's sidebar, top bar and page frame for a known role. AdminShell
 * renders it once the signed-in role is checked; it takes the role as a prop
 * so the frame can also be previewed with sample data (app/dev/clinic-preview).
 */
export function AdminFrame({ role, onLogout, path, children }: { role: AdminRole; onLogout: () => void; path?: string; children: ReactNode }) {
  const currentPath = usePathname()
  const pathname = path ?? currentPath
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the phone menu whenever the page changes.
  const [shownPath, setShownPath] = useState(pathname)
  if (shownPath !== pathname) {
    setShownPath(pathname)
    setDrawerOpen(false)
  }

  const route = findAdminRoute(pathname)
  const allowed = !route || canAccessTab(role, route.tab)
  const group = route && adminGroups.find((item) => item.id === route.group)
  // Areas with sections in the sidebar name the open section in the header.
  const subNav = route ? subNavFor(route.tab, role) : null
  const section = subNav ? openSubNavItem(subNav, searchParams.get(subNav.param)) : undefined
  const title = searchParams.get('patient') && route?.tab === 'healthcare' ? 'Patient chart' : section?.label || route?.title || 'Admin'
  const crumb = [group?.label, section ? route?.label : null].filter(Boolean).join(' / ') || 'Admin'

  return (
    <RoleContext.Provider value={role}>
      <FeedbackProvider>
        <div className="clinic-theme min-h-screen lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
          {drawerOpen && <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-clinic-ink/30 backdrop-blur-sm lg:hidden" />}
          <aside className={`fixed inset-y-0 left-0 z-50 w-[272px] max-w-[85vw] p-3 transition-transform lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-auto lg:max-w-none lg:translate-x-0 lg:transition-none ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex h-full flex-col overflow-hidden rounded-card bg-clinic-card px-3 py-5 shadow-card">
              <div className="flex items-center justify-between px-2">
                <Link href="/admin" aria-label="FXMed admin" className="block py-1"><Image src="/FXMed_Logo_Black.png" alt="" width={1202} height={335} priority className="h-8 w-auto" /></Link>
                <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="clinic-icon-button h-9 w-9 lg:hidden"><XIcon size={18} /></button>
              </div>
              <SidebarNav role={role} pathname={pathname} />
              <div className="mt-auto pt-3">
                <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left text-sm font-medium text-clinic-muted transition hover:bg-clinic-ink/5 hover:text-clinic-ink"><SignOutIcon size={19} />Sign out</button>
              </div>
            </div>
          </aside>

          <main className="min-w-0 pb-10">
            <header className="glass-blur sticky top-0 z-20 px-3 py-3 sm:px-5 lg:px-8 lg:py-5">
              <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)} className="clinic-icon-button lg:hidden"><ListIcon size={20} /></button>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-clinic-muted">{crumb}</p>
                    <h1 className="truncate text-[1.6rem] leading-tight sm:text-[2.1rem] lg:text-[2.5rem]">{title}</h1>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <Notifications />
                  <AdminAccountMenu roleLabel={adminRoleLabels[role]} />
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8 lg:py-6">
              {route && !section && <p className="mb-5 max-w-3xl text-sm text-clinic-muted">{route.description}</p>}
              {allowed ? children : <NoAccess role={role} />}
            </div>
          </main>
        </div>
      </FeedbackProvider>
    </RoleContext.Provider>
  )
}

function SidebarNav({ role, pathname }: { role: AdminRole; pathname: string }) {
  const searchParams = useSearchParams()
  const routes = routesForRole(role)
  const activeRoute = findAdminRoute(pathname)
  // The nav only renders in the browser (after the role check), so the saved
  // preference can be read straight away.
  const [collapsed, setCollapsed] = useState<AdminGroupId[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(collapsedKey) || '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })

  const toggle = (id: AdminGroupId) => {
    const next = collapsed.includes(id) ? collapsed.filter((item) => item !== id) : [...collapsed, id]
    setCollapsed(next)
    window.localStorage.setItem(collapsedKey, JSON.stringify(next))
  }

  // The open page is a sage pill. Its text is ink, not white, to stay readable on sage.
  const linkClass = (active: boolean, nested = false) => `group relative flex items-center gap-3 rounded-full ${nested ? 'px-3 py-1.5 text-[13px]' : 'px-3 py-2 text-[13.5px]'} font-medium transition ${active ? 'bg-clinic-sage text-clinic-ink' : 'text-clinic-muted hover:bg-clinic-ink/5 hover:text-clinic-ink'}`

  return (
    <nav aria-label="Admin" className="relative -mx-1 mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(22,26,21,0.12)_transparent]">
      {adminGroups.map((group) => {
        const items = routes.filter((route) => route.group === group.id)
        if (!items.length) return null
        const isCollapsed = collapsed.includes(group.id) && activeRoute?.group !== group.id
        return (
          <div key={group.id}>
            <button type="button" onClick={() => toggle(group.id)} aria-expanded={!isCollapsed} className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-clinic-muted/80 hover:text-clinic-ink">
              {group.label}
              <CaretDownIcon size={12} weight="bold" className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            </button>
            {!isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {items.map((item) => {
                  const Icon = icons[item.tab]
                  // Areas with sections list them here, in their groups.
                  const subNav = subNavFor(item.tab, role)
                  if (subNav) {
                    const open = activeRoute?.path === item.path ? openSubNavItem(subNav, searchParams.get(subNav.param))?.id : null
                    return subNav.groups.map((subGroup) => (
                      <div key={`${item.path}:${subGroup.label || item.label}`} className="pb-1">
                        <p className="px-3 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-clinic-muted/70">{subGroup.label || item.label}</p>
                        {subGroup.items.map((entry) => {
                          const active = open === entry.id
                          return <Link key={entry.id} href={`${item.path}?${subNav.param}=${entry.id}`} aria-current={active ? 'page' : undefined} className={linkClass(active, true)}>{entry.label}</Link>
                        })}
                      </div>
                    ))
                  }
                  const active = activeRoute?.path === item.path
                  return (
                    <Link key={item.path} href={item.path} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                      <Icon size={20} weight={active ? 'fill' : 'duotone'} aria-hidden="true" className={active ? 'text-clinic-ink' : 'text-clinic-muted group-hover:text-clinic-ink'} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function NoAccess({ role }: { role: AdminRole }) {
  return (
    <div className="clinic-card rounded-card p-10 text-center">
      <h2 className="text-2xl">You don&apos;t have access to this area</h2>
      <p className="mt-2 text-sm text-text-mid">Your role ({adminRoleLabels[role]}) can&apos;t open this page. Ask an admin if you need it.</p>
      <Link href={defaultAdminPath(role)} className="primary mt-6">Go to your dashboard</Link>
    </div>
  )
}
