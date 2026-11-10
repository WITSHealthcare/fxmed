'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminRole } from '@/lib/admin-auth'
import { displayName, employeeStatuses, exitTypes, labelOf, leaveTypes, offboardingStatuses, reviewStatuses, reviewTypes, type EmployeeStatus, type ExitType, type HrEmployee, type LeaveType, type OffboardingStatus, type ReviewStatus, type ReviewType } from '@/lib/hr'
import { addDays, displayDate, type HrLeaveRequest, type HrPublicHoliday } from '@/lib/hr-performance'
import EmployeeFile from './performance/EmployeeFile'
import Holidays from './performance/Holidays'
import { DecideLeave } from './performance/Leave'
import AdminOffboarding from './performance/Offboarding'
import AdminPay from './performance/Pay'
import { Alert, Badge, Card, Empty, Stat, call, nameOf, smallButton, statusTone } from './performance/ui'

type PendingLeave = HrLeaveRequest & { can_decide: boolean }
type ReviewRow = { id: string; employee_id: string; review_type: ReviewType; review_year: number | null; scheduled_date: string | null; status: ReviewStatus; second_review_requested_at: string | null; second_review_outcome: string | null }
type Overview = {
  viewer: { role: AdminRole; employeeId: string | null; reportIds: string[] }; today: string; year: number; employees: HrEmployee[]; holidays: HrPublicHoliday[]
  pendingLeave: PendingLeave[]; upcomingLeave: Pick<HrLeaveRequest, 'id' | 'employee_id' | 'leave_type' | 'start_date' | 'end_date' | 'working_days' | 'status'>[]
  reviews: ReviewRow[]; offboarding: { id: string; employee_id: string; exit_type: ExitType; last_working_day: string | null; status: OffboardingStatus; portal_access_removed_at: string | null }[]
}
type View = 'overview' | 'people' | 'mine' | 'team' | 'leave' | 'pay' | 'offboarding'

