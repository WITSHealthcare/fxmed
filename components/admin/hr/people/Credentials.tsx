'use client'

import { useState } from 'react'
import { credentialReminderDays, credentialStatuses, credentialTypes, labelOf, practisingCredentialTypes, type CredentialType } from '@/lib/hr'
import { credentialStatusTone, credentialVerificationMethods, hrDocumentMimeTypes, type HrCredentialView } from '@/lib/hr-people'
import { Badge, Empty, Field, Modal, buttonPrimary, buttonSecondary, call, formatDay, peopleApi } from './ui'

const api = `${peopleApi}/credentials`

export function expiryText(credential: Pick<HrCredentialView, 'expires_on' | 'days_to_expiry'>) {
  if (!credential.expires_on || credential.days_to_expiry === null) return 'No expiry'
  const days = credential.days_to_expiry
  return days < 0 ? `Expired ${formatDay(credential.expires_on)} (${-days} days ago)` : days === 0 ? 'Expires today' : `Expires ${formatDay(credential.expires_on)} (${days} days)`
}
// The tightest reminder already raised, e.g. "30-day reminder raised".
export function lastReminder(credential: HrCredentialView) {
  const raised = credentialReminderDays.filter((days) => credential[`reminder_${days}_sent_at`])
  return raised.length ? `${raised[raised.length - 1]}-day reminder raised` : ''
}

