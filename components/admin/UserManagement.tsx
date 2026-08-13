'use client'

import { useEffect, useState } from 'react'
import { adminRoleLabels, type AdminRole } from '@/lib/admin-auth'

type ManagedUser = {
  id: string
  email: string
  role: string
  roleLabel: string
  confirmed: boolean
  created_at: string
}

const roleOptions: Array<{ id: AdminRole; label: string; description: string }> = [
  { id: 'admin', label: adminRoleLabels.admin, description: 'Full dashboard access and user management.' },
  { id: 'clinical', label: adminRoleLabels.clinical, description: 'Blog, Clinical CRM, Health Analysis, and Requests.' },
  { id: 'sales', label: adminRoleLabels.sales, description: 'Financial CRM, SEO Analytics, and Messages.' },
]

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string; role: string } | null>(null)
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'clinical' as AdminRole,
  })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to load users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading admin users:', error)
      setError(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setCreatedLogin({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: adminRoleLabels[form.role],
      })
      setForm({ email: '', password: '', role: 'clinical' })
      fetchUsers()
    } catch (error) {
      console.error('Error creating admin user:', error)
      setError(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="bg-white rounded-lg p-6 shadow-lg border border-green-deep/10">
        <h3 className="text-xl font-dm-sans font-semibold text-green-deep mb-2">Create Dashboard User</h3>
        <p className="text-sm text-text-mid mb-5">Create a Supabase login and assign dashboard access in one step.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {createdLogin && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-deep">
            <p className="font-semibold mb-1">User created</p>
            <p>Email: {createdLogin.email}</p>
            <p>Password: {createdLogin.password}</p>
            <p>Role: {createdLogin.role}</p>
          </div>
        )}

        <form onSubmit={createUser} className="space-y-4">
          <div>
            <label htmlFor="new-user-email" className="block text-sm font-dm-sans font-semibold text-green-deep mb-2">Email</label>
            <input
              id="new-user-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="new-user-password" className="block text-sm font-dm-sans font-semibold text-green-deep mb-2">Temporary Password</label>
            <input
              id="new-user-password"
              type="text"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              minLength={8}
              required
            />
          </div>

          <div>
            <label htmlFor="new-user-role" className="block text-sm font-dm-sans font-semibold text-green-deep mb-2">Role</label>
            <select
              id="new-user-role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as AdminRole }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !form.email.trim() || form.password.length < 8}
            className="w-full px-4 py-3 rounded-lg bg-gold text-green-deep font-dm-sans font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-lg border border-green-deep/10">
        <h3 className="text-xl font-dm-sans font-semibold text-green-deep mb-4">Role Access</h3>
        <div className="space-y-3 mb-6">
          {roleOptions.map((role) => (
            <div key={role.id} className="border border-gray-200 rounded-lg p-3">
              <p className="font-dm-sans font-semibold text-green-deep">{role.label}</p>
              <p className="text-sm text-text-mid">{role.description}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-dm-sans font-semibold text-green-deep mb-3">Dashboard Users</h3>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-text-mid">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-text-mid">No dashboard users found.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-4 border border-gray-200 rounded-lg p-3">
                <div>
                  <p className="font-dm-sans font-semibold text-green-deep">{user.email}</p>
                  <p className="text-xs text-text-mid">{user.confirmed ? 'Confirmed' : 'Unconfirmed'}</p>
                </div>
                <span className="text-xs uppercase tracking-wide bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                  {user.roleLabel}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