// Performance, Leave & Pay. Admin (MD / People Ops) runs reviews, leave, pay and
// offboarding for everyone; staff see their own file and, as line managers,
// their direct reports' reviews, goals and leave (never pay).
export default function Performance({ role }: { role: AdminRole }) {
  const admin = role === 'admin'
  const [data, setData] = useState<Overview | null>(null); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [view, setView] = useState<View>(admin ? 'overview' : 'mine'); const [person, setPerson] = useState<string | null>(null); const [deciding, setDeciding] = useState<PendingLeave | null>(null)
  const load = useCallback(async () => { const result = await call<Overview>(''); if (result.ok) { setData(result.data); setError('') } else setError(result.data.error || 'Could not load performance.') }, [])
  useEffect(() => { load() }, [load])
  const open = (id: string) => { setPerson(id); setView(admin ? 'people' : 'team') }
  if (!data) return error ? <Alert>{error}</Alert> : <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading performance…</div>
  const reports = data.employees.filter((item) => data.viewer.reportIds.includes(item.id))
  const views: [View, string][] = admin ? [['overview', 'Overview'], ['people', 'People'], ['leave', 'Leave & holidays'], ['pay', 'Pay'], ['offboarding', 'Offboarding'], ...(data.viewer.employeeId ? [['mine', 'My file'] as [View, string]] : [])]
    : [['mine', 'My performance'], ...(reports.length ? [['team', `My team (${reports.length})`] as [View, string]] : [])]
  return <div className="space-y-6">
    <nav aria-label="Performance sections" className="flex flex-wrap gap-2">{views.map(([id, label]) => <button key={id} onClick={() => { setView(id); setPerson(null) }} aria-current={view === id ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-bold ${view === id ? 'bg-green-mid text-white' : 'border border-green-deep/15 bg-white text-green-deep hover:bg-green-50'}`}>{label}</button>)}</nav>
    {error && <Alert>{error}</Alert>}{notice && <Alert tone="info">{notice}</Alert>}
    {view === 'overview' && <AdminOverview data={data} onOpen={open} onDecide={setDeciding} />}
    {(view === 'people' || view === 'team') && (person ? <EmployeeFile key={person} employeeId={person} employees={data.employees} holidays={data.holidays} onBack={() => setPerson(null)} reloadOverview={load} />
      : <PeopleList data={data} people={view === 'team' ? reports : data.employees} onOpen={open} onDecide={setDeciding} team={view === 'team'} />)}
    {view === 'mine' && <EmployeeFile employeeId={null} employees={data.employees} holidays={data.holidays} reloadOverview={load} />}
    {view === 'leave' && admin && <AdminLeave data={data} onDecide={setDeciding} reload={load} onError={setError} onNotice={setNotice} />}
    {view === 'pay' && admin && <AdminPay />}
    {view === 'offboarding' && admin && <AdminOffboarding />}
    {deciding && <DecideLeave mode="decide" request={deciding} isAdmin={admin} employeeName={nameOf(data.employees, deciding.employee_id)} holidays={data.holidays} onClose={() => setDeciding(null)} onSave={async (body, done) => {
      const result = await call('/leave', 'PATCH', { ...body, id: deciding.id }); if (!result.ok) { setError(result.data.error || 'Could not save the decision.'); return false }
      setNotice(done); setDeciding(null); await load(); return true
    }} />}
  </div>
}

function LeaveQueue({ data, items, onDecide }: { data: Overview; items: PendingLeave[]; onDecide: (item: PendingLeave) => void }) {
  return <Card title="Leave awaiting a decision" description="Decide within 5 working days of the request.">
    {!items.length ? <Empty>Nothing waiting.</Empty> : <div className="divide-y">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div><p className="font-bold text-green-deep">{nameOf(data.employees, item.employee_id)} · {labelOf(leaveTypes, item.leave_type as LeaveType)} · {item.working_days} day(s)</p><p className="mt-1 text-xs text-gray-500">{displayDate(item.start_date)} – {displayDate(item.end_date)} · requested {displayDate(item.created_at)} · {item.approval_level === 'md' ? 'Managing Director' : 'Line manager'}</p></div>
      {item.can_decide ? <button onClick={() => onDecide(item)} className={smallButton}>Decide</button> : <Badge tone="gray">With the MD</Badge>}</div>)}</div>}
  </Card>
}

function OffSoon({ data }: { data: Overview }) {
  return <Card title="Off in the next 6 weeks" description="Approved leave, for planning cover of visits, consults and programme sessions.">
    {!data.upcomingLeave.length ? <Empty>No approved leave coming up.</Empty> : <div className="divide-y">{data.upcomingLeave.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-sm"><span className="font-bold text-green-deep">{nameOf(data.employees, item.employee_id)}</span><span className="text-text-mid">{labelOf(leaveTypes, item.leave_type)} · {displayDate(item.start_date)} – {displayDate(item.end_date)}</span></div>)}</div>}
  </Card>
}

function ReviewList({ data, rows, onOpen }: { data: Overview; rows: ReviewRow[]; onOpen: (id: string) => void }) {
  return <Card title="Reviews in progress" description="Probation check-ins, decisions and appraisals not yet final, oldest first.">
    {!rows.length ? <Empty>No open reviews.</Empty> : <div className="divide-y">{rows.slice(0, 40).map((row) => { const overdue = row.scheduled_date && row.scheduled_date < data.today && !row.second_review_requested_at
      return <button key={row.id} onClick={() => onOpen(row.employee_id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3 text-left text-sm hover:bg-[#fbfaf6]"><span><span className="font-bold text-green-deep">{nameOf(data.employees, row.employee_id)}</span> · {labelOf(reviewTypes, row.review_type)}{row.review_year && ['mid_year', 'annual'].includes(row.review_type) ? ` ${row.review_year}` : ''}</span>
        <span className="flex items-center gap-2 text-xs text-gray-500">{row.second_review_requested_at && !row.second_review_outcome ? <Badge tone="amber">Second review requested</Badge> : <>Due {displayDate(row.scheduled_date)}{overdue && <Badge tone="red">Overdue</Badge>}<Badge tone={statusTone(row.status)}>{labelOf(reviewStatuses, row.status)}</Badge></>}</span></button> })}</div>}
  </Card>
}

function AdminOverview({ data, onOpen, onDecide }: { data: Overview; onOpen: (id: string) => void; onDecide: (item: PendingLeave) => void }) {
  const probation = data.employees.filter((item) => ['probation', 'probation_extended'].includes(item.status))
  const dueSoon = probation.filter((item) => item.probation_end_date && item.probation_end_date <= addDays(data.today, 14))
  const lapsedAccess = data.offboarding.filter((item) => !item.portal_access_removed_at && item.last_working_day && item.last_working_day <= data.today)
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Leave to decide" value={data.pendingLeave.filter((item) => item.can_decide).length} tone={data.pendingLeave.length ? 'warn' : undefined} /><Stat label="On probation" value={probation.length} /><Stat label="Open reviews" value={data.reviews.length} /><Stat label="Leavers" value={data.offboarding.length} tone={lapsedAccess.length ? 'warn' : undefined} /></div>
    {lapsedAccess.length > 0 && <Alert>Portal access not recorded as removed for {lapsedAccess.map((item) => nameOf(data.employees, item.employee_id)).join(', ')} after their last working day. Deactivate in <a href="/admin?tab=users" className="font-bold underline">Users & Roles</a>, then record it in Offboarding.</Alert>}
    {dueSoon.length > 0 && <Card title="Probation ending soon" description="The written outcome goes to the employee within 5 working days of day 90."><div className="divide-y">{dueSoon.map((item) => <button key={item.id} onClick={() => onOpen(item.id)} className="flex w-full justify-between px-5 py-3 text-left text-sm hover:bg-[#fbfaf6]"><span className="font-bold text-green-deep">{displayName(item)}</span><span className="text-text-mid">ends {displayDate(item.probation_end_date)}</span></button>)}</div></Card>}
    <LeaveQueue data={data} items={data.pendingLeave} onDecide={onDecide} />
    <ReviewList data={data} rows={data.reviews} onOpen={onOpen} />
    <OffSoon data={data} />
    {data.offboarding.length > 0 && <Card title="Open offboarding cases"><div className="divide-y">{data.offboarding.map((item) => <div key={item.id} className="flex justify-between px-5 py-3 text-sm"><span className="font-bold text-green-deep">{nameOf(data.employees, item.employee_id)} <span className="font-normal text-text-mid">· {labelOf(exitTypes, item.exit_type)}</span></span><span className="text-text-mid">last day {displayDate(item.last_working_day)} · {labelOf(offboardingStatuses, item.status)}</span></div>)}</div></Card>}
  </div>
}

function PeopleList({ data, people, onOpen, onDecide, team }: { data: Overview; people: HrEmployee[]; onOpen: (id: string) => void; onDecide: (item: PendingLeave) => void; team: boolean }) {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState<'current' | 'all' | EmployeeStatus>('current')
  const shown = useMemo(() => people.filter((item) => (status === 'all' || (status === 'current' ? item.status !== 'exited' : item.status === status)) && `${item.legal_name} ${item.preferred_name || ''} ${item.job_title}`.toLowerCase().includes(query.toLowerCase())), [people, query, status])
  const ids = people.map((item) => item.id)
  return <div className="space-y-6">
    {team && <LeaveQueue data={data} items={data.pendingLeave.filter((item) => ids.includes(item.employee_id))} onDecide={onDecide} />}
    {team && <ReviewList data={data} rows={data.reviews.filter((row) => ids.includes(row.employee_id))} onOpen={onOpen} />}
    {team && <OffSoon data={{ ...data, upcomingLeave: data.upcomingLeave.filter((item) => ids.includes(item.employee_id)) }} />}
    <Card title={team ? 'My direct reports' : 'People'} description={team ? 'Reviews, goals and leave of the people you manage. Pay and private details are not shown to managers.' : 'Open a file for reviews, goals, leave and pay.'}
      action={<div className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search people" className="input w-44 py-2" />{!team && <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="input w-44 py-2"><option value="current">Current staff</option><option value="all">Everyone</option>{employeeStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}</div>}>
      {!shown.length ? <Empty>{people.length ? 'No one matches.' : 'No employee records yet. People Ops adds them under People & Onboarding.'}</Empty> : <div className="divide-y">{shown.map((item) => <button key={item.id} onClick={() => onOpen(item.id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fbfaf6]">
        <span><span className="font-bold text-green-deep">{displayName(item)}</span><span className="block text-xs text-gray-500">{item.job_title} · {item.department}{item.level ? ` · ${item.level}` : ''}{item.probation_end_date && ['probation', 'probation_extended'].includes(item.status) ? ` · probation ends ${displayDate(item.probation_end_date)}` : ''}</span></span>
        <Badge tone={item.status === 'exited' ? 'gray' : ['notice', 'suspended', 'probation_extended'].includes(item.status) ? 'amber' : 'green'}>{labelOf(employeeStatuses, item.status)}</Badge></button>)}</div>}
    </Card>
  </div>
}

function AdminLeave({ data, onDecide, reload, onError, onNotice }: { data: Overview; onDecide: (item: PendingLeave) => void; reload: () => Promise<void>; onError: (message: string) => void; onNotice: (message: string) => void }) {
  const [year, setYear] = useState(data.year); const [saving, setSaving] = useState(false)
  async function setup() {
    if (!confirm(`Create ${year} leave balances for every current employee? Existing balances are kept.`)) return
    setSaving(true); const result = await call<{ created: number }>('/leave/balances', 'POST', { year }); setSaving(false)
    if (!result.ok) onError(result.data.error || 'Could not set up balances.'); else { onNotice(`${result.data.created} balance(s) created for ${year}, with up to 5 annual days carried over to 31 March.`); await reload() }
  }
  return <div className="space-y-6">
    <LeaveQueue data={data} items={data.pendingLeave} onDecide={onDecide} />
    <OffSoon data={data} />
    <Card title="Leave year" description="1 January to 31 December. Sets default entitlements (annual 15, or 20 after 3 years; sick 12; compassionate 5; study 5; maternity 80; paternity 10), pro-rated for joiners and leavers, and carries up to 5 unused annual days. Adjust individual balances on each person's Leave tab."
      action={<div className="flex items-center gap-2"><select aria-label="Leave year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-28 py-2">{[data.year - 1, data.year, data.year + 1].map((item) => <option key={item}>{item}</option>)}</select><button disabled={saving} onClick={setup} className={smallButton}>{saving ? 'Setting up…' : 'Set up balances'}</button></div>}><p className="p-5 text-sm text-text-mid">Balances that have not been set up use the same defaults, so staff can request leave before this is run.</p></Card>
    <Holidays holidays={data.holidays} year={data.year} isAdmin reload={reload} onError={onError} onNotice={onNotice} />
  </div>
}