export default function Credentials({ employeeId, credentials, admin, canSubmit, onChange, onError }: { employeeId: string; credentials: HrCredentialView[]; admin: boolean; canSubmit: boolean; onChange: () => void; onError: (message: string) => void }) {
  const [form, setForm] = useState<{ credential?: HrCredentialView; renew?: HrCredentialView } | null>(null); const [busy, setBusy] = useState(false)
  async function run(body: Record<string, unknown>) { setBusy(true); onError(''); try { await call(api, 'PATCH', body); onChange() } catch (error) { onError((error as Error).message) } setBusy(false) }
  const shown = admin ? credentials : credentials.filter((c) => c.status !== 'superseded')
  return <div>
    {!shown.length ? <Empty>No licences or credentials recorded.</Empty> : <div className="divide-y">{shown.map((c) => <div key={c.id} className={`flex flex-wrap items-start justify-between gap-3 px-6 py-4 ${c.status === 'superseded' ? 'opacity-60' : ''}`}>
      <div className="min-w-[240px] flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-green-deep">{labelOf(credentialTypes, c.credential_type)}</p><Badge tone={credentialStatusTone[c.status]}>{labelOf(credentialStatuses, c.status)}</Badge>{c.renewal_pending && <Badge tone="bg-blue-50 text-blue-700">Renewal submitted</Badge>}</div>
        <p className="mt-1 text-sm text-text-mid">{[c.issuing_body, c.registration_number && `Reg. ${c.registration_number}`, c.licence_number && `Licence ${c.licence_number}`].filter(Boolean).join(' · ') || '—'}</p>
        <p className="mt-1 text-xs text-gray-500">{expiryText(c)}{c.verified_at ? ` · verified ${formatDay(c.verified_at)} by ${c.verification_method}` : ''}{lastReminder(c) ? ` · ${lastReminder(c)}` : ''}{c.cpd_points_required ? ` · ${c.cpd_points_required} CPD points` : ''}</p>
        {c.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-text-mid">{c.notes}</p>}</div>
      <div className="flex flex-wrap gap-2">
        {canSubmit && !admin && c.status !== 'superseded' && !c.renewal_pending && c.status !== 'pending_verification' && <button onClick={() => setForm({ renew: c })} className={buttonSecondary}>Submit renewal</button>}
        {admin && <>{['pending_verification', 'failed', 'suspended'].includes(c.status) && <button disabled={busy} onClick={() => { const method = prompt(`How was it verified? e.g. ${credentialVerificationMethods.join(', ')}`, credentialVerificationMethods[0]); if (method) run({ id: c.id, action: 'verify', verification_method: method }) }} className={buttonSecondary}>Verify</button>}
          {c.status !== 'superseded' && <><button onClick={() => setForm({ credential: c })} className={buttonSecondary}>Edit</button>
            {c.status !== 'suspended' && <button disabled={busy} onClick={() => { const note = prompt('Reason for suspending (council sanction, lapsed cover):'); if (note) run({ id: c.id, action: 'suspend', notes: note }) }} className="px-2 text-xs font-bold text-red-600">Suspend</button>}
            {c.status === 'pending_verification' && <button disabled={busy} onClick={() => { const note = prompt('Why did verification fail?'); if (note) run({ id: c.id, action: 'fail', notes: note }) }} className="px-2 text-xs font-bold text-red-600">Failed</button>}</>}</>}
      </div></div>)}</div>}
    {canSubmit && <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-[#fbfaf6] px-6 py-4"><p className="text-xs text-text-mid">{admin ? 'New entries start as pending verification. Verify with the council every time, not just from the certificate.' : 'Upload your renewed licence or cover; People Ops verifies it with the council.'}</p><button onClick={() => setForm({})} className={buttonPrimary}>+ Add credential</button></div>}
    {form && <CredentialForm employeeId={employeeId} admin={admin} credential={form.credential} renew={form.renew} onClose={() => setForm(null)} onSaved={() => { setForm(null); onChange() }} />}
  </div>
}

function CredentialForm({ employeeId, admin, credential, renew, onClose, onSaved }: { employeeId: string; admin: boolean; credential?: HrCredentialView; renew?: HrCredentialView; onClose: () => void; onSaved: () => void }) {
  const base = credential || renew
  const [values, setValues] = useState({ credential_type: (base?.credential_type || 'MDCN') as CredentialType, issuing_body: base?.issuing_body || '', registration_number: base?.registration_number || '', licence_number: credential?.licence_number || '', issued_on: credential?.issued_on || '', expires_on: credential?.expires_on || '', cpd_points_required: credential?.cpd_points_required?.toString() || '', notes: credential?.notes || '' })
  const [file, setFile] = useState<File | null>(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) => setValues({ ...values, [key]: e.target.value })
  const practising = practisingCredentialTypes.includes(values.credential_type)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (credential) await call(api, 'PATCH', { id: credential.id, ...values })
      else { const form = new FormData(); Object.entries(values).forEach(([k, v]) => form.set(k, v)); if (admin) form.set('employee_id', employeeId); if (renew) form.set('supersedes_id', renew.id); if (file) form.set('file', file); await call(api, 'POST', form) }
      onSaved()
    } catch (err) { setError((err as Error).message) }
    setSaving(false)
  }
  return <Modal title={credential ? 'Edit credential' : renew ? 'Submit renewal' : 'Add credential'} eyebrow="Licences and checks" onClose={onClose}><form onSubmit={save} className="space-y-4">
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Type"><select disabled={!!renew} value={values.credential_type} onChange={set('credential_type')} className="input">{credentialTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
      <Field label="Issuing body"><input maxLength={160} value={values.issuing_body} onChange={set('issuing_body')} className="input" placeholder="e.g. MDCN, insurer" /></Field>
      <Field label="Registration number"><input maxLength={80} value={values.registration_number} onChange={set('registration_number')} className="input" /></Field>
      <Field label={values.credential_type === 'indemnity' ? 'Policy number' : 'Licence number'}><input maxLength={80} value={values.licence_number} onChange={set('licence_number')} className="input" /></Field>
      <Field label="Issued on"><input type="date" value={values.issued_on} onChange={set('issued_on')} className="input" /></Field>
      <Field label="Expires on" hint={practising ? 'as printed on the licence' : undefined}><input type="date" required={practising} value={values.expires_on} onChange={set('expires_on')} className="input" /></Field>
      <Field label="CPD points required" hint="optional"><input type="number" min="0" value={values.cpd_points_required} onChange={set('cpd_points_required')} className="input" /></Field>
      {!credential && <Field label="Copy of licence or certificate" hint="up to 15 MB"><input type="file" accept={hrDocumentMimeTypes.join(',')} onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" /></Field>}</div>
    <Field label="Notes"><textarea rows={2} maxLength={2000} value={values.notes} onChange={set('notes')} className="input" /></Field>
    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className={buttonPrimary}>{saving ? 'Saving…' : credential ? 'Save' : 'Submit for verification'}</button></div>
  </form></Modal>
}
