'use client'

import { useCallback, useEffect, useState } from 'react'
import { credentialStatuses, credentialTypes, labelOf } from '@/lib/hr'
import { credentialStatusTone, type HrCredentialView } from '@/lib/hr-people'
import { expiryText } from './Credentials'
import { Alert, Badge, Card, Empty, buttonSecondary, call, formatDay, peopleApi } from './ui'

// Monthly licence report for the MD (employee-records.md 4.2): every clinical
// staff member, each practising licence and indemnity, status and expiry.
type Row = { employee: { id: string; name: string; job_title: string; status: string; employment_type: string }; credentials: HrCredentialView[]; cleared: boolean }

export default function LicenceReport({ onOpen }: { onOpen: (id: string) => void }) {
  const [report, setReport] = useState<{ generated_on: string; rows: Row[] } | null>(null); const [error, setError] = useState('')
  const load = useCallback(async () => { setError(''); try { setReport(await call(`${peopleApi}/credentials`)) } catch (err) { setError((err as Error).message) } }, [])
  useEffect(() => { load() }, [load])
  function download() {
    if (!report) return
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const lines = [['Staff', 'Job title', 'Employment type', 'Cleared for clinical work', 'Credential', 'Number', 'Status', 'Expires', 'Days left', 'Verified'].map(cell).join(',')]
    for (const row of report.rows) for (const c of row.credentials.length ? row.credentials : [null]) lines.push([row.employee.name, row.employee.job_title, row.employee.employment_type, row.cleared ? 'Yes' : 'No', c ? labelOf(credentialTypes, c.credential_type) : 'None on file', c?.licence_number || c?.registration_number, c ? labelOf(credentialStatuses, c.status) : '', c?.expires_on, c?.days_to_expiry, c?.verified_at?.slice(0, 10)].map(cell).join(','))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = `fxmed-licence-report-${report.generated_on.slice(0, 7)}.csv`; link.click(); URL.revokeObjectURL(url)
  }
  const blocked = report?.rows.filter((r) => !r.cleared).length || 0
  return <div className="space-y-4"><Alert>{error}</Alert>
    <Card title="Monthly licence report" description={report ? `For the MD on the first working day of the month. As of ${formatDay(report.generated_on)}. ${blocked} of ${report.rows.length} not cleared for clinical work.` : 'Loading…'} action={<div className="flex gap-2"><button onClick={() => window.print()} className={buttonSecondary}>Print</button><button disabled={!report} onClick={download} className={buttonSecondary}>Download CSV</button></div>}>
      {!report ? <Empty>Loading…</Empty> : !report.rows.length ? <Empty>No clinical staff on file.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#fbfaf6] text-xs uppercase tracking-wide text-green-mid"><tr><th className="px-6 py-3">Staff</th><th className="px-3 py-3">Credential</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Expiry</th><th className="px-6 py-3">Clinical work</th></tr></thead>
        <tbody className="divide-y">{report.rows.map((row) => <tr key={row.employee.id} className="align-top"><td className="px-6 py-3"><button onClick={() => onOpen(row.employee.id)} className="text-left font-bold text-green-deep hover:underline">{row.employee.name}</button><p className="text-xs text-gray-500">{row.employee.job_title} · {row.employee.employment_type}</p></td>
          <td className="px-3 py-3">{row.credentials.length ? row.credentials.map((c) => <p key={c.id} className="py-0.5">{labelOf(credentialTypes, c.credential_type)}</p>) : <p className="text-red-600">None on file</p>}</td>
          <td className="px-3 py-3">{row.credentials.map((c) => <p key={c.id} className="py-0.5"><Badge tone={credentialStatusTone[c.status]}>{labelOf(credentialStatuses, c.status)}</Badge></p>)}</td>
          <td className="px-3 py-3 text-xs">{row.credentials.map((c) => <p key={c.id} className="py-1">{expiryText(c)}</p>)}</td>
          <td className="px-6 py-3">{row.cleared ? <Badge>Cleared</Badge> : <Badge tone="bg-red-50 text-red-700">Off rota until verified</Badge>}</td></tr>)}</tbody></table></div>}
    </Card></div>
}
