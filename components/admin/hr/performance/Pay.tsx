'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { compensationReasons, displayName, formatNaira, hrDepartments, hrLevels, labelOf, payBases, type CompensationReason, type HrEmployee } from '@/lib/hr'
import { lagosDate } from '@/lib/follow-ups'
import { bandFor, currentCompensation, displayDate, type HrCompensation, type HrSalaryBand } from '@/lib/hr-performance'
import { Alert, Badge, Buttons, Card, Empty, Field, Modal, Stat, call, primaryButton, smallButton } from './ui'

// Own pay history on the employee file (self and admin only; the API never sends it to managers).
export function PayHistory({ rows }: { rows: HrCompensation[] }) {
  const current = currentCompensation(rows, lagosDate())
  return <Card title="Pay history" description="Effective-dated. Pay changes from the annual review take effect on 1 March.">
    {!rows.length ? <Empty>No pay records yet.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#fbfaf6] text-xs uppercase tracking-wide text-green-mid"><tr><th className="p-3">Effective</th><th className="p-3">Level</th><th className="p-3">Basic</th><th className="p-3">Housing</th><th className="p-3">Transport</th><th className="p-3">Other</th><th className="p-3">Monthly gross</th><th className="p-3">Reason</th></tr></thead>
      <tbody className="divide-y">{rows.map((row) => <tr key={row.id} className={row.id === current?.id ? 'bg-green-50/50' : ''}><td className="p-3 font-bold text-green-deep">{displayDate(row.effective_date)}{row.id === current?.id && <span className="ml-2"><Badge>Current</Badge></span>}</td><td className="p-3">{row.level || '—'}{row.band_code ? ` · ${row.band_code}` : ''}</td><td className="p-3">{formatNaira(row.basic_ngn)}</td><td className="p-3">{formatNaira(row.housing_ngn)}</td><td className="p-3">{formatNaira(row.transport_ngn)}</td><td className="p-3">{formatNaira(row.other_ngn)}</td><td className="p-3 font-bold">{formatNaira(row.monthly_gross_ngn)}{row.locum_session_rate_ngn ? <span className="block text-xs font-normal text-gray-500">{formatNaira(row.locum_session_rate_ngn)} per session</span> : null}</td><td className="p-3">{labelOf(compensationReasons, row.reason)}</td></tr>)}</tbody></table></div>}
  </Card>
}

type Data = { bands: HrSalaryBand[]; compensation: HrCompensation[]; employees: HrEmployee[] }
const emptyBand = { code: '', label: '', level: 'L2', department: 'Clinical', pay_basis: 'monthly', min_ngn: '', midpoint_ngn: '', max_ngn: '', effective_from: '', notes: '', confirmed: false }
const emptyPay = { effective_date: '', level: '', band_code: '', basic_ngn: '', housing_ngn: '', transport_ngn: '', other_ngn: '', locum_session_rate_ngn: '', reason: 'adjustment' as CompensationReason, notes: '' }

