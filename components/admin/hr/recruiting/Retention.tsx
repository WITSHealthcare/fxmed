'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert, Empty, Section, Stat, api, call, primary, showDate, showTime } from './ui'

type Preview = { today: string; candidates: { id: string; full_name: string; retention_delete_after: string }[]; talentPoolExpired: { id: string; full_name: string; talent_pool_expires_at: string }[]; healthDocuments: { id: string; title: string; document_type: string }[]; log: { id: number; run_at: string; entity_type: string; record_id: string; action: string; retention_rule: string }[] }

// Candidate data retention (NDPA): run monthly; review the deletion log.
export default function Retention() {
  const [preview, setPreview] = useState<Preview | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [result, setResult] = useState('')
  const load = useCallback(async () => { const { ok, data } = await call<Preview>(`${api}/retention`); ok ? setPreview(data) : setError(data.error || 'Could not load retention.') }, [])
  useEffect(() => { load() }, [load])
  async function run() {
    if (!confirm('Run candidate retention now? Past-date candidates are anonymised and their files deleted; this cannot be undone.')) return
    setBusy(true); setError(''); const { ok, data } = await call<{ anonymised: number; healthDocumentsDeleted: number; talentPoolEnded: number; skipped: number }>(`${api}/retention`, 'POST'); setBusy(false)
    if (!ok) return setError(data.error || 'Retention run failed.')
    setResult(`${data.anonymised} candidate(s) anonymised, ${data.healthDocumentsDeleted} health document(s) deleted, ${data.talentPoolEnded} talent-pool consent(s) ended${data.skipped ? `, ${data.skipped} skipped (open or hired)` : ''}.`); await load()
  }
  if (!preview) return error ? <Alert>{error}</Alert> : <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading retention…</div>
  return <><Alert>{error}</Alert>
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Past retention date" value={preview.candidates.length} tone={preview.candidates.length ? 'warn' : undefined} /><Stat label="Talent pool expired" value={preview.talentPoolExpired.length} /><Stat label="Health data to delete" value={preview.healthDocuments.length} tone={preview.healthDocuments.length ? 'warn' : undefined} /></div>
    <Section title="Candidate retention" description="Unsuccessful candidates: 12 months after the role closes. Talent pool: up to 24 months, only with consent renewed every 12. Health data of candidates not hired: deleted within 30 days. Target: none past date at month end." action={<button disabled={busy} onClick={run} className={primary}>{busy ? 'Running…' : 'Run retention now'}</button>}>
      {result && <p className="border-b bg-green-50 px-6 py-3 text-sm text-green-800">{result}</p>}
      {!preview.candidates.length ? <Empty>No candidate records are past their retention date.</Empty> : <ul className="divide-y text-sm">{preview.candidates.map((item) => <li key={item.id} className="flex justify-between px-6 py-3"><span className="font-bold text-green-deep">{item.full_name}</span><span className="text-text-mid">due {showDate(item.retention_delete_after)}</span></li>)}</ul>}
    </Section>
    <Section title="Deletion log" description="Review each run. Hired candidates' evidence is moved to the employee file, not deleted.">
      {!preview.log.length ? <Empty>No retention actions yet.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Rule</th></tr></thead><tbody className="divide-y">{preview.log.map((row) => <tr key={row.id}><td className="px-4 py-2 text-xs">{showTime(row.run_at)}</td><td className="px-4 py-2 text-xs">{row.entity_type.replace('hr_', '')} {row.record_id.slice(0, 8)}</td><td className="px-4 py-2 text-xs">{row.action.replace(/_/g, ' ')}</td><td className="px-4 py-2 text-xs text-text-mid">{row.retention_rule}</td></tr>)}</tbody></table></div>}
    </Section>
  </>
}
