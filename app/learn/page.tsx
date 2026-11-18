'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LearnerShell from '@/components/training/LearnerShell'
import type { TrainingProgram } from '@/lib/training'

// The external learner's home: enrolled courses, progress and certificates.
export default function LearnerHome() {
  const router = useRouter()
  const [data, setData] = useState<{ account: { full_name: string }; programs: TrainingProgram[] } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('/api/learn').then(async (response) => {
      if (response.status === 403) return router.replace('/learn/login')
      const result = await response.json().catch(() => ({}))
      if (response.ok) setData(result); else setError(result.error || 'Could not load your courses.')
    })
  }, [router])

  return <LearnerShell name={data?.account.full_name}>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <h1 className="text-3xl font-bold text-green-deep">{data ? `Welcome, ${data.account.full_name.split(' ')[0]}` : 'My courses'}</h1>
    {!data ? <div className="mt-8 h-40 animate-pulse rounded-[20px] bg-white" /> : !data.programs.length
      ? <div className="mt-8 rounded-[20px] border bg-white p-14 text-center"><h2 className="text-xl font-bold text-green-deep">You’re not enrolled in any courses yet</h2><p className="mt-2 text-text-mid">Browse the catalogue, preview a course, and enrol.</p><Link href="/courses" className="mt-5 inline-block rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white">Browse courses</Link></div>
      : <div className="mt-8 grid gap-5 md:grid-cols-2">{data.programs.map((program) => {
        const percent = program.progress_percent || 0
        return <div key={program.id} className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm">
          {program.cover_image_url && <img src={program.cover_image_url} alt="" className="h-36 w-full object-cover" />}
          <div className="p-5">
            <h2 className="text-lg font-bold text-green-deep">{program.title}</h2>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} /></div>
            <p className="mt-2 text-xs font-bold text-green-mid">{percent}% complete</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/learn/${program.slug}`} className="rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white">{percent === 100 ? 'Review' : percent ? 'Continue' : 'Start'}</Link>
              {program.enrolment?.certificate_id && percent === 100 && <a href={`/api/training/certificates/${program.enrolment.certificate_id}`} className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-green-deep">Certificate</a>}
            </div>
          </div>
        </div>
      })}</div>}
  </LearnerShell>
}
