'use client'

import { useState } from 'react'
import { uuidPattern } from '@/lib/training'
import type { AdminRole } from '@/lib/admin-auth'
import ProgramManager from './training/ProgramManager'
import StaffLearning from './training/StaffLearning'
import Tracking from './training/Tracking'

type View = 'manage' | 'tracking' | 'learn'
const views: { id: View; label: string }[] = [{ id: 'manage', label: 'Courses' }, { id: 'tracking', label: 'Tracking' }, { id: 'learn', label: 'My learning' }]

// Admins build courses, track learners and take training themselves; every
// other role sees their own learning.
export default function Training({ role }: { role: AdminRole }) {
  // A shared staff link (/admin?tab=training&course=<id>) opens that course in "My learning".
  const [courseId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const id = new URLSearchParams(window.location.search).get('course') || ''
    return uuidPattern.test(id) ? id : ''
  })
  const [view, setView] = useState<View>(courseId ? 'learn' : 'manage')
  if (role !== 'admin') return <StaffLearning initialCourseId={courseId} />
  return <div className="space-y-6">
    <div role="tablist" aria-label="Training views" className="flex flex-wrap gap-2">
      {views.map((item) => <button key={item.id} role="tab" aria-selected={view === item.id} onClick={() => setView(item.id)} className={`rounded-full px-5 py-2 text-sm font-bold ${view === item.id ? 'bg-green-deep text-white' : 'border bg-white text-green-deep'}`}>{item.label}</button>)}
    </div>
    {view === 'manage' ? <ProgramManager /> : view === 'tracking' ? <Tracking /> : <StaffLearning initialCourseId={courseId} />}
  </div>
}
