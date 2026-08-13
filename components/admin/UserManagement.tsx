'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIcon,
  ArrowsClockwiseIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  EnvelopeSimpleIcon,
  FirstAidKitIcon,
  KeyIcon,
  LockKeyIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  TrendUpIcon,
  UserCirclePlusIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react'
import { adminRoleLabels, adminRolePermissions, type AdminRole, type AdminTab } from '@/lib/admin-auth'

type ManagedUser = {
  id: string
  email: string
  role: AdminRole
  roleLabel: string
  confirmed: boolean
  active: boolean
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
}

type UserActivity = {
  id: string
  action: string
  module: string
  description: string
  outcome: 'success' | 'denied' | 'failed'
  created_at: string
  source: 'admin' | 'emr' | 'auth'
  entity_type?: string | null
  entity_id?: string | null
}

const tabLabels: Record<AdminTab, string> = {
  blog: 'Blog Management',
  crm: 'CRM',
  seo: 'SEO Analytics',
  messages: 'Messages',
  requests: 'Requests',
  ambassador: 'Ambassador Program',
  tools: 'Admin Tools',
  users: 'Users & Roles',
  zara: 'Zara Conversations',
  contacts: 'Outreach Contacts',
  healthcare: 'Healthcare / EMR + Health Analysis',
}

const roleOptions: Array<{
  id: AdminRole
  label: string
  description: string
  Icon: typeof ShieldCheckIcon
  tone: string
}> = [
  {
    id: 'admin',
    label: adminRoleLabels.admin,
    description: 'Complete administrative and clinical platform access, including user management.',
    Icon: ShieldCheckIcon,
    tone: 'bg-[#E5E4FF] text-[#76508C]',
  },
  {
    id: 'clinical',
    label: adminRoleLabels.clinical,
    description: 'Clinical operations, patient records, health analysis, appointments, and care delivery.',
    Icon: StethoscopeIcon,
    tone: 'bg-[#EAF7EE] text-[#2D6A4F]',
  },
  {
    id: 'sales',
    label: adminRoleLabels.sales,
    description: 'Lead management, financial CRM, communications, and growth tools without EMR access.',
    Icon: TrendUpIcon,
    tone: 'bg-[#FFF4D6] text-[#A36A00]',
  },
]

function roleAccess(role: AdminRole) {
  return adminRolePermissions[role].tabs.map(tab => {
    if (tab !== 'crm') return tabLabels[tab]
    const crmViews = adminRolePermissions[role].crmViews
    if (crmViews.length === 2) return 'Clinical & Financial CRM'
    return crmViews[0] === 'clinical' ? 'Clinical CRM' : 'Financial CRM'
  })
}

function secureRandomIndex(max: number) {
  const values = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / max) * max
  do crypto.getRandomValues(values)
  while (values[0] >= limit)
  return values[0] % max
}

