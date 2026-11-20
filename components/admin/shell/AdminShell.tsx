'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [role, setRole] = useState<AdminRole | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  // Close the phone menu whenever the page changes.
  const [shownPath, setShownPath] = useState(pathname)
  if (shownPath !== pathname) {
    setShownPath(pathname)
    setDrawerOpen(false)
  }

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
    return <div className="admin-theme flex min-h-screen items-center justify-center"><Spinner label="Loading admin panel" /></div>
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
        <div className="admin-theme min-h-screen text-green-deep lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
          {drawerOpen && <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-green-deep/40 backdrop-blur-sm lg:hidden" />}
          <aside className={`fixed inset-y-0 left-0 z-50 w-[288px] max-w-[85vw] p-3 transition-transform lg:sticky lg:transition-none lg:top-0 lg:z-30 lg:h-screen lg:w-auto lg:max-w-none lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="brand-gradient relative flex h-full flex-col overflow-hidden rounded-[26px] px-4 py-5 text-white shadow-[0_24px_60px_-20px_rgba(16,45,33,0.6)]">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-green-light/25 blur-3xl" />
              <div className="relative flex items-center justify-between px-1">
                <Link href="/admin" aria-label="FXMed admin" className="block h-11 w-36 bg-no-repeat" style={{ backgroundImage: "url('/logo.png')", backgroundPosition: '51% 45%', backgroundSize: '115.5% auto' }} />
                <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="rounded-full p-2 text-white/70 hover:bg-white/10 lg:hidden"><XIcon size={20} /></button>
              </div>
              <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2.5 backdrop-blur-md">
                <span className="accent-gradient flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-green-deep">{adminRoleLabels[role].charAt(0)}</span>
                <div className="min-w-0"><p className="text-[13px] font-semibold leading-tight">FXMed workspace</p><p className="truncate text-[11px] text-white/55">{adminRoleLabels[role]}</p></div>
              </div>
              <SidebarNav role={role} pathname={pathname} />
              <div className="relative mt-auto border-t border-white/10 pt-3">
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"><SignOutIcon size={19} />Sign out</button>
              </div>
            </div>
          </aside>

          <main className="min-w-0 pb-10">
            <header className="sticky top-0 z-20 px-3 pt-3 sm:px-5 lg:px-6">
              <div className="glass glass-blur mx-auto flex max-w-[1600px] items-center justify-between gap-4 rounded-[22px] px-4 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)} className="rounded-xl border border-green-deep/10 bg-white/70 p-2.5 lg:hidden"><ListIcon size={20} /></button>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green-mid/80">{crumb}</p>
                    <h1 className="text-gradient truncate text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <AdminAccountMenu roleLabel={adminRoleLabels[role]} />
                  <Notifications />
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-[1600px] px-3 py-6 sm:px-5 lg:px-6 lg:py-7">
              {route && !section && <p className="mb-5 max-w-3xl text-sm text-text-mid">{route.description}</p>}
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

  const linkClass = (active: boolean, nested = false) => `group relative flex items-center gap-3 rounded-xl ${nested ? 'px-3 py-1.5 text-[13px]' : 'px-3 py-2 text-[13.5px]'} font-medium transition ${active ? 'accent-gradient font-semibold text-green-deep shadow-[0_8px_20px_-8px_rgba(201,226,101,0.8)]' : 'text-white/70 hover:bg-white/[0.08] hover:text-white'}`

  return (
    <nav aria-label="Admin" className="relative -mx-1 mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
      {adminGroups.map((group) => {
        const items = routes.filter((route) => route.group === group.id)
        if (!items.length) return null
        const isCollapsed = collapsed.includes(group.id) && activeRoute?.group !== group.id
        return (
          <div key={group.id}>
            <button type="button" onClick={() => toggle(group.id)} aria-expanded={!isCollapsed} className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/80 hover:text-gold">
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
                        <p className="px-3 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">{subGroup.label || item.label}</p>
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
                      <Icon size={20} weight={active ? 'fill' : 'duotone'} aria-hidden="true" className={active ? 'text-green-deep' : 'text-white/50 group-hover:text-gold'} />
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
    <div className="glass rounded-[24px] p-10 text-center">
      <h2 className="text-xl font-bold">You don&apos;t have access to this area</h2>
      <p className="mt-2 text-sm text-text-mid">Your role ({adminRoleLabels[role]}) can&apos;t open this page. Ask an admin if you need it.</p>
      <Link href={defaultAdminPath(role)} className="mt-6 inline-flex rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white">Go to your dashboard</Link>
    </div>
  )
}
