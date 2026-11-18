'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type State = 'loading' | 'signed_out' | 'enrolled' | 'can_enrol' | 'closed'

// The call to action on a public course page. It checks whether the visitor
// is a signed-in learner and already enrolled, then enrols (free) or sends
// them to Paystack checkout (paid).
export default function CourseEnrolButton({ slug, paid }: { slug: string; paid: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/learn/programs/${slug}`).then(async (response) => {
      if (response.status === 403) return setState('signed_out')
      const result = await response.json().catch(() => ({}))
      setState(!response.ok ? 'closed' : result.enrolled ? 'enrolled' : result.can_enrol ? 'can_enrol' : 'closed')
    }).catch(() => setState('signed_out'))
  }, [slug])

  async function enrol() {
    setBusy(true); setError('')
    const response = await fetch('/api/learn/enrol', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not enrol.'); setBusy(false); return }
    if (result.checkout_url) { window.location.href = result.checkout_url; return }
    router.push(`/learn/${slug}`)
  }

  const primary = 'block w-full rounded-full bg-green-deep px-6 py-3.5 text-center font-bold text-white transition hover:bg-green-mid disabled:opacity-50'
  if (state === 'loading') return <div className="h-[52px] animate-pulse rounded-full bg-gray-100" />
  if (state === 'enrolled') return <Link href={`/learn/${slug}`} className={primary}>Go to course</Link>
  if (state === 'closed') return <p className="text-sm text-text-mid">Enrolment for this course is closed.</p>
  if (state === 'signed_out') return <div className="space-y-2">
    <Link href={`/learn/signup?next=${encodeURIComponent(`/courses/${slug}`)}`} className={primary}>{paid ? 'Sign up to buy' : 'Sign up to enrol free'}</Link>
    <Link href={`/learn/login?next=${encodeURIComponent(`/courses/${slug}`)}`} className="block text-center text-sm font-bold text-green-mid hover:underline">I already have an account</Link>
  </div>
  return <div>
    <button type="button" onClick={enrol} disabled={busy} className={primary}>{busy ? (paid ? 'Opening checkout…' : 'Enrolling…') : paid ? 'Buy and enrol' : 'Enrol free'}</button>
    {paid && <p className="mt-2 text-center text-xs text-text-mid">Secure payment with Paystack</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
}
