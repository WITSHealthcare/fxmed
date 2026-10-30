'use client'

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { IdentificationCardIcon, PlusIcon, ShieldCheckIcon, ShieldWarningIcon, XIcon } from '@phosphor-icons/react'
import { Alert, Empty, Field, Loading, Panel, Status, fullName } from '@/components/admin/emr/ui'
import {
  coverageExpired, coverageNeedsVerification, coverageSchemes, membershipTypes, optionLabel,
  verificationMethods, verificationOutcomes,
} from '@/lib/coverage'
import { lagosDate } from '@/lib/follow-ups'

const api = '/api/admin/emr/coverage'
const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
const dayTime = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })

type Row = Record<string, any>
export type CoverageData = { coverage: Row[]; verifications: Row[] }
export type CoverageState = { data: CoverageData | null; error: string; reload: () => Promise<void> }

// Loaded once by the patient record and shared by the banner, the Coverage
// tab and the referral form.
export function useCoverage(patientId: string): CoverageState {
  const [data, setData] = useState<CoverageData | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    const response = await fetch(`${api}?patientId=${patientId}`)
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setData(result); setError('') } else { setData({ coverage: [], verifications: [] }); setError(result.error || 'Coverage could not be loaded.') }
  }, [patientId])
  useEffect(() => { reload() }, [reload])
  return { data, error, reload }
}

export function schemeName(coverage: Row) {
  return coverage.scheme_name || optionLabel(coverageSchemes, coverage.scheme)
}

function verificationTone(coverage: Row) {
  if (coverageExpired(coverage) || coverage.verification_status === 'not_eligible') return 'bg-red-50 text-red-700'
  if (coverageNeedsVerification(coverage)) return 'bg-amber-50 text-amber-800'
  return 'bg-emerald-50 text-emerald-700'
}

function verificationText(coverage: Row) {
  if (coverage.status !== 'active') return 'Inactive'
  if (coverageExpired(coverage)) return `Cover ended ${day.format(new Date(`${coverage.coverage_end}T00:00:00`))}`
  if (!coverage.last_verified_at) return 'Never verified'
  const when = lagosDate(coverage.last_verified_at) === lagosDate() ? 'today' : `on ${day.format(new Date(coverage.last_verified_at))}`
  return `${optionLabel(verificationOutcomes, coverage.verification_status).split(' —')[0]} ${when}`
}

