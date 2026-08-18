'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  careerDepartments,
  careerEmploymentTypes,
  careerStatuses,
  type CareerOpening,
} from '@/lib/careers'

const api = '/api/admin/careers'
const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

const emptyForm = {
  title: '',
  department: 'Clinical',
  location: '',
  employment_type: 'Full-time',
  summary: '',
  responsibilities: '',
  requirements: '',
  apply_email: '',
  status: 'draft',
  sort_order: 0,
}

type FormState = typeof emptyForm

function toForm(opening: CareerOpening): FormState {
  return {
    title: opening.title,
    department: opening.department,
    location: opening.location,
    employment_type: opening.employment_type,
    summary: opening.summary,
    responsibilities: (opening.responsibilities || []).join('\n'),
    requirements: (opening.requirements || []).join('\n'),
    apply_email: opening.apply_email || '',
    status: opening.status,
    sort_order: opening.sort_order,
  }
}

export default function CareersManagement() {
  const [openings, setOpenings] = useState<CareerOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<CareerOpening | 'new' | null>(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const response = await fetch(api)
    const result = await response.json().catch(() => ({}))
    if (response.ok) setOpenings(result.openings || [])
    else setError(result.error || 'Failed to load career openings.')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const counts = useMemo(() => ({
    published: openings.filter((item) => item.status === 'published').length,
    draft: openings.filter((item) => item.status === 'draft').length,
    closed: openings.filter((item) => item.status === 'closed').length,
  }), [openings])

  const visible = filter === 'all' ? openings : openings.filter((item) => item.status === filter)

  async function save(form: FormState, id?: string) {
    setError('')
    const response = await fetch(api, {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...(id ? { id } : {}) }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not save the opening.'); return false }
    await load()
    return true
  }

  async function setStatus(opening: CareerOpening, status: string) {
    setError('')
    const response = await fetch(api, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: opening.id, status }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      setError(result.error || 'Could not update the status.')
      return
    }
    await load()
  }

  async function remove(opening: CareerOpening) {
    if (!window.confirm(`Permanently delete “${opening.title}”? This cannot be undone.`)) return
    setError('')
    const response = await fetch(`${api}?id=${opening.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      setError(result.error || 'Could not delete the opening.')
      return
    }
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Published" value={counts.published} tone="bg-green-50 text-green-700" />
        <Stat label="Drafts" value={counts.draft} tone="bg-amber-50 text-amber-700" />
        <Stat label="Closed" value={counts.closed} tone="bg-gray-100 text-gray-700" />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-dm-sans text-sm text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
          <div>
            <h3 className="font-dm-sans text-2xl font-bold text-green-deep">Job openings</h3>
            <p className="mt-1 font-dm-sans text-sm text-text-mid">
              Published openings appear immediately on the public careers page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border px-4 py-2.5 font-dm-sans text-sm">
              <option value="all">All statuses</option>
              {careerStatuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
            </select>
            <button onClick={() => setEditing('new')} className="rounded-full bg-green-deep px-5 py-2.5 font-dm-sans text-sm font-bold text-white hover:bg-green-mid">
              + New opening
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center font-dm-sans text-text-mid">Loading…</div>
        ) : !visible.length ? (
          <div className="p-16 text-center font-dm-sans text-text-mid">
            {openings.length ? 'No openings with this status.' : 'No openings yet. Create your first one to populate the careers page.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visible.map((opening) => (
              <div key={opening.id} className="flex flex-wrap items-start justify-between gap-4 p-6">
                <div className="min-w-[260px] flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-dm-sans text-lg font-bold text-green-deep">{opening.title}</h4>
                    <StatusBadge status={opening.status} />
                  </div>
                  <p className="mt-1.5 font-dm-sans text-sm leading-6 text-text-mid">{opening.summary}</p>
                  <p className="mt-2 font-dm-sans text-xs text-gray-500">
                    {opening.department} · {opening.location} · {opening.employment_type}
                    <span className="mx-2">·</span>
                    {opening.responsibilities?.length || 0} responsibilities, {opening.requirements?.length || 0} requirements
                    <span className="mx-2">·</span>
                    Updated {date.format(new Date(opening.updated_at))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {opening.status !== 'published' && (
                    <button onClick={() => setStatus(opening, 'published')} className="rounded-full bg-green-50 px-4 py-2 font-dm-sans text-xs font-bold text-green-700 hover:bg-green-100">
                      Publish
                    </button>
                  )}
                  {opening.status === 'published' && (
                    <button onClick={() => setStatus(opening, 'closed')} className="rounded-full bg-gray-100 px-4 py-2 font-dm-sans text-xs font-bold text-gray-700 hover:bg-gray-200">
                      Close
                    </button>
                  )}
                  <button onClick={() => setEditing(opening)} className="rounded-full border border-green-deep/15 px-4 py-2 font-dm-sans text-xs font-bold text-green-deep hover:bg-green-deep/5">
                    Edit
                  </button>
                  <button onClick={() => remove(opening)} className="rounded-full px-3 py-2 font-dm-sans text-xs font-bold text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <OpeningEditor
          opening={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            const saved = await save(form, editing === 'new' ? undefined : editing.id)
            if (saved) setEditing(null)
            return saved
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[18px] border border-green-deep/10 bg-white p-5 shadow-sm">
      <span className={`inline-flex rounded-full px-3 py-1 font-dm-sans text-xs font-bold ${tone}`}>{label}</span>
      <p className="mt-3 font-dm-sans text-3xl font-bold text-green-deep">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-green-50 text-green-700',
    draft: 'bg-amber-100 text-amber-800',
    closed: 'bg-gray-100 text-gray-700',
  }
  return <span className={`inline-flex rounded-full px-3 py-1 font-dm-sans text-[11px] font-bold uppercase tracking-wide ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
}

function OpeningEditor({ opening, onClose, onSave }: { opening: CareerOpening | null; onClose: () => void; onSave: (form: FormState) => Promise<boolean> }) {
  const [form, setForm] = useState<FormState>(opening ? toForm(opening) : emptyForm)
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="opening-editor-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-dm-sans text-xs font-bold uppercase tracking-wide text-green-mid">Careers</p>
            <h3 id="opening-editor-title" className="mt-1 font-dm-sans text-2xl font-bold text-green-deep">
              {opening ? 'Edit opening' : 'New opening'}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <Text label="Job title" value={form.title} onChange={(value) => set('title', value)} required maxLength={160} placeholder="Functional Medicine Physician" />

          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Department" value={form.department} onChange={(value) => set('department', value)} options={careerDepartments} />
            <Select label="Employment type" value={form.employment_type} onChange={(value) => set('employment_type', value)} options={careerEmploymentTypes} />
            <Text label="Location" value={form.location} onChange={(value) => set('location', value)} required maxLength={160} placeholder="Lagos, Nigeria · Hybrid" />
            <Select label="Status" value={form.status} onChange={(value) => set('status', value)} options={careerStatuses} />
          </div>

          <Area label="Summary" value={form.summary} onChange={(value) => set('summary', value)} required rows={3} maxLength={600} placeholder="One or two sentences shown on the opening card." />
          <Area label="Responsibilities" hint="One per line" value={form.responsibilities} onChange={(value) => set('responsibilities', value)} rows={6} placeholder={'Run comprehensive consultations\nInterpret functional laboratory panels'} />
          <Area label="Requirements" hint="One per line" value={form.requirements} onChange={(value) => set('requirements', value)} rows={6} placeholder={'MBBS/MD with current MDCN registration\nMinimum 5 years clinical experience'} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Text label="Application email" hint="Optional — defaults to the FXMed contact address" value={form.apply_email} onChange={(value) => set('apply_email', value)} type="email" maxLength={254} placeholder="careers@fxmed.ng" />
            <label className="block font-dm-sans text-sm font-bold text-green-deep">
              Sort order <span className="font-normal text-gray-400">(lower shows first)</span>
              <input type="number" value={form.sort_order} onChange={(event) => set('sort_order', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-green-deep/15 px-4 py-3 font-normal outline-none focus:border-green-mid" />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-green-deep/15 px-5 py-3 font-dm-sans text-sm font-bold text-green-deep">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-full bg-green-deep px-6 py-3 font-dm-sans text-sm font-bold text-white disabled:opacity-50">
              {saving ? 'Saving…' : opening ? 'Save changes' : 'Create opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Text({ label, value, onChange, hint, required, type = 'text', maxLength, placeholder }: { label: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; type?: string; maxLength?: number; placeholder?: string }) {
  return (
    <label className="block font-dm-sans text-sm font-bold text-green-deep">
      {label} {hint && <span className="font-normal text-gray-400">{hint}</span>}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-green-deep/15 px-4 py-3 font-normal outline-none focus:border-green-mid" />
    </label>
  )
}

function Area({ label, value, onChange, hint, required, rows = 4, maxLength, placeholder }: { label: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; rows?: number; maxLength?: number; placeholder?: string }) {
  return (
    <label className="block font-dm-sans text-sm font-bold text-green-deep">
      {label} {hint && <span className="font-normal text-gray-400">— {hint}</span>}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={rows} maxLength={maxLength} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-green-deep/15 px-4 py-3 font-normal outline-none focus:border-green-mid" />
    </label>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return (
    <label className="block font-dm-sans text-sm font-bold text-green-deep">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-green-deep/15 px-4 py-3 font-normal outline-none focus:border-green-mid">
        {options.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
      </select>
    </label>
  )
}
