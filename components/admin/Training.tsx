'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { uuidPattern } from '@/lib/training'
import type { AdminRole } from '@/lib/admin-auth'
import ProgramManager from './training/ProgramManager'
import StaffLearning from './training/StaffLearning'
import Tracking from './training/Tracking'
import { Tabs } from '@/components/admin/ui/SectionNav'

type View = 'manage' | 'tracking' | 'learn'
const views: { id: View; label: string }[] = [{ id: 'manage', label: 'Courses' }, { id: 'tracking', label: 'Tracking' }, { id: 'learn', label: 'My learning' }]

// Admins build courses, track learners and take training themselves; every
// other role sees their own learning.
export default function Training({ role }: { role: AdminRole }) {
  // A shared staff link (/admin/people/training?course=<id>) opens that course in "My learning".
  const requestedCourse = useSearchParams().get('course') || ''
  const courseId = uuidPattern.test(requestedCourse) ? requestedCourse : ''
  const [view, setView] = useState<View>(courseId ? 'learn' : 'manage')
  if (role !== 'admin') return <StaffLearning initialCourseId={courseId} />
  return <div className="space-y-6">
    <Tabs label="Training sections" items={views} value={view} onChange={setView} />
    {view === 'manage' ? <ProgramManager /> : view === 'tracking' ? <Tracking /> : <StaffLearning initialCourseId={courseId} />}
  </div>
}