// Admin only: salary bands (placeholders until the MD and accountant confirm) and compensation.
export default function AdminPay() {
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [band, setBand] = useState<HrSalaryBand | 'new' | null>(null); const [pay, setPay] = useState<{ employee: HrEmployee; row: HrCompensation | null } | null>(null); const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(async () => { const result = await call<Data>('/pay'); if (result.ok) setData(result.data); else setError(result.data.error || 'Could not load pay.') }, [])
  useEffect(() => { load() }, [load])
  const today = lagosDate()
  const people = useMemo(() => (data?.employees || []).filter((employee) => employee.status !== 'exited').map((employee) => {
    const rows = (data?.compensation || []).filter((row) => row.employee_id === employee.id); const current = currentCompensation(rows, today)
    return { employee, rows, current, band: bandFor(data?.bands || [], current?.level || employee.level, employee.department, today) }
  }), [data, today])
  async function send(method: string, body: Record<string, unknown>, done: string) {
    setError(''); const result = await call('/pay', method, body); if (!result.ok) { setError(result.data.error || 'Could not save.'); return false }
    setNotice([done, ...(result.data.warnings || [])].join(' ')); await load(); return true
  }
  if (!data) return error ? <Alert>{error}</Alert> : <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading pay…</div>
  const placeholders = data.bands.filter((item) => !item.confirmed).length
  return <div className="space-y-6">
    {error && <Alert>{error}</Alert>}{notice && <Alert tone="info">{notice}</Alert>}
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Salary bands" value={data.bands.length} /><Stat label="Placeholder bands" value={placeholders} tone={placeholders ? 'warn' : undefined} /><Stat label="Staff without pay record" value={people.filter((item) => !item.current).length} tone={people.some((item) => !item.current) ? 'warn' : undefined} /></div>
    <Card title="Salary bands" description="Monthly gross by level and department. Placeholders until the founder and accountant confirm them; offers fall inside the band." action={<button onClick={() => setBand('new')} className={primaryButton}>+ Band</button>}>
      {!data.bands.length ? <Empty>No bands yet. Add the placeholder bands from compensation-and-payroll.md section 3.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#fbfaf6] text-xs uppercase tracking-wide text-green-mid"><tr><th className="p-3">Band</th><th className="p-3">Level</th><th className="p-3">Department</th><th className="p-3">Min</th><th className="p-3">Mid</th><th className="p-3">Max</th><th className="p-3">From</th><th className="p-3" /></tr></thead>
        <tbody className="divide-y">{data.bands.map((item) => <tr key={item.id}><td className="p-3"><span className="font-bold text-green-deep">{item.code}</span> {item.label} {!item.confirmed && <Badge tone="amber">To confirm</Badge>}{item.pay_basis !== 'monthly' && <span className="ml-1 text-xs text-gray-500">{labelOf(payBases, item.pay_basis)}</span>}</td><td className="p-3">{item.level || '—'}</td><td className="p-3">{item.department || 'All'}</td><td className="p-3">{formatNaira(item.min_ngn)}</td><td className="p-3">{formatNaira(item.midpoint_ngn)}</td><td className="p-3">{formatNaira(item.max_ngn)}</td><td className="p-3">{displayDate(item.effective_from)}</td><td className="p-3 text-right"><button onClick={() => setBand(item)} className={smallButton}>Edit</button></td></tr>)}</tbody></table></div>}
    </Card>
    <Card title="Compensation" description="Current pay per person and the full history. Only admin sees this; employees see their own history.">
      {!people.length ? <Empty>No employees yet.</Empty> : <div className="divide-y">{people.map(({ employee, rows, current, band: matched }) => {
        const outside = current && matched && matched.pay_basis === 'monthly' && (Number(current.monthly_gross_ngn) < Number(matched.min_ngn) || Number(current.monthly_gross_ngn) > Number(matched.max_ngn))
        return <div key={employee.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => setOpen(open === employee.id ? null : employee.id)} className="text-left"><p className="font-bold text-green-deep">{displayName(employee)} <span className="font-normal text-text-mid">· {employee.job_title} · {employee.level || 'No level'} · {employee.department}</span></p>
          <p className="mt-1 text-sm text-text-mid">{current ? <>{formatNaira(current.monthly_gross_ngn)} a month since {displayDate(current.effective_date)}{matched ? ` · band ${matched.code} ${formatNaira(matched.min_ngn)}–${formatNaira(matched.max_ngn)}` : ''}</> : 'No pay record'} {outside && <Badge tone="red">Outside band</Badge>}</p></button>
          <button onClick={() => setPay({ employee, row: null })} className={smallButton}>+ Pay change</button></div>
          {open === employee.id && <div className="mt-3 space-y-2">{rows.length ? rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fbfaf6] px-4 py-2 text-sm"><span>{displayDate(row.effective_date)} · {formatNaira(row.monthly_gross_ngn)} · {labelOf(compensationReasons, row.reason)}{row.notes ? ` · ${row.notes}` : ''}</span><button onClick={() => setPay({ employee, row })} className="text-xs font-bold text-green-mid">Correct</button></div>) : <p className="text-sm text-text-mid">No history.</p>}</div>}
        </div>
      })}</div>}
    </Card>
    {band && <BandEditor band={band === 'new' ? null : band} onClose={() => setBand(null)} onDelete={band !== 'new' ? async () => { if (!confirm('Delete this band?')) return; const result = await call(`/pay?band=${band.id}`, 'DELETE'); if (result.ok) { setBand(null); await load() } else setError(result.data.error || 'Could not delete.') } : undefined} onSave={async (form) => { const ok = await send(band === 'new' ? 'POST' : 'PATCH', { ...form, kind: 'band', ...(band === 'new' ? {} : { id: band.id }) }, 'Band saved.'); if (ok) setBand(null) }} />}
    {pay && <PayEditor employee={pay.employee} row={pay.row} bands={data.bands} onClose={() => setPay(null)} onSave={async (form) => { const ok = await send(pay.row ? 'PATCH' : 'POST', { ...form, ...(pay.row ? { id: pay.row.id } : { employee_id: pay.employee.id }) }, 'Pay saved.'); if (ok) setPay(null) }} />}
  </div>
}

function BandEditor({ band, onClose, onSave, onDelete }: { band: HrSalaryBand | null; onClose: () => void; onSave: (form: typeof emptyBand) => Promise<void>; onDelete?: () => void }) {
  const [form, setForm] = useState(band ? { code: band.code, label: band.label, level: band.level || '', department: band.department || '', pay_basis: band.pay_basis, min_ngn: String(band.min_ngn), midpoint_ngn: String(band.midpoint_ngn), max_ngn: String(band.max_ngn), effective_from: band.effective_from, notes: band.notes, confirmed: band.confirmed } : emptyBand)
  const [saving, setSaving] = useState(false); const set = (patch: Partial<typeof emptyBand>) => setForm((current) => ({ ...current, ...patch }))
  return <Modal title={band ? `Band ${band.code}` : 'New salary band'} eyebrow="Pay" onClose={onClose}><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false) }} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Code"><input required maxLength={20} value={form.code} onChange={(e) => set({ code: e.target.value })} placeholder="CL-L2" className="input" /></Field><Field label="Label"><input required maxLength={160} value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="Clinical officer" className="input" /></Field></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Level"><select value={form.level} onChange={(e) => set({ level: e.target.value })} className="input"><option value="">Any</option>{hrLevels.map((level) => <option key={level}>{level}</option>)}</select></Field><Field label="Department"><select value={form.department} onChange={(e) => set({ department: e.target.value })} className="input"><option value="">All</option>{hrDepartments.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Basis"><select value={form.pay_basis} onChange={(e) => set({ pay_basis: e.target.value })} className="input">{payBases.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Minimum ₦"><input required type="number" min="0" value={form.min_ngn} onChange={(e) => set({ min_ngn: e.target.value })} className="input" /></Field><Field label="Midpoint ₦" hint="blank = halfway"><input type="number" min="0" value={form.midpoint_ngn} onChange={(e) => set({ midpoint_ngn: e.target.value })} className="input" /></Field><Field label="Maximum ₦"><input required type="number" min="0" value={form.max_ngn} onChange={(e) => set({ max_ngn: e.target.value })} className="input" /></Field></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Effective from"><input type="date" value={form.effective_from} onChange={(e) => set({ effective_from: e.target.value })} className="input" /></Field><label className="flex items-end gap-2 pb-3 text-sm font-bold text-green-deep"><input type="checkbox" checked={form.confirmed} onChange={(e) => set({ confirmed: e.target.checked })} />Confirmed by founder and accountant</label></div>
    <Field label="Notes"><textarea rows={2} maxLength={2000} value={form.notes} onChange={(e) => set({ notes: e.target.value })} className="input" /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Save band" extra={onDelete ? <button type="button" onClick={onDelete} className="px-3 text-sm font-bold text-red-600">Delete</button> : undefined} /></form></Modal>
}