// Shown above the patient record when an insured patient's eligibility has not
// been confirmed today, since insured services are given only after a check.
export function CoverageBanner({ state, onOpen }: { state: CoverageState; onOpen: () => void }) {
  const due = (state.data?.coverage || []).filter(item => coverageNeedsVerification(item))
  if (!due.length) return null
  const refused = due.some(item => item.verification_status === 'not_eligible' || coverageExpired(item))
  return <button type="button" onClick={onOpen} className={`flex w-full items-center gap-3 rounded-[18px] border p-4 text-left ${refused ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
    <ShieldWarningIcon size={24} weight="fill" className={refused ? 'text-red-700' : 'text-amber-700'} />
    <span className="min-w-0 flex-1 text-sm"><span className={`font-bold ${refused ? 'text-red-800' : 'text-amber-900'}`}>{refused ? 'Insurance cover problem' : 'Verify insurance eligibility before giving insured services'}</span><span className="block text-text-mid">{due.map(item => `${schemeName(item)} · ${item.enrollee_id} · ${verificationText(item)}`).join(' — ')}</span></span>
    <span className="secondary shrink-0">Open coverage</span>
  </button>
}

export function CoveragePanel({ patient, state }: { patient: Row; state: CoverageState }) {
  const [modal, setModal] = useState<{ kind: 'add' } | { kind: 'edit' | 'verify'; coverage: Row } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { data, reload } = state

  async function setStatus(coverage: Row, status: string) {
    if (status === 'inactive' && !window.confirm('Mark this cover inactive? It will no longer be offered for referrals or flagged for verification.')) return
    setBusy(coverage.id); setError('')
    const response = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: coverage.id, status }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.error || 'The coverage could not be updated.'); else await reload()
    setBusy(null)
  }

  return <Panel title="Insurance coverage" subtitle="NHIA, state scheme and HMO cover, and every eligibility check made on it." action={<button onClick={() => setModal({ kind: 'add' })} className="primary"><PlusIcon size={18} weight="bold" />Add coverage</button>}>
    {(state.error || error) && <Alert tone="error">{state.error || error}</Alert>}
    {!data ? <Loading /> : <div className="mt-6 space-y-4">
      {data.coverage.map(coverage => {
        const checks = data.verifications.filter(item => item.coverage_id === coverage.id)
        return <article key={coverage.id} className="rounded-[18px] border border-green-deep/10 bg-[#FCFFF0] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-green-deep text-gold"><IdentificationCardIcon size={22} weight="fill" /></span><div className="min-w-0"><p className="font-bold">{schemeName(coverage)}</p><p className="mt-1 font-mono text-sm text-text-dark">{coverage.enrollee_id}</p><p className="mt-1 text-xs text-text-mid">{[coverage.scheme_name && optionLabel(coverageSchemes, coverage.scheme), coverage.hmo_name, optionLabel(membershipTypes, coverage.membership_type), coverage.principal_enrollee_id && `Principal ${coverage.principal_enrollee_id}`].filter(Boolean).join(' · ')}</p></div></div>
            <div className="flex flex-col items-end gap-2">{coverage.status === 'active' ? <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${verificationTone(coverage)}`}>{verificationText(coverage)}</span> : <Status value="inactive" />}</div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Item label="Registered facility" value={coverage.primary_facility} />
            <Item label="Benefit package" value={coverage.benefit_package} />
            <Item label="Cover period" value={[coverage.coverage_start && day.format(new Date(`${coverage.coverage_start}T00:00:00`)), coverage.coverage_end && day.format(new Date(`${coverage.coverage_end}T00:00:00`))].filter(Boolean).join(' – ')} />
          </dl>
          {coverage.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-text-mid">{coverage.notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {coverage.status === 'active' && <button onClick={() => setModal({ kind: 'verify', coverage })} className="primary"><ShieldCheckIcon size={18} weight="duotone" />Record eligibility check</button>}
            <button onClick={() => setModal({ kind: 'edit', coverage })} className="secondary">Edit</button>
            <button disabled={busy === coverage.id} onClick={() => setStatus(coverage, coverage.status === 'active' ? 'inactive' : 'active')} className="secondary disabled:opacity-50">{coverage.status === 'active' ? 'Mark inactive' : 'Reactivate'}</button>
          </div>
          {checks.length > 0 && <details className="mt-4 border-t border-green-deep/10 pt-3"><summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-green-mid">Eligibility checks · {checks.length}</summary><ol className="mt-3 space-y-2">{checks.map(check => <li key={check.id} className="rounded-[12px] bg-white p-3 text-sm"><p className="font-semibold">{optionLabel(verificationOutcomes, check.outcome)} · {optionLabel(verificationMethods, check.method)}</p><p className="mt-0.5 text-xs text-text-mid">{dayTime.format(new Date(check.verified_at))}{check.reference ? ` · Ref ${check.reference}` : ''}</p>{check.notes && <p className="mt-1 whitespace-pre-wrap text-text-mid">{check.notes}</p>}</li>)}</ol></details>}
        </article>
      })}
      {!data.coverage.length && <Empty text="No insurance cover recorded. Self-paying patients need none." />}
    </div>}
    {modal?.kind === 'add' && <CoverageForm patient={patient} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload() }} />}
    {modal?.kind === 'edit' && <CoverageForm patient={patient} coverage={modal.coverage} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload() }} />}
    {modal?.kind === 'verify' && <VerifyForm patient={patient} coverage={modal.coverage} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload() }} />}
  </Panel>
}

