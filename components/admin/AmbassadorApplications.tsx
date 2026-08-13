'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ambassadorStatuses,
  formatAmbassadorStatus,
  type AmbassadorApplication,
  type AmbassadorStatus,
} from '@/lib/ambassador-applications'

const badgeStyles: Record<AmbassadorStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  under_review: 'border-blue-200 bg-blue-50 text-blue-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
}

const nextStatuses: Record<AmbassadorStatus, AmbassadorStatus[]> = {
  pending: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['under_review'],
  rejected: ['under_review'],
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function DetailItem({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words font-dm-sans text-sm leading-6 text-gray-700">{value || 'Not provided'}</dd>
    </div>
  )
}

export default function AmbassadorApplications({ onPortalChanged }: { onPortalChanged?: () => void }) {
  const [applications, setApplications] = useState<AmbassadorApplication[]>([])
  const [selected, setSelected] = useState<AmbassadorApplication | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | AmbassadorStatus>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [portalMessage, setPortalMessage] = useState('')
  const pageSize = 20

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search.trim()) params.set('search', search.trim())
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    try {
      const response = await fetch(`/api/admin/ambassador-applications?${params}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Failed to fetch applications')
      setApplications(result.applications || [])
      setTotal(result.total || 0)
    } catch (fetchError) {
      console.error('Error fetching ambassador applications:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, page, search, statusFilter])

  useEffect(() => {
    const timer = window.setTimeout(fetchApplications, search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [fetchApplications, search])

  useEffect(() => {
    if (!selected) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selected])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const counts = useMemo(() => {
    return ambassadorStatuses.reduce<Record<AmbassadorStatus, number>>((result, status) => {
      result[status] = applications.filter((application) => application.status === status).length
      return result
    }, { pending: 0, under_review: 0, approved: 0, rejected: 0 })
  }, [applications])

  const updateStatus = async (status: AmbassadorStatus) => {
    if (!selected || status === selected.status) return
    if ((status === 'approved' || status === 'rejected') && !window.confirm(`Mark this application as ${formatAmbassadorStatus(status)}?`)) return

    setUpdating(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/ambassador-applications/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Failed to update application')
      const updated = result.application as AmbassadorApplication
      setApplications((current) => current.map((application) => application.id === updated.id ? updated : application))
      setSelected(updated)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update application')
    } finally {
      setUpdating(false)
    }
  }

  const resetFilters = () => {
    setStatusFilter('all')
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const createPortalAccess = async () => {
    if (!selected || selected.status !== 'approved') return
    if (!window.confirm(`Grant Ambassador Portal access to ${selected.email}? They will receive a secure email to create their password, then they will be taken directly into the portal.`)) return
    setInviting(true)
    setPortalMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/ambassador-portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: selected.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Failed to create portal access')
      setPortalMessage(result.message || 'Portal access created successfully.')
      onPortalChanged?.()
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to create portal access')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-lg">
      <div className="border-b border-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-green-mid">Program management</p>
            <h3 className="font-dm-sans text-2xl font-bold text-green-deep">Ambassador Applications</h3>
            <p className="mt-1 font-dm-sans text-sm text-text-mid">Review applicants and manage their progress through approval.</p>
          </div>
          <button type="button" onClick={fetchApplications} disabled={loading} className="rounded-lg bg-green-deep px-4 py-2 font-dm-sans text-sm font-semibold text-white hover:bg-green-mid disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ambassadorStatuses.map((status) => (
            <button key={status} type="button" onClick={() => { setStatusFilter(status); setPage(1) }} className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${badgeStyles[status]} ${statusFilter === status ? 'ring-2 ring-green-deep/30' : ''}`}>
              <span className="block text-2xl font-bold">{counts[status]}</span>
              <span className="text-xs font-semibold">{formatAmbassadorStatus(status)} on this page</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-gray-100 bg-gray-50/70 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_170px_170px_180px]">
          <div className="relative">
            <label htmlFor="ambassador-admin-search" className="sr-only">Search applications</label>
            <input id="ambassador-admin-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search name or email…" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-dm-sans text-sm outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/15" />
          </div>
          <div>
            <label htmlFor="ambassador-date-from" className="sr-only">Applied from</label>
            <input id="ambassador-date-from" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1) }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-dm-sans text-sm" title="Applied from" />
          </div>
          <div>
            <label htmlFor="ambassador-date-to" className="sr-only">Applied to</label>
            <input id="ambassador-date-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1) }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-dm-sans text-sm" title="Applied to" />
          </div>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | AmbassadorStatus); setPage(1) }} aria-label="Filter by status" className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-dm-sans text-sm">
            <option value="all">All statuses</option>
            {ambassadorStatuses.map((status) => <option key={status} value={status}>{formatAmbassadorStatus(status)}</option>)}
          </select>
        </div>
        {(search || dateFrom || dateTo || statusFilter !== 'all') && <button type="button" onClick={resetFilters} className="mt-3 font-dm-sans text-xs font-semibold text-green-mid hover:underline">Clear all filters</button>}
      </div>

      {error && <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-dm-sans text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-20 text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-green-deep" /><p className="font-dm-sans text-text-mid">Loading applications…</p></div>
      ) : applications.length === 0 ? (
        <div className="py-20 text-center"><div className="mb-4 text-5xl">🤝</div><h4 className="font-dm-sans text-xl font-bold text-green-deep">No applications found</h4><p className="mt-2 font-dm-sans text-sm text-text-mid">New submissions from /ambassadors/apply will appear here.</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left font-dm-sans">
            <thead><tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><th className="px-6 py-3">Applicant</th><th className="px-4 py-3">Organization</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="border-b border-gray-100 transition hover:bg-green-50/50">
                  <td className="px-6 py-4"><span className="block font-semibold text-gray-900">{application.first_name} {application.last_name}</span><span className="block text-sm text-gray-500">{application.email}</span></td>
                  <td className="max-w-48 truncate px-4 py-4 text-sm text-gray-700">{application.organization || '—'}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{[application.city, application.state_region].filter(Boolean).join(', ')}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{formatDate(application.created_at)}</td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeStyles[application.status]}`}>{formatAmbassadorStatus(application.status)}</span></td>
                  <td className="px-6 py-4 text-right"><button type="button" onClick={() => setSelected(application)} className="rounded-lg border border-green-deep/20 px-3 py-2 text-sm font-semibold text-green-deep hover:bg-green-deep hover:text-white">View details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 font-dm-sans text-sm text-gray-500">
        <span>{total === 0 ? '0 applications' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</span>
        <div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 disabled:opacity-40">Next</button></div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="ambassador-detail-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-green-mid">Application details</p><h3 id="ambassador-detail-title" className="mt-1 font-dm-sans text-2xl font-bold text-green-deep">{selected.first_name} {selected.last_name}</h3><p className="mt-1 font-dm-sans text-sm text-gray-500">Submitted {formatDate(selected.created_at)}</p></div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close application details" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200">×</button>
            </div>
            <div className="overflow-y-auto p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-cream p-4">
                <div><span className="block text-xs font-bold uppercase tracking-wide text-gray-500">Current status</span><span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${badgeStyles[selected.status]}`}>{formatAmbassadorStatus(selected.status)}</span></div>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses[selected.status].map((status) => <button key={status} type="button" onClick={() => updateStatus(status)} disabled={updating} className={`rounded-lg border px-4 py-2 font-dm-sans text-sm font-semibold disabled:opacity-50 ${status === 'rejected' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-green-deep bg-green-deep text-white hover:bg-green-mid'}`}>{updating ? 'Updating…' : `Mark ${formatAmbassadorStatus(status)}`}</button>)}
                </div>
              </div>
              {selected.status === 'approved' && (
                <div className="mb-6 rounded-xl border border-green-mid/20 bg-green-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div><p className="font-dm-sans text-sm font-bold text-green-deep">Ambassador Portal access</p><p className="mt-1 max-w-xl font-dm-sans text-xs leading-5 text-text-mid">Send a secure activation link. The Ambassador creates a password, enters the portal automatically, and receives a short first-time setup guide.</p></div>
                    <button type="button" onClick={createPortalAccess} disabled={inviting} className="rounded-lg bg-gold px-4 py-2.5 font-dm-sans text-sm font-bold text-green-deep disabled:opacity-50">{inviting ? 'Sending activation email…' : 'Grant or resend portal access'}</button>
                  </div>
                  {portalMessage && <p className="mt-3 font-dm-sans text-sm font-semibold text-green-700">{portalMessage}</p>}
                </div>
              )}

              <div className="space-y-7">
                <section><h4 className="mb-4 border-b border-gray-100 pb-2 font-dm-sans text-lg font-bold text-green-deep">Personal information</h4><dl className="grid gap-4 sm:grid-cols-2"><DetailItem label="Email" value={selected.email} /><DetailItem label="Phone" value={selected.phone} /><DetailItem label="Gender" value={selected.gender} /><DetailItem label="State" value={selected.state_region} /><DetailItem label="City" value={selected.city} /></dl></section>
                <section><h4 className="mb-4 border-b border-gray-100 pb-2 font-dm-sans text-lg font-bold text-green-deep">Professional information</h4><dl className="grid gap-4 sm:grid-cols-2"><DetailItem label="Organization" value={selected.organization} /><DetailItem label="Job title / role" value={selected.job_title} /><DetailItem label="Field of expertise" value={selected.field_of_expertise} wide /></dl></section>
                <section><h4 className="mb-4 border-b border-gray-100 pb-2 font-dm-sans text-lg font-bold text-green-deep">Ambassador information</h4><dl className="grid gap-4 sm:grid-cols-2"><DetailItem label="Motivation" value={selected.motivation} wide /></dl></section>
                <section><h4 className="mb-4 border-b border-gray-100 pb-2 font-dm-sans text-lg font-bold text-green-deep">Application metadata</h4><dl className="grid gap-4 sm:grid-cols-2"><DetailItem label="Application ID" value={selected.id} /><DetailItem label="Consent acknowledged" value={selected.consent ? 'Yes' : 'No'} /><DetailItem label="Created" value={formatDate(selected.created_at)} /><DetailItem label="Last updated" value={formatDate(selected.updated_at)} /></dl></section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