function generateSecurePassword() {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%&*+-_=?',
  ]
  const allCharacters = groups.join('')
  const password = groups.map(group => group[secureRandomIndex(group.length)])
  while (password.length < 16) password.push(allCharacters[secureRandomIndex(allCharacters.length)])
  for (let index = password.length - 1; index > 0; index--) {
    const swapIndex = secureRandomIndex(index + 1)
    ;[password[index], password[swapIndex]] = [password[swapIndex], password[index]]
  }
  return password.join('')
}

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingUser, setUpdatingUser] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRolePermissions, setShowRolePermissions] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false)
  const [activity, setActivity] = useState<UserActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')
  const [activityMigrationRequired, setActivityMigrationRequired] = useState(false)
  const [error, setError] = useState('')
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string; role: string } | null>(null)
  const [form, setForm] = useState({ email: '', password: '', role: 'clinical' as AdminRole })

  const counts = useMemo(() => ({
    total: users.length,
    admin: users.filter(user => user.role === 'admin').length,
    clinical: users.filter(user => user.role === 'clinical').length,
    sales: users.filter(user => user.role === 'sales').length,
  }), [users])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/admin/users', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users || [])
      setCurrentUserId(data.currentUserId || '')
      setSelectedUser(current => current ? (data.users || []).find((user: ManagedUser) => user.id === current.id) || null : null)
    } catch (error) {
      console.error('Error loading admin users:', error)
      setError(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchUsers() }, [])

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setCreatedLogin(null)

    try {
      setSaving(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create user')

      setCreatedLogin({ email: form.email.trim().toLowerCase(), password: form.password, role: adminRoleLabels[form.role] })
      setForm({ email: '', password: '', role: 'clinical' })
      await fetchUsers()
    } catch (error) {
      console.error('Error creating admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const selectedRole = roleOptions.find(role => role.id === form.role) || roleOptions[1]

  const generatePassword = () => {
    setForm(current => ({ ...current, password: generateSecurePassword() }))
    setError('')
  }

  const generateResetPassword = () => {
    setResetPassword(generateSecurePassword())
    setResetPasswordSuccess(false)
    setError('')
  }

  const formatDateTime = (value: string | null) => value
    ? new Date(value).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Never'

  const updateUserStatus = async () => {
    if (!selectedUser || pendingStatus === null) return
    setUpdatingUser(true)
    setError('')
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedUser.id, active: pendingStatus }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update user')
      setUsers(current => current.map(user => user.id === data.user.id ? data.user : user))
      setSelectedUser(data.user)
      setPendingStatus(null)
      await fetchUserActivity(data.user.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setUpdatingUser(false)
    }
  }

  const resetUserPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedUser) return
    if (resetPassword.length < 8 || !/[A-Za-z]/.test(resetPassword) || !/\d/.test(resetPassword)) {
      setError('Use at least 8 characters, including a letter and a number')
      return
    }
    setUpdatingUser(true)
    setError('')
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', id: selectedUser.id, password: resetPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to reset password')
      setResetPasswordSuccess(true)
      await fetchUserActivity(selectedUser.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setUpdatingUser(false)
    }
  }

  const fetchUserActivity = async (userId: string) => {
    setActivityLoading(true)
    setActivityError('')
    try {
      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load activity')
      setActivity(data.activity || [])
      setActivityMigrationRequired(Boolean(data.migrationRequired))
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'Failed to load activity')
    } finally {
      setActivityLoading(false)
    }
  }

  const openUserDetails = (user: ManagedUser) => {
    setError('')
    setPendingStatus(null)
    setActivity([])
    setShowPasswordReset(false)
    setResetPassword('')
    setResetPasswordSuccess(false)
    setSelectedUser(user)
    void fetchUserActivity(user.id)
  }

  const openCreateModal = () => {
    setError('')
    setCreatedLogin(null)
    setShowCreateModal(true)
  }

  const closeCreateModal = useCallback(() => {
    if (saving) return
    setShowCreateModal(false)
    setError('')
    setCreatedLogin(null)
    setForm({ email: '', password: '', role: 'clinical' })
  }, [saving])

  const closeUserDetails = useCallback(() => {
    if (updatingUser) return
    setSelectedUser(null)
    setPendingStatus(null)
    setShowPasswordReset(false)
    setResetPassword('')
    setResetPasswordSuccess(false)
    setActivity([])
    setActivityError('')
    setActivityMigrationRequired(false)
    setError('')
  }, [updatingUser])

  useEffect(() => {
    if (!showCreateModal) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeCreateModal() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showCreateModal, closeCreateModal])

  useEffect(() => {
    if (!selectedUser) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeUserDetails() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selectedUser, closeUserDetails])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-green-deep">Team access</h2>
          <p className="mt-1 text-sm text-text-mid">Manage dashboard users and review access across the platform.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-green-deep shadow-[0_8px_22px_rgba(201,226,101,0.22)] transition hover:-translate-y-0.5">
          <UserCirclePlusIcon size={20} weight="fill" />Create new user
        </button>
      </div>

      {error && !showCreateModal && <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Dashboard users', counts.total, UsersThreeIcon, 'bg-[#EAF2FE] text-[#3374A8]'],
          ['Administrators', counts.admin, ShieldCheckIcon, 'bg-[#E5E4FF] text-[#76508C]'],
          ['Clinical team', counts.clinical, StethoscopeIcon, 'bg-[#EAF7EE] text-[#2D6A4F]'],
          ['Sales team', counts.sales, TrendUpIcon, 'bg-[#FFF4D6] text-[#A36A00]'],
        ].map(([label, value, Icon, tone]: any) => (
          <div key={label} className="rounded-[20px] border border-green-deep/10 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,46,0.05)]">
            <div className={`flex h-11 w-11 items-center justify-center rounded-[13px] ${tone}`}><Icon size={23} weight="fill" /></div>
            <p className="mt-5 text-3xl font-bold tracking-[-0.04em] text-green-deep">{loading ? '—' : value}</p>
            <p className="mt-1 text-sm font-semibold text-text-mid">{label}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[22px] border border-green-deep/10 bg-white shadow-[0_8px_30px_rgba(26,61,46,0.05)]">
        <button type="button" onClick={() => setShowRolePermissions(open => !open)} aria-expanded={showRolePermissions} aria-controls="role-permissions-content" className="flex w-full items-center justify-between gap-5 p-5 text-left transition hover:bg-[#FCFFF0] sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#E5E4FF] text-[#76508C]"><ShieldCheckIcon size={25} weight="fill" /></span>
            <div className="min-w-0"><h3 className="text-xl font-bold tracking-[-0.02em] text-green-deep">Role permissions</h3><p className="mt-1 text-sm leading-5 text-text-mid">View what Admin, Clinical Team, and Sales users can access.</p></div>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-green-mid"><span className="hidden sm:inline">{showRolePermissions ? 'Hide details' : 'View details'}</span><CaretDownIcon size={20} weight="bold" className={`transition-transform duration-200 ${showRolePermissions ? 'rotate-180' : ''}`} /></span>
        </button>

        {showRolePermissions && <div id="role-permissions-content" className="border-t border-green-deep/10 p-5 sm:p-7">
          <div className="flex items-start gap-3 rounded-[15px] border border-green-mid/15 bg-[#FCFFF0] p-4">
            <FirstAidKitIcon size={22} weight="fill" className="mt-0.5 shrink-0 text-green-mid" />
            <p className="text-xs leading-5 text-text-mid"><strong className="text-green-deep">EMR protection:</strong> Healthcare / EMR and Health Analysis are available only to Administrators and Clinical Team Members.</p>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {roleOptions.map(role => (
              <article key={role.id} className="rounded-[18px] border border-green-deep/10 bg-[#f7f5ee]/55 p-5">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-[13px] ${role.tone}`}><role.Icon size={23} weight="fill" /></span>
                  <div><h4 className="font-bold text-green-deep">{role.label}</h4><p className="text-xs text-text-mid">{roleAccess(role.id).length} accessible areas</p></div>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-text-mid">{role.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {roleAccess(role.id).map(access => <span key={access} className="inline-flex items-center gap-1.5 rounded-full border border-green-deep/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-green-deep"><CheckCircleIcon size={14} weight="fill" className="text-green-mid" />{access}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>}
      </section>

        <section className="rounded-[22px] border border-green-deep/10 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,46,0.05)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-green-deep">Dashboard users</h3><p className="mt-1 text-sm text-text-mid">Only admin, clinical, and sales dashboard accounts appear here.</p></div><button type="button" onClick={() => void fetchUsers()} disabled={loading} className="rounded-full border border-green-deep/15 px-4 py-2 text-xs font-bold text-green-deep transition hover:bg-green-deep hover:text-white disabled:opacity-50">Refresh</button></div>
          <div className="mt-6 space-y-3">
            {loading ? <div className="py-12 text-center text-sm text-text-mid">Loading dashboard users…</div> : users.length === 0 ? <div className="rounded-[16px] border border-dashed border-green-deep/15 py-12 text-center"><UsersThreeIcon size={38} weight="duotone" className="mx-auto text-green-mid" /><p className="mt-3 text-sm text-text-mid">No dashboard users found.</p></div> : users.map(user => {
              const role = roleOptions.find(option => option.id === user.role) || roleOptions[0]
              return <button type="button" key={user.id} onClick={() => openUserDetails(user)} className="flex w-full flex-wrap items-center gap-4 rounded-[16px] border border-green-deep/10 p-4 text-left transition hover:border-green-mid/30 hover:bg-[#FCFFF0] focus:outline-none focus:ring-2 focus:ring-green-mid/20"><span className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${role.tone}`}><role.Icon size={21} weight="fill" /></span><div className="min-w-0 flex-1"><p className="truncate font-bold text-green-deep">{user.email}</p><p className="mt-1 text-xs text-text-mid">Last login: {formatDateTime(user.last_sign_in_at)}</p></div><div className="text-right"><span className="inline-flex rounded-full bg-green-deep px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">{user.roleLabel}</span><p className={`mt-1.5 text-xs font-semibold ${user.active ? 'text-green-mid' : 'text-red-600'}`}>{user.active ? (user.confirmed ? 'Active' : 'Awaiting confirmation') : 'Deactivated'}</p></div></button>
            })}
          </div>
        </section>

      {selectedUser && (() => {
        const role = roleOptions.find(option => option.id === selectedUser.role) || roleOptions[0]
        const isCurrentUser = selectedUser.id === currentUserId
        return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-green-deep/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="user-details-title" onMouseDown={event => { if (event.target === event.currentTarget) closeUserDetails() }}>
          <section className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-white/20 bg-white p-6 shadow-[0_28px_80px_rgba(17,45,33,0.30)] sm:p-8">
            <button type="button" onClick={closeUserDetails} disabled={updatingUser} aria-label="Close user details" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f5ee] text-green-deep transition hover:bg-green-deep hover:text-white disabled:opacity-50"><XIcon size={20} weight="bold" /></button>
            <div className="flex items-center gap-4 pr-12"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] ${role.tone}`}><role.Icon size={28} weight="fill" /></span><div className="min-w-0"><h3 id="user-details-title" className="truncate text-2xl font-bold tracking-[-0.03em] text-green-deep">{selectedUser.email}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-green-deep px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">{selectedUser.roleLabel}</span><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${selectedUser.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedUser.active ? 'Active' : 'Deactivated'}</span>{isCurrentUser && <span className="rounded-full bg-gold/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-green-deep">Your account</span>}</div></div></div>

            {error && <div className="mt-5 rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border border-green-deep/10 bg-[#f7f5ee]/60 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-mid"><ClockCounterClockwiseIcon size={17} className="text-green-mid" />Last login</p><p className="mt-2 text-sm font-bold text-green-deep">{formatDateTime(selectedUser.last_sign_in_at)}</p>{!selectedUser.last_sign_in_at && <p className="mt-1 text-xs text-text-mid">This user has not signed in yet.</p>}</div>
              <div className="rounded-[16px] border border-green-deep/10 bg-[#f7f5ee]/60 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-mid"><CalendarBlankIcon size={17} className="text-green-mid" />Account created</p><p className="mt-2 text-sm font-bold text-green-deep">{formatDateTime(selectedUser.created_at)}</p></div>
              <div className="rounded-[16px] border border-green-deep/10 bg-[#f7f5ee]/60 p-4"><p className="text-xs font-bold uppercase tracking-wide text-text-mid">Email status</p><p className="mt-2 text-sm font-bold text-green-deep">{selectedUser.confirmed ? 'Confirmed' : 'Awaiting confirmation'}</p></div>
              <div className="rounded-[16px] border border-green-deep/10 bg-[#f7f5ee]/60 p-4"><p className="text-xs font-bold uppercase tracking-wide text-text-mid">Accessible areas</p><p className="mt-2 text-sm font-bold text-green-deep">{roleAccess(selectedUser.role).length} platform areas</p></div>
            </div>

            <div className="mt-5 rounded-[16px] border border-green-deep/10 p-5"><h4 className="font-bold text-green-deep">Role access</h4><div className="mt-3 flex flex-wrap gap-2">{roleAccess(selectedUser.role).map(access => <span key={access} className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f5ee] px-3 py-1.5 text-[11px] font-semibold text-green-deep"><CheckCircleIcon size={14} weight="fill" className="text-green-mid" />{access}</span>)}</div></div>

            <div className="mt-5 overflow-hidden rounded-[16px] border border-green-deep/10">
              <button type="button" onClick={() => { setShowPasswordReset(open => !open); setResetPasswordSuccess(false); setResetPassword(''); setError('') }} aria-expanded={showPasswordReset} className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#FCFFF0]"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FFF4D6] text-[#A36A00]"><KeyIcon size={21} weight="fill" /></span><div><h4 className="font-bold text-green-deep">Reset password</h4><p className="mt-1 text-xs text-text-mid">Set a temporary password without sending an email.</p></div></div><CaretDownIcon size={19} weight="bold" className={`shrink-0 text-green-mid transition-transform ${showPasswordReset ? 'rotate-180' : ''}`} /></button>
              {showPasswordReset && <div className="border-t border-green-deep/10 bg-[#f7f5ee]/45 p-5">
                {resetPasswordSuccess ? <div><div className="rounded-[14px] border border-green-200 bg-green-50 p-4 text-sm text-green-deep"><p className="flex items-center gap-2 font-bold"><CheckCircleIcon size={18} weight="fill" />Password reset successfully</p><p className="mt-3">Temporary password:</p><p className="mt-1 break-all rounded-[10px] bg-white px-3 py-2 font-mono font-bold">{resetPassword}</p><p className="mt-3 text-xs leading-5 text-text-mid">Share it securely. The user can change it from My Account after signing in.</p></div><button type="button" onClick={() => { setShowPasswordReset(false); setResetPassword(''); setResetPasswordSuccess(false) }} className="mt-3 rounded-full border border-green-deep/15 px-4 py-2 text-xs font-bold text-green-deep">Done</button></div> : <form onSubmit={resetUserPassword}>
                  <label className="block"><span className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-green-deep">New temporary password</span><button type="button" onClick={generateResetPassword} className="inline-flex items-center gap-1.5 rounded-full bg-gold/35 px-3 py-1.5 text-xs font-bold text-green-deep transition hover:bg-gold/55">{resetPassword ? <ArrowsClockwiseIcon size={15} weight="bold" /> : <KeyIcon size={15} weight="fill" />}{resetPassword ? 'Regenerate' : 'Generate password'}</button></span><div className="relative"><LockKeyIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-mid" /><input type="text" value={resetPassword} onChange={event => setResetPassword(event.target.value)} className="w-full rounded-[14px] border border-green-deep/15 bg-white py-3 pl-11 pr-4 font-mono outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" minLength={8} autoComplete="new-password" required /></div><span className="mt-1.5 block text-xs text-text-mid">This changes the password immediately. It does not reactivate a deactivated account.</span></label>
                  <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => { setShowPasswordReset(false); setResetPassword(''); setError('') }} disabled={updatingUser} className="rounded-full border border-green-deep/15 px-5 py-2.5 text-sm font-bold text-green-deep disabled:opacity-50">Cancel</button><button type="submit" disabled={updatingUser || resetPassword.length < 8} className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-green-deep disabled:opacity-50">{updatingUser ? 'Resetting…' : 'Reset password'}</button></div>
                </form>}
              </div>}
            </div>

            <div className="mt-5 rounded-[16px] border border-green-deep/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="flex items-center gap-2 font-bold text-green-deep"><ActivityIcon size={19} weight="fill" className="text-green-mid" />Activity log</h4><p className="mt-1 text-xs text-text-mid">Recent authentication, admin, and clinical actions.</p></div><button type="button" onClick={() => void fetchUserActivity(selectedUser.id)} disabled={activityLoading} className="rounded-full border border-green-deep/15 px-3 py-1.5 text-xs font-bold text-green-deep disabled:opacity-50">Refresh</button></div>
              {activityMigrationRequired && <div className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Apply migration 017 to begin recording general dashboard actions. Authentication and existing EMR activity are already shown below.</div>}
              {activityError && <div className="mt-4 rounded-[12px] border border-red-200 bg-red-50 p-3 text-xs text-red-700">{activityError}</div>}
              {activityLoading ? <div className="py-8 text-center text-sm text-text-mid">Loading activity…</div> : activity.length === 0 ? <div className="mt-4 rounded-[14px] border border-dashed border-green-deep/15 py-8 text-center"><ActivityIcon size={32} weight="duotone" className="mx-auto text-green-mid" /><p className="mt-2 text-sm text-text-mid">No recorded activity yet.</p></div> : <div className="mt-5 max-h-80 space-y-1 overflow-y-auto pr-1">{activity.map((item, index) => <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0"><div className="relative flex w-7 shrink-0 justify-center"><span className={`mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ${item.outcome === 'failed' || item.outcome === 'denied' ? 'bg-red-500 ring-red-50' : item.source === 'emr' ? 'bg-green-mid ring-green-50' : item.source === 'auth' ? 'bg-[#76508C] ring-[#F1EEFF]' : 'bg-[#3374A8] ring-[#EAF2FE]'}`} />{index < activity.length - 1 && <span className="absolute bottom-0 top-5 w-px bg-green-deep/10" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-bold capitalize text-green-deep">{item.description || item.action.replace(/_/g, ' ')}</p><time className="shrink-0 text-[10px] font-semibold text-text-mid">{formatDateTime(item.created_at)}</time></div><p className="mt-1 text-xs text-text-mid">{item.module}{item.entity_type ? ` · ${item.entity_type.replace(/_/g, ' ')}` : ''}</p></div></div>)}</div>}
            </div>

            {pendingStatus !== null ? <div className={`mt-5 rounded-[16px] border p-5 ${pendingStatus ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}><p className={`font-bold ${pendingStatus ? 'text-green-800' : 'text-red-800'}`}>{pendingStatus ? 'Reactivate this user?' : 'Deactivate this user?'}</p><p className="mt-1 text-sm leading-6 text-text-mid">{pendingStatus ? 'They will be able to sign in and use their assigned dashboard areas again.' : 'They will be blocked from signing in and accessing protected dashboard APIs. Their account and records will be retained.'}</p><div className="mt-4 flex gap-3"><button type="button" onClick={() => setPendingStatus(null)} disabled={updatingUser} className="rounded-full border border-green-deep/15 px-5 py-2.5 text-sm font-bold text-green-deep disabled:opacity-50">Cancel</button><button type="button" onClick={() => void updateUserStatus()} disabled={updatingUser} className={`rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50 ${pendingStatus ? 'bg-green-deep text-white' : 'bg-red-600 text-white'}`}>{updatingUser ? 'Updating…' : pendingStatus ? 'Reactivate user' : 'Deactivate user'}</button></div></div> : <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-text-mid">{isCurrentUser ? 'You cannot deactivate the account you are currently using.' : selectedUser.active ? 'Deactivate access without deleting this user or their records.' : 'Restore this user’s access to the dashboard.'}</p><button type="button" onClick={() => setPendingStatus(!selectedUser.active)} disabled={isCurrentUser} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${selectedUser.active ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-green-deep text-white hover:-translate-y-0.5'}`}><ProhibitIcon size={18} weight="bold" />{selectedUser.active ? 'Deactivate user' : 'Reactivate user'}</button></div>}
          </section>
        </div>
      })()}

      {showCreateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-green-deep/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-user-title" onMouseDown={event => { if (event.target === event.currentTarget) closeCreateModal() }}>
          <section className="relative my-auto w-full max-w-xl rounded-[26px] border border-white/20 bg-white p-6 shadow-[0_28px_80px_rgba(17,45,33,0.30)] sm:p-8">
            <button type="button" onClick={closeCreateModal} disabled={saving} aria-label="Close create user dialog" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f5ee] text-green-deep transition hover:bg-green-deep hover:text-white disabled:opacity-50"><XIcon size={20} weight="bold" /></button>
            <div className="flex items-center gap-3 pr-12"><span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gold/35 text-green-deep"><UserCirclePlusIcon size={25} weight="fill" /></span><div><h3 id="create-user-title" className="text-2xl font-bold tracking-[-0.03em] text-green-deep">Create dashboard user</h3><p className="mt-1 text-sm text-text-mid">Create a secure login and assign platform access.</p></div></div>

            {error && <div className="mt-5 rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            {createdLogin ? (
              <div className="mt-6">
                <div className="rounded-[16px] border border-green-200 bg-green-50 p-5 text-sm text-green-deep"><p className="mb-3 flex items-center gap-2 text-base font-bold"><CheckCircleIcon size={20} weight="fill" />User created successfully</p><div className="space-y-1.5"><p><strong>Email:</strong> {createdLogin.email}</p><p><strong>Temporary password:</strong> {createdLogin.password}</p><p><strong>Role:</strong> {createdLogin.role}</p></div><p className="mt-4 text-xs leading-5 text-text-mid">Share these details securely and ask the user to change their temporary password.</p></div>
                <button type="button" onClick={closeCreateModal} className="mt-5 w-full rounded-full bg-green-deep px-5 py-3.5 font-bold text-white transition hover:-translate-y-0.5">Done</button>
              </div>
            ) : (
              <form onSubmit={createUser} className="mt-6 space-y-4">
                <label className="block"><span className="mb-2 block text-sm font-bold text-green-deep">Email address</span><div className="relative"><EnvelopeSimpleIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-mid" /><input type="email" value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} autoFocus className="w-full rounded-[14px] border border-green-deep/15 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" required /></div></label>
                <label className="block"><span className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-green-deep">Temporary password</span><button type="button" onClick={generatePassword} className="inline-flex items-center gap-1.5 rounded-full bg-gold/35 px-3 py-1.5 text-xs font-bold text-green-deep transition hover:bg-gold/55">{form.password ? <ArrowsClockwiseIcon size={15} weight="bold" /> : <KeyIcon size={15} weight="fill" />}{form.password ? 'Regenerate password' : 'Generate secure password'}</button></span><div className="relative"><LockKeyIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-mid" /><input type="text" value={form.password} onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))} className="w-full rounded-[14px] border border-green-deep/15 bg-white py-3 pl-11 pr-4 font-mono outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" minLength={8} autoComplete="new-password" required /></div><span className="mt-1.5 block text-xs text-text-mid">Use at least 8 characters with a letter and number. Generated passwords are 16 characters and include symbols.</span></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-green-deep">Assigned role</span><select value={form.role} onChange={event => setForm(prev => ({ ...prev, role: event.target.value as AdminRole }))} className="w-full rounded-[14px] border border-green-deep/15 bg-white px-4 py-3 outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10">{roleOptions.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select></label>
                <div className="rounded-[14px] bg-[#f7f5ee] p-4"><div className="flex items-center gap-2"><selectedRole.Icon size={18} weight="fill" className="text-green-mid" /><p className="text-sm font-bold text-green-deep">{selectedRole.label}</p></div><p className="mt-1 text-xs leading-5 text-text-mid">{selectedRole.description}</p></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={closeCreateModal} disabled={saving} className="flex-1 rounded-full border border-green-deep/15 px-5 py-3.5 font-bold text-green-deep transition hover:bg-[#f7f5ee] disabled:opacity-50">Cancel</button><button type="submit" disabled={saving || !form.email.trim() || form.password.length < 8} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-5 py-3.5 font-bold text-green-deep transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"><UserCirclePlusIcon size={19} weight="bold" />{saving ? 'Creating…' : 'Create user'}</button></div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
