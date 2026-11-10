'use client'

import { useState } from 'react'
import type { AdminRole } from '@/lib/admin-auth'
import type { HrArea } from '@/lib/hr'
import Recruiting from './Recruiting'
import People from './People'
import Performance from './Performance'

// One HR tab for every role. Admin manages everything; clinical and sales see
// their own records, their direct reports and interviews assigned to them.
// Each area component fetches its own data and enforces nothing client-side:
// the /api/admin/hr/* routes apply canHr from lib/hr.ts.
const sections: { id: HrArea; admin: string; staff: string; description: string }[] = [
  { id: 'people', admin: 'People & Onboarding', staff: 'My file & onboarding', description: 'Employee records, onboarding checklists, licences and documents' },
  { id: 'performance', admin: 'Performance, Leave & Pay', staff: 'Performance & leave', description: 'Probation reviews, goals, appraisals, leave, pay history and offboarding' },
  { id: 'recruiting', admin: 'Recruiting', staff: 'My interviews', description: 'Applications, pipeline, interviews, scorecards and offers' },
]

export default function HrWorkspace({ role }: { role: AdminRole }) {
  const [section, setSection] = useState<HrArea>(role === 'admin' ? 'recruiting' : 'people')
  const ordered = role === 'admin' ? [sections[2], sections[0], sections[1]] : sections
  return <div className="space-y-6">
    <nav aria-label="HR sections" className="flex flex-wrap gap-2 rounded-[20px] border border-green-deep/10 bg-white p-2 shadow-sm">
      {ordered.map((item) => <button key={item.id} onClick={() => setSection(item.id)} title={item.description} aria-current={section === item.id ? 'page' : undefined} className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${section === item.id ? 'bg-green-deep text-white' : 'text-green-deep hover:bg-green-50'}`}>{role === 'admin' ? item.admin : item.staff}</button>)}
    </nav>
    {section === 'recruiting' && <Recruiting role={role} />}
    {section === 'people' && <People role={role} />}
    {section === 'performance' && <Performance role={role} />}
  </div>
}
