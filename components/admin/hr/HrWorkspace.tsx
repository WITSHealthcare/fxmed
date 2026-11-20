'use client'

import { useSearchParams } from 'next/navigation'
import type { AdminRole } from '@/lib/admin-auth'
import type { HrArea } from '@/lib/hr'
import { defaultHrArea } from '@/lib/admin-subnav'
import Recruiting from './Recruiting'
import People from './People'
import Performance from './Performance'

// One HR area for every role. Admin manages everything; clinical and sales see
// their own records, their direct reports and interviews assigned to them.
// Each area component fetches its own data and enforces nothing client-side:
// the /api/admin/hr/* routes apply canHr from lib/hr.ts.
// The open area (?area=recruiting|people|performance) is chosen in the sidebar.
const areas: HrArea[] = ['recruiting', 'people', 'performance']

export default function HrWorkspace({ role }: { role: AdminRole }) {
  const requested = useSearchParams().get('area') as HrArea | null
  const section = requested && areas.includes(requested) ? requested : defaultHrArea(role)
  return <div className="space-y-6">
    {section === 'recruiting' && <Recruiting role={role} />}
    {section === 'people' && <People role={role} />}
    {section === 'performance' && <Performance role={role} />}
  </div>
}
