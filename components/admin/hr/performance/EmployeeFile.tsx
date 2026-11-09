'use client'

import { useCallback, useEffect, useState } from 'react'
import { displayName, employeeStatuses, labelOf, type HrEmployee } from '@/lib/hr'
import { displayDate, type HrPublicHoliday, type PerformanceFile } from '@/lib/hr-performance'
import Goals from './Goals'
import Holidays from './Holidays'
import Leave from './Leave'
import { OffboardingSummary } from './Offboarding'
import { PayHistory } from './Pay'
import Plans from './Plans'
import Reviews from './Reviews'
import { Alert, Badge, call, nameOf } from './ui'

type Tab = 'reviews' | 'goals' | 'leave' | 'pay' | 'leaving'

// One person's performance file. The API decides what is included (pay only
// for self and admin, sick reasons only for self and admin).
export default function EmployeeFile({ employeeId, employees, holidays, onBack, reloadOverview }: { employeeId: string | null; employees: HrEmployee[]; holidays: HrPublicHoliday[]; onBack?: () => void; reloadOverview: () => Promise<void> }) {
  const [file, setFile] = useState<PerformanceFile | null>(null); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [tab, setTab] = useState<Tab>('reviews'); const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const result = await call<PerformanceFile>(`/employee${employeeId ? `?id=${employeeId}` : ''}`)
    if (result.ok) { setFile(result.data); setError('') } else setError(result.data.error || 'Could not load the file.')
    setLoading(false)
  }, [employeeId])
  useEffect(() => { load() }, [load])
  const reload = useCallback(async () => { await load(); await reloadOverview() }, [load, reloadOverview])
  const report = (message: string) => { setNotice(''); setError(message) }; const inform = (message: string) => { setError(''); setNotice(message) }
  if (loading) return <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading…</div>
  if (!file) return <div className="space-y-4">{onBack && <button onClick={onBack} className="text-sm font-bold text-green-mid">← All people</button>}<div className="rounded-[20px] border bg-white p-12 text-center"><h3 className="text-xl font-bold text-green-deep">Performance & leave</h3><p className="mt-2 text-text-mid">{error}</p></div></div>
  const { employee, access } = file
  const tabs: [Tab, string][] = [['reviews', 'Reviews'], ['goals', 'Goals & plans'], ['leave', 'Leave'], ...(access.seesPay ? [['pay', 'Pay'] as [Tab, string]] : []), ...(file.offboarding ? [['leaving', 'Leaving'] as [Tab, string]] : [])]
  return <div className="space-y-5">
    {onBack && <button onClick={onBack} className="text-sm font-bold text-green-mid">← All people</button>}
    <section className="rounded-[20px] border border-green-deep/10 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{access.isSelf ? 'My performance' : access.isManager ? 'Direct report' : 'Employee'}</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{displayName(employee)}</h3>
      <p className="mt-1 text-sm text-text-mid">{employee.job_title} · {employee.department}{employee.level ? ` · ${employee.level}` : ''} · {employee.employment_type}{employee.line_manager_id && nameOf(employees, employee.line_manager_id) !== '—' ? ` · reports to ${nameOf(employees, employee.line_manager_id)}` : ''}</p>
      <p className="mt-1 text-xs text-gray-500">Started {displayDate(employee.start_date)}{employee.probation_end_date && !employee.confirmed_at ? ` · probation ends ${displayDate(employee.probation_end_date)}` : ''}{employee.confirmed_at ? ` · confirmed ${displayDate(employee.confirmed_at)}` : ''}{employee.end_date ? ` · left ${displayDate(employee.end_date)}` : ''}</p></div>
      <Badge tone={employee.status === 'exited' ? 'gray' : ['notice', 'suspended', 'probation_extended'].includes(employee.status) ? 'amber' : 'green'}>{labelOf(employeeStatuses, employee.status)}</Badge></div>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Performance file sections">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={`rounded-full px-4 py-2 text-xs font-bold ${tab === id ? 'bg-green-deep text-white' : 'border text-green-deep hover:bg-green-50'}`}>{label}</button>)}</nav>
    </section>
    {error && <Alert>{error}</Alert>}{notice && <Alert tone="info">{notice}</Alert>}
    {tab === 'reviews' && <Reviews file={file} reload={reload} onError={report} onNotice={inform} />}
    {tab === 'goals' && <div className="space-y-5"><Goals file={file} reload={reload} onError={report} onNotice={inform} /><Plans file={file} reload={reload} onError={report} onNotice={inform} /></div>}
    {tab === 'leave' && <div className="space-y-5"><Leave file={file} employees={employees} holidays={holidays} reload={reload} onError={report} onNotice={inform} />{!access.isAdmin && <Holidays holidays={holidays} year={file.year} isAdmin={false} reload={reload} onError={report} onNotice={inform} />}</div>}
    {tab === 'pay' && access.seesPay && <PayHistory rows={file.compensation} />}
    {tab === 'leaving' && file.offboarding && <OffboardingSummary record={file.offboarding} isSelf={access.isSelf} seesPay={access.seesPay} onChanged={reload} onError={report} />}
  </div>
}
