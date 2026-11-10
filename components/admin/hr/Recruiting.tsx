'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AdminRole } from '@/lib/admin-auth'
import type { HrRequisition, HrScorecardTemplate } from '@/lib/hr-recruiting'
import type { Staff } from './recruiting/ApplicationDetail'
import MyInterviews from './recruiting/MyInterviews'
import Pipeline, { type Opening, type PipelineRow } from './recruiting/Pipeline'
import Requisitions from './recruiting/Requisitions'
import Retention from './recruiting/Retention'
import Templates from './recruiting/Templates'
import { Alert, api, call } from './recruiting/ui'

// Applicant tracking (docs/hr/recruiting-process.md). Admin runs the
// pipeline; everyone else sees only "My interviews".
type View = 'pipeline' | 'requisitions' | 'templates' | 'retention' | 'mine'
const views: { id: View; label: string }[] = [{ id: 'pipeline', label: 'Pipeline' }, { id: 'requisitions', label: 'Requisitions' }, { id: 'templates', label: 'Scorecards' }, { id: 'retention', label: 'Retention' }, { id: 'mine', label: 'My interviews' }]
type Overview = { applications: PipelineRow[]; openings: Opening[]; templates: HrScorecardTemplate[]; requisitions: HrRequisition[]; requisitionsReady: boolean; staff: Staff[]; today: string }

export default function Recruiting({ role }: { role: AdminRole }) {
  if (role !== 'admin') return <MyInterviews />
  return <RecruitingAdmin />
}

function RecruitingAdmin() {
  const [view, setView] = useState<View>('pipeline'); const [data, setData] = useState<Overview | null>(null); const [error, setError] = useState('')
  const load = useCallback(async () => { const result = await call<Overview>(api); result.ok ? (setData(result.data), setError('')) : setError(result.data.error || 'Could not load recruiting.') }, [])
  useEffect(() => { load() }, [load])
  return <div className="space-y-6">
    <nav aria-label="Recruiting" className="flex flex-wrap gap-2">{views.map((item) => <button key={item.id} onClick={() => setView(item.id)} aria-current={view === item.id ? 'page' : undefined} className={`rounded-full px-4 py-2 text-xs font-bold ${view === item.id ? 'bg-green-mid text-white' : 'border bg-white text-green-deep'}`}>{item.label}</button>)}</nav>
    <Alert>{error}</Alert>
    {view === 'mine' ? <MyInterviews admin /> : view === 'retention' ? <Retention /> : !data ? !error && <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading recruiting…</div>
      : view === 'pipeline' ? <Pipeline applications={data.applications} openings={data.openings} staff={data.staff} today={data.today} reload={load} />
      : view === 'requisitions' ? <Requisitions requisitions={data.requisitions} ready={data.requisitionsReady} openings={data.openings} staff={data.staff} reload={load} />
      : <Templates templates={data.templates} reload={load} />}
  </div>
}