function Item({ label: text, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-text-mid/55">{text}</dt><dd className="mt-1 font-semibold">{value || 'Not recorded'}</dd></div>
}

export function Modal({ eyebrow, title, subtitle, onClose, children }: { eyebrow: string; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[26px] bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-green-deep/10 bg-white px-6 py-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-mid">{eyebrow}</p><h3 className="mt-1 text-2xl font-bold">{title}</h3>{subtitle && <p className="mt-1 text-sm text-text-mid">{subtitle}</p>}</div>
        <button type="button" onClick={onClose} aria-label="Close" className="icon-button shrink-0"><XIcon /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
}

function CoverageForm({ patient, coverage, onClose, onSaved }: { patient: Row; coverage?: Row; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Row>(() => ({ scheme: '', scheme_name: '', enrollee_id: '', hmo_name: '', primary_facility: '', benefit_package: '', membership_type: 'principal', principal_enrollee_id: '', coverage_start: '', coverage_end: '', notes: '', ...Object.fromEntries(Object.entries(coverage || {}).map(([key, value]) => [key, value ?? ''])) }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field: string) => (event: { target: { value: string } }) => setForm(current => ({ ...current, [field]: event.target.value }))

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const fields = ['scheme','scheme_name','enrollee_id','hmo_name','primary_facility','benefit_package','membership_type','principal_enrollee_id','coverage_start','coverage_end','notes']
    const payload = Object.fromEntries(fields.map(field => [field, form[field]]))
    const response = await fetch(api, { method: coverage ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coverage ? { id: coverage.id, ...payload } : { patient_id: patient.id, ...payload }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setError(result.error || 'The coverage could not be saved.'); return }
    onSaved()
  }

  return <Modal eyebrow="Insurance coverage" title={coverage ? 'Edit coverage' : 'Add coverage'} subtitle={`${patient.mrn} · ${fullName(patient)}`} onClose={onClose}>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Scheme" required><select className="input" required value={form.scheme} onChange={set('scheme')}><option value="">Select…</option>{coverageSchemes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="Scheme or plan name"><input className="input" value={form.scheme_name} onChange={set('scheme_name')} placeholder="For example: Ilera Eko" /></Field>
      <Field label="Enrollee number" required><input className="input font-mono" required value={form.enrollee_id} onChange={set('enrollee_id')} placeholder="As printed on the enrollee card" /></Field>
      <Field label="HMO"><input className="input" value={form.hmo_name} onChange={set('hmo_name')} placeholder="The HMO managing this cover" /></Field>
      <Field label="Membership" required><select className="input" required value={form.membership_type} onChange={set('membership_type')}>{membershipTypes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      {form.membership_type !== 'principal' && <Field label="Principal’s enrollee number" required><input className="input font-mono" required value={form.principal_enrollee_id} onChange={set('principal_enrollee_id')} /></Field>}
      <Field label="Registered primary care facility" wide><input className="input" value={form.primary_facility} onChange={set('primary_facility')} placeholder="The facility the enrollee chose at registration" /></Field>
      <Field label="Benefit package"><input className="input" value={form.benefit_package} onChange={set('benefit_package')} placeholder="For example: BHCPF minimum package" /></Field>
      <span className="hidden sm:block" />
      <Field label="Cover starts"><input className="input" type="date" value={form.coverage_start} onChange={set('coverage_start')} /></Field>
      <Field label="Cover ends"><input className="input" type="date" value={form.coverage_end} onChange={set('coverage_end')} /></Field>
      <Field label="Notes" wide><textarea className="input min-h-20" value={form.notes} onChange={set('notes')} /></Field>
      {coverage && <p className="text-xs text-text-mid sm:col-span-2">Changing the scheme or enrollee number clears the last eligibility check, so the new details are verified before use.</p>}
      {error && <div className="sm:col-span-2"><Alert tone="error">{error}</Alert></div>}
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onClose} className="secondary">Cancel</button><button disabled={saving} className="primary disabled:opacity-50">{saving ? 'Saving…' : coverage ? 'Save coverage' : 'Add coverage'}</button></div>
    </form>
  </Modal>
}

function VerifyForm({ patient, coverage, onClose, onSaved }: { patient: Row; coverage: Row; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ outcome: '', method: '', reference: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm(current => ({ ...current, [field]: event.target.value }))

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', coverage_id: coverage.id, ...form }) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setError(result.error || 'The check could not be recorded.'); return }
    onSaved()
  }

  return <Modal eyebrow="Eligibility check" title="Record eligibility check" subtitle={`${fullName(patient)} · ${schemeName(coverage)} · ${coverage.enrollee_id}`} onClose={onClose}>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <p className="rounded-[14px] bg-[#FCFFF0] p-4 text-sm leading-6 text-text-mid sm:col-span-2">Confirm the patient’s identity against their enrollee card and photo ID, then check eligibility with {coverage.hmo_name || 'the HMO or scheme'}. Each check is kept permanently and cannot be edited.</p>
      <Field label="Result" required><select className="input" required value={form.outcome} onChange={set('outcome')}><option value="">Select…</option>{verificationOutcomes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="How it was checked" required><select className="input" required value={form.method} onChange={set('method')}><option value="">Select…</option>{verificationMethods.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="Reference"><input className="input" value={form.reference} onChange={set('reference')} placeholder="Verification or call reference, if given" /></Field>
      <span className="hidden sm:block" />
      <Field label={form.outcome && form.outcome !== 'verified' ? 'What the HMO or scheme said' : 'Notes'} required={Boolean(form.outcome) && form.outcome !== 'verified'} wide><textarea className="input min-h-20" required={Boolean(form.outcome) && form.outcome !== 'verified'} value={form.notes} onChange={set('notes')} /></Field>
      {error && <div className="sm:col-span-2"><Alert tone="error">{error}</Alert></div>}
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onClose} className="secondary">Cancel</button><button disabled={saving} className="primary disabled:opacity-50">{saving ? 'Saving…' : 'Record check'}</button></div>
    </form>
  </Modal>
}

