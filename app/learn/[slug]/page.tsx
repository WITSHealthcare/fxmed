'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CoursePlayer from '@/components/training/CoursePlayer'
import LearnerShell from '@/components/training/LearnerShell'
import type { TrainingAnswer, TrainingProgram } from '@/lib/training'

// One enrolled course for an external learner. Paystack returns buyers here
// with ?reference=…, which is verified before the course loads.
export default function LearnerCourse({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_enrolled' | 'verifying'>('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const response = await fetch(`/api/learn/programs/${slug}`)
    if (response.status === 403) return router.replace(`/learn/login?next=${encodeURIComponent(`/courses/${slug}`)}`)
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not load this course.'); setStatus('not_enrolled'); return }
    if (result.enrolled) { setProgram(result.program); setStatus('ready') } else setStatus('not_enrolled')
  }, [router, slug])

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const reference = search.get('reference') || search.get('trxref')
    if (!reference) { load(); return }
    setStatus('verifying')
    fetch('/api/learn/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) }).then(async (response) => {
      if (!response.ok) setError((await response.json().catch(() => ({}))).error || 'We could not confirm the payment.')
      window.history.replaceState({}, document.title, window.location.pathname)
      await load()
    })
  }, [load])

  async function tick(lessonId: string, completed: boolean) {
    setError('')
    const response = await fetch(`/api/learn/programs/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId, completed }) })
    const result = await response.json().catch(() => ({}))
    if (response.ok) setProgram((current) => current && { ...current, ...result }); else setError(result.error || 'Could not save progress.')
  }
  async function submit(lessonId: string, answers: Record<string, TrainingAnswer>) {
    if (!program) return false
    setError('')
    const response = await fetch('/api/learn/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId: program.id, lessonId, answers }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not submit.'); return false }
    const { response: saved, ...progress } = result
    setProgram((current) => current && { ...current, ...progress, form_responses: [...(current.form_responses || []).filter((item) => item.lesson_id !== lessonId), saved] })
    return true
  }

  return <LearnerShell>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {status === 'verifying' ? <p className="rounded-[20px] border bg-white p-14 text-center text-text-mid">Confirming your payment…</p>
      : status === 'loading' ? <div className="h-60 animate-pulse rounded-[20px] bg-white" />
      : status === 'not_enrolled' || !program ? <div className="rounded-[20px] border bg-white p-14 text-center"><h1 className="text-xl font-bold text-green-deep">You’re not enrolled in this course</h1><Link href={`/courses/${slug}`} className="mt-5 inline-block rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white">View course</Link></div>
      : <CoursePlayer program={program} onBack={() => router.push('/learn')} backLabel="My courses" onTick={tick} onSubmit={submit} />}
  </LearnerShell>
}