function PayEditor({ employee, row, bands, onClose, onSave }: { employee: HrEmployee; row: HrCompensation | null; bands: HrSalaryBand[]; onClose: () => void; onSave: (form: typeof emptyPay) => Promise<void> }) {
  const [form, setForm] = useState(row ? { effective_date: row.effective_date, level: row.level || '', band_code: row.band_code || '', basic_ngn: String(row.basic_ngn), housing_ngn: String(row.housing_ngn), transport_ngn: String(row.transport_ngn), other_ngn: String(row.other_ngn), locum_session_rate_ngn: row.locum_session_rate_ngn ? String(row.locum_session_rate_ngn) : '', reason: 'correction' as CompensationReason, notes: row.notes } : { ...emptyPay, level: employee.level || '' })
  const [saving, setSaving] = useState(false); const set = (patch: Partial<typeof emptyPay>) => setForm((current) => ({ ...current, ...patch }))
  const gross = ['basic_ngn', 'housing_ngn', 'transport_ngn', 'other_ngn'].reduce((sum, key) => sum + (Number(form[key as keyof typeof form]) || 0), 0)
  // Placeholder split from compensation-and-payroll.md: basic 40, housing 30, transport 15, other 15.
  const split = (total: number) => set({ basic_ngn: String(Math.round(total * 0.4)), housing_ngn: String(Math.round(total * 0.3)), transport_ngn: String(Math.round(total * 0.15)), other_ngn: String(total - Math.round(total * 0.4) - Math.round(total * 0.3) - Math.round(total * 0.15)) })
  const band = bandFor(bands, (form.level || null) as HrEmployee['level'], employee.department, form.effective_date || lagosDate())
  return <Modal title={row ? 'Correct pay record' : 'Pay change'} eyebrow={displayName(employee)} onClose={onClose}><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave({ ...form, band_code: form.band_code || band?.code || '' }); setSaving(false) }} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Effective date"><input required type="date" value={form.effective_date} onChange={(e) => set({ effective_date: e.target.value })} className="input" /></Field><Field label="Level"><select value={form.level} onChange={(e) => set({ level: e.target.value })} className="input"><option value="">—</option>{hrLevels.map((level) => <option key={level}>{level}</option>)}</select></Field><Field label="Reason"><select value={form.reason} onChange={(e) => set({ reason: e.target.value as CompensationReason })} className="input">{compensationReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field></div>
    {band && <p className="text-xs text-text-mid">Band {band.code}: {formatNaira(band.min_ngn)} – {formatNaira(band.max_ngn)} (mid {formatNaira(band.midpoint_ngn)}){band.confirmed ? '' : ', placeholder'}.</p>}
    <div className="flex items-end gap-2"><Field label="Monthly gross ₦" hint="splits 40/30/15/15"><input type="number" min="0" placeholder="Enter a gross to split" onBlur={(e) => { const value = Number(e.target.value); if (value > 0) split(value) }} className="input" /></Field></div>
    <div className="grid gap-4 sm:grid-cols-4">{(['basic_ngn', 'housing_ngn', 'transport_ngn', 'other_ngn'] as const).map((key) => <Field key={key} label={{ basic_ngn: 'Basic', housing_ngn: 'Housing', transport_ngn: 'Transport', other_ngn: 'Other' }[key]}><input type="number" min="0" value={form[key]} onChange={(e) => set({ [key]: e.target.value })} className="input" /></Field>)}</div>
    <p className="text-sm font-bold text-green-deep">Monthly gross {formatNaira(gross)}</p>
    {employee.employment_type === 'Locum' && <Field label="Locum session rate ₦"><input type="number" min="0" value={form.locum_session_rate_ngn} onChange={(e) => set({ locum_session_rate_ngn: e.target.value })} className="input" /></Field>}
    <Field label="Notes"><textarea rows={2} maxLength={2000} value={form.notes} onChange={(e) => set({ notes: e.target.value })} className="input" /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Save" /></form></Modal>
}
