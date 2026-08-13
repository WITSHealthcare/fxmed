'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AmbassadorApplications from './AmbassadorApplications'
import {
  ambassadorAccountStatuses,
  formatPortalLabel,
  membershipTiers,
  payoutStatuses,
  referralStatuses,
  tierCommissionDefaults,
} from '@/lib/ambassador-portal'

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

type ManagementData = { ambassadors: any[]; referrals: any[]; payouts: any[]; announcements: any[]; resources: any[] }

export default function AmbassadorProgram() {
  const [tab, setTab] = useState<'applications' | 'ambassadors' | 'referrals' | 'payouts' | 'content'>('applications')
  const [data, setData] = useState<ManagementData>({ ambassadors: [], referrals: [], payouts: [], announcements: [], resources: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedReferral, setSelectedReferral] = useState<any | null>(null)
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const response = await fetch('/api/admin/ambassador-portal')
    const result = await response.json().catch(() => ({}))
    if (response.ok) setData(result)
    else if (response.status !== 500 || !String(result.error).includes('load ambassador')) setError(result.error || 'Failed to load portal management.')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const totals = useMemo(() => ({
    active: data.ambassadors.filter((item) => item.status === 'active').length,
    converted: data.referrals.filter((item) => item.status === 'converted').length,
    due: data.referrals.filter((item) => ['pending', 'approved'].includes(item.commission_status)).reduce((sum, item) => sum + Number(item.commission_amount), 0),
  }), [data])

  async function update(entity: string, id: string, updates: Record<string, unknown>) {
    setError('')
    const response = await fetch('/api/admin/ambassador-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, id, ...updates }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Update failed.'); return false }
    await load(); return true
  }

  async function schedulePayout(referral: any) {
    if (!window.confirm(`Schedule a ${money.format(Number(referral.commission_amount))} payout for this referral?`)) return
    const response = await fetch('/api/admin/ambassador-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ referral_id: referral.id }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.error || 'Could not schedule payout.')
    else await load()
  }

  async function createContent(entity: 'announcement' | 'resource', payload: Record<string, unknown>) {
    setError('')
    const response = await fetch('/api/admin/ambassador-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, ...payload }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not publish content.'); return false }
    await load(); return true
  }

  async function deleteContent(entity: 'announcement' | 'resource', id: string) {
    if (!window.confirm('Delete this item from the Ambassador Portal?')) return
    const response = await fetch(`/api/admin/ambassador-portal?entity=${entity}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.error || 'Could not delete content.')
    else await load()
  }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Active ambassadors" value={String(totals.active)} /><Stat label="Successful referrals" value={String(totals.converted)} /><Stat label="Commission pending / due" value={money.format(totals.due)} /></div>
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-green-deep/10 bg-white p-2 shadow-sm">{[
      ['applications','Applications'], ['ambassadors','Ambassadors'], ['referrals','Referrals'], ['payouts','Payouts'], ['content','Content'],
    ].map(([id, label]) => <button key={id} onClick={() => setTab(id as typeof tab)} className={`shrink-0 rounded-xl px-5 py-3 font-dm-sans text-sm font-bold ${tab === id ? 'bg-green-deep text-white' : 'text-text-mid hover:bg-green-50'}`}>{label}</button>)}</div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-dm-sans text-sm text-red-700">{error}</div>}
    {tab === 'applications' && <AmbassadorApplications onPortalChanged={load} />}
    {tab === 'ambassadors' && <Panel title="FXMed Ambassadors" subtitle="Review portal access and the bank account supplied by each ambassador." loading={loading}><Table headers={['Ambassador','Code','Payout account','Joined','Referrals','Account status']} rows={data.ambassadors.map((item) => {
      const application = item.application || {}; const count = data.referrals.filter((referral) => referral.ambassador_id === item.id).length
      return [<div key="name"><p className="font-bold">{application.first_name} {application.last_name}</p><p className="text-xs text-gray-500">{application.email}</p></div>, item.ambassador_code, <BankAccount key="bank" ambassador={item} />, date.format(new Date(item.created_at)), String(count), <select key="status" value={item.status} onChange={(e) => update('ambassador', item.id, { status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">{ambassadorAccountStatuses.map((status) => <option key={status} value={status}>{formatPortalLabel(status)}</option>)}</select>]
    })} /></Panel>}
    {tab === 'referrals' && <Panel title="Referral pipeline" subtitle="Update client progress, membership details, and commission status." loading={loading}><Table headers={['Client','Ambassador','Submitted','Status','Commission','Action']} rows={data.referrals.map((item) => { const app = item.ambassador?.application || {}; return [<div key="client"><p className="font-bold">{item.first_name} {item.last_name}</p><p className="text-xs text-gray-500">{item.email}</p></div>, `${app.first_name || ''} ${app.last_name || ''}`, date.format(new Date(item.created_at)), formatPortalLabel(item.status), money.format(Number(item.commission_amount)), <div key="actions" className="flex gap-2"><button onClick={() => setSelectedReferral(item)} className="rounded-lg border border-green-deep/20 px-3 py-2 text-xs font-bold text-green-deep">Manage</button>{item.status === 'converted' && item.commission_status !== 'paid' && <button onClick={() => schedulePayout(item)} className="rounded-lg bg-gold px-3 py-2 text-xs font-bold">Schedule payout</button>}</div>] })} /></Panel>}
    {tab === 'payouts' && <Panel title="Payout history" subtitle="Use the supplied bank account to make each transfer, then record its status, reference, and proof." loading={loading}><Table headers={['Ambassador','Payout account','Referral','Amount','Created','Status','Payment details']} rows={data.payouts.map((item) => { const app = item.ambassador?.application || {}; return [<div key="ambassador"><p className="font-bold">{app.first_name || ''} {app.last_name || ''}</p><p className="text-xs text-gray-500">{item.ambassador?.ambassador_code}</p></div>, <BankAccount key="bank" ambassador={item.ambassador} />, item.referral ? `${item.referral.first_name} ${item.referral.last_name}` : 'General payout', money.format(Number(item.amount)), date.format(new Date(item.created_at)), <PayoutStatusBadge key="status" status={item.status} />, <div key="details" className="min-w-36"><p className="text-xs text-gray-600">{item.payment_reference || 'No reference added'}</p>{item.proof_url && <a href={item.proof_url} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-bold text-green-mid">View proof</a>}<button type="button" onClick={() => setSelectedPayout(item)} className="mt-2 rounded-lg border border-green-deep/20 px-3 py-1.5 text-xs font-bold text-green-deep hover:bg-green-deep hover:text-white">Manage payout</button></div>] })} /></Panel>}
    {tab === 'content' && <PortalContent data={data} onCreate={createContent} onDelete={deleteContent} />}
    {selectedReferral && <ReferralEditor referral={selectedReferral} onClose={() => setSelectedReferral(null)} onSave={async (updates) => { if (await update('referral', selectedReferral.id, updates)) setSelectedReferral(null) }} />}
    {selectedPayout && <PayoutEditor payout={selectedPayout} onClose={() => setSelectedPayout(null)} onSave={async (updates) => { if (await update('payout', selectedPayout.id, updates)) setSelectedPayout(null) }} />}
  </div>
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-green-deep/10 bg-white p-5 shadow-sm"><p className="font-dm-sans text-xs font-bold uppercase tracking-wide text-text-mid">{label}</p><p className="mt-2 font-dm-sans text-2xl font-bold text-green-deep">{value}</p></div> }
function Panel({ title, subtitle, loading, children }: { title: string; subtitle: string; loading: boolean; children: React.ReactNode }) { return <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-lg"><div className="border-b p-6"><h3 className="font-dm-sans text-2xl font-bold text-green-deep">{title}</h3><p className="mt-1 font-dm-sans text-sm text-text-mid">{subtitle}</p></div>{loading ? <div className="p-16 text-center text-text-mid">Loading…</div> : children}</section> }
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) { if (!rows.length) return <div className="p-16 text-center font-dm-sans text-text-mid">No records yet.</div>; return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left font-dm-sans text-sm"><thead><tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">{headers.map((item) => <th key={item} className="px-5 py-3">{item}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-gray-100">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-5 py-4 text-gray-700">{cell}</td>)}</tr>)}</tbody></table></div> }

function PayoutStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-50 text-blue-700',
    paid: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
  }
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{formatPortalLabel(status)}</span>
}

function BankAccount({ ambassador }: { ambassador?: any }) {
  const bank = ambassador?.bank_name?.trim()
  const accountName = ambassador?.bank_account_name?.trim()
  const accountNumber = ambassador?.bank_account_number?.trim()
  const complete = Boolean(bank && accountName && accountNumber)

  async function copyAccount() {
    if (!complete) return
    await navigator.clipboard.writeText(`${bank}\n${accountName}\n${accountNumber}`)
  }

  if (!complete) return <div className="min-w-48 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-xs font-bold text-amber-700">Bank details missing</p><p className="mt-1 text-[11px] leading-4 text-amber-600">Ask the ambassador to complete their Profile.</p></div>

  return <div className="min-w-48"><p className="font-bold text-green-deep">{bank}</p><p className="mt-0.5 text-xs text-gray-600">{accountName}</p><div className="mt-1 flex items-center gap-2"><code className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-800">{accountNumber}</code><button type="button" onClick={copyAccount} className="text-[11px] font-bold text-green-mid hover:underline" title="Copy bank, account name, and account number">Copy</button></div></div>
}

function ReferralEditor({ referral, onClose, onSave }: { referral: any; onClose: () => void; onSave: (updates: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({ status: referral.status, membership_tier: referral.membership_tier || '', membership_amount: referral.membership_amount || 0, commission_rate: referral.commission_rate || 0, commission_amount: referral.commission_amount || 0, commission_status: referral.commission_status, admin_feedback: referral.admin_feedback || '' })
  function changeTier(tier: string) { const defaults = tier ? tierCommissionDefaults[tier as keyof typeof tierCommissionDefaults] : { rate: 0, membershipAmount: 0, commissionAmount: 0 }; setForm({ ...form, membership_tier: tier, membership_amount: defaults.membershipAmount, commission_rate: defaults.rate, commission_amount: defaults.commissionAmount }) }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-7"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase text-green-mid">Manage referral</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{referral.first_name} {referral.last_name}</h3><p className="mt-1 text-sm text-text-mid">{referral.email} · {referral.phone}</p>{referral.notes && <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-text-mid">{referral.notes}</p>}</div><button onClick={onClose} className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><Select label="Referral status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={referralStatuses} /><Select label="Membership tier" value={form.membership_tier} onChange={changeTier} options={membershipTiers} optional /><NumberInput label="Annual membership amount" value={form.membership_amount} onChange={(value) => setForm({ ...form, membership_amount: value })} /><NumberInput label="Commission rate (%)" value={form.commission_rate} onChange={(value) => setForm({ ...form, commission_rate: value })} /><NumberInput label="Commission amount" value={form.commission_amount} onChange={(value) => setForm({ ...form, commission_amount: value })} /><Select label="Commission status" value={form.commission_status} onChange={(value) => setForm({ ...form, commission_status: value })} options={['not_earned','pending','approved','paid']} /><label className="sm:col-span-2 text-sm font-bold">Feedback visible to ambassador<textarea value={form.admin_feedback} onChange={(e) => setForm({ ...form, admin_feedback: e.target.value })} rows={4} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label></div><button onClick={() => onSave(form)} className="mt-7 rounded-full bg-green-deep px-6 py-3 font-bold text-white">Save referral update</button></div></div>
}
function Select({ label, value, onChange, options, optional = false }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; optional?: boolean }) { return <label className="text-sm font-bold">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal">{optional && <option value="">Not assigned</option>}{options.map((item) => <option key={item} value={item}>{formatPortalLabel(item)}</option>)}</select></label> }
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-sm font-bold">{label}<input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label> }

function PayoutEditor({ payout, onClose, onSave }: { payout: any; onClose: () => void; onSave: (updates: Record<string, unknown>) => Promise<void> | void }) {
  const [form, setForm] = useState({
    status: payout.status,
    payment_reference: payout.payment_reference || '',
    proof_url: payout.proof_url || '',
  })
  const [saving, setSaving] = useState(false)
  const application = payout.ambassador?.application || {}

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-labelledby="payout-editor-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Manage payout</p><h3 id="payout-editor-title" className="mt-1 text-2xl font-bold text-green-deep">{application.first_name} {application.last_name}</h3><p className="mt-1 text-sm text-text-mid">{money.format(Number(payout.amount))} · {payout.referral ? `${payout.referral.first_name} ${payout.referral.last_name}` : 'General payout'}</p></div><button type="button" onClick={onClose} aria-label="Close payout editor" className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div><div className="mt-5 rounded-xl bg-gray-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pay to</p><BankAccount ambassador={payout.ambassador} /></div><form onSubmit={submit} className="mt-6 space-y-5"><Select label="Payment status" value={form.status} onChange={(status) => setForm({ ...form, status })} options={payoutStatuses} /><label className="block text-sm font-bold text-green-deep">Payment reference <span className="font-normal text-gray-400">(optional)</span><input value={form.payment_reference} onChange={(event) => setForm({ ...form, payment_reference: event.target.value })} maxLength={160} placeholder="Transfer reference or transaction ID" className="mt-2 w-full rounded-xl border border-green-deep/15 px-4 py-3 font-normal outline-none focus:border-green-mid" /></label><label className="block text-sm font-bold text-green-deep">Payment proof URL <span className="font-normal text-gray-400">(optional)</span><input type="url" value={form.proof_url} onChange={(event) => setForm({ ...form, proof_url: event.target.value })} placeholder="https://…" className="mt-2 w-full rounded-xl border border-green-deep/15 px-4 py-3 font-normal outline-none focus:border-green-mid" /></label><div className="flex flex-wrap justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-full border border-green-deep/15 px-5 py-3 text-sm font-bold text-green-deep">Cancel</button><button type="submit" disabled={saving} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save payout'}</button></div></form></div></div>
}

function PortalContent({ data, onCreate, onDelete }: { data: ManagementData; onCreate: (entity: 'announcement' | 'resource', payload: Record<string, unknown>) => Promise<boolean>; onDelete: (entity: 'announcement' | 'resource', id: string) => void }) {
  const [announcement, setAnnouncement] = useState({ title: '', body: '' })
  const [resource, setResource] = useState({ title: '', description: '', resource_url: '' })
  return <div className="grid gap-6 xl:grid-cols-2">
    <section className="rounded-[20px] border border-green-deep/10 bg-white p-6 shadow-lg"><h3 className="text-xl font-bold text-green-deep">Announcements</h3><form className="mt-5 space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await onCreate('announcement', announcement)) setAnnouncement({ title: '', body: '' }) }}><input required value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} placeholder="Announcement title" className="w-full rounded-xl border px-4 py-3 text-sm" /><textarea required value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} placeholder="Message for all ambassadors" rows={4} className="w-full rounded-xl border px-4 py-3 text-sm" /><button className="rounded-full bg-green-deep px-5 py-3 text-sm font-bold text-white">Publish announcement</button></form><div className="mt-6 space-y-3">{data.announcements.map((item) => <div key={item.id} className="rounded-xl bg-gray-50 p-4"><div className="flex justify-between gap-4"><div><p className="font-bold">{item.title}</p><p className="mt-1 line-clamp-2 text-sm text-text-mid">{item.body}</p></div><button onClick={() => onDelete('announcement', item.id)} className="text-xs font-bold text-red-600">Delete</button></div></div>)}</div></section>
    <section className="rounded-[20px] border border-green-deep/10 bg-white p-6 shadow-lg"><h3 className="text-xl font-bold text-green-deep">Resources</h3><form className="mt-5 space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await onCreate('resource', resource)) setResource({ title: '', description: '', resource_url: '' }) }}><input required value={resource.title} onChange={(e) => setResource({ ...resource, title: e.target.value })} placeholder="Resource title" className="w-full rounded-xl border px-4 py-3 text-sm" /><input required type="url" value={resource.resource_url} onChange={(e) => setResource({ ...resource, resource_url: e.target.value })} placeholder="https://…" className="w-full rounded-xl border px-4 py-3 text-sm" /><textarea value={resource.description} onChange={(e) => setResource({ ...resource, description: e.target.value })} placeholder="Short description (optional)" rows={3} className="w-full rounded-xl border px-4 py-3 text-sm" /><button className="rounded-full bg-green-deep px-5 py-3 text-sm font-bold text-white">Add resource</button></form><div className="mt-6 space-y-3">{data.resources.map((item) => <div key={item.id} className="rounded-xl bg-gray-50 p-4"><div className="flex justify-between gap-4"><div><p className="font-bold">{item.title}</p><a href={item.resource_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-green-mid">{item.resource_url}</a></div><button onClick={() => onDelete('resource', item.id)} className="text-xs font-bold text-red-600">Delete</button></div></div>)}</div></section>
  </div>
}
