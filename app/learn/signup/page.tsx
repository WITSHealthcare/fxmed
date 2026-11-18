'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import LearnerAuthCard, { authButton, authInput, safeNext } from '@/components/training/LearnerAuthCard'

function SignupForm() {
  const next = safeNext(useSearchParams().get('next'))
  const [form, setForm] = useState({ full_name: '', email: '', profession: '', organisation: '', phone: '', consent: false })
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState('')
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('')
    const response = await fetch('/api/learn/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, next: next.startsWith('/courses/') ? next : '' }) })
    const result = await response.json().catch(() => ({}))
    if (response.ok) setSent(result.message); else setError(result.error || 'Could not create your account.')
    setLoading(false)
  }

  if (sent) return <LearnerAuthCard eyebrow="FXMed courses" title="Check your email" intro={<>{sent} The link was sent to <strong className="text-green-deep">{form.email}</strong>.</>}>
    <p className="mt-6 text-sm text-text-mid">Didn’t get it? Check spam, or <Link href="/learn/login" className="font-bold text-green-mid underline">sign in</Link> and use “Forgot password?” if you already have an account.</p>
  </LearnerAuthCard>

  return <LearnerAuthCard eyebrow="FXMed courses" title="Create your learner account" intro="We’ll email you a link to set your password. Then you can enrol in courses and track your progress.">
    {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-bold text-green-deep">Full name <span className="font-normal text-gray-400">— as it should appear on certificates</span><input required maxLength={160} autoComplete="name" value={form.full_name} onChange={set('full_name')} className={authInput} /></label>
      <label className="block text-sm font-bold text-green-deep">Email address<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={authInput} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-green-deep">Profession <span className="font-normal text-gray-400">— optional</span><input maxLength={120} value={form.profession} onChange={set('profession')} placeholder="e.g. Nurse" className={authInput} /></label>
        <label className="block text-sm font-bold text-green-deep">Organisation <span className="font-normal text-gray-400">— optional</span><input maxLength={160} autoComplete="organization" value={form.organisation} onChange={set('organisation')} className={authInput} /></label>
      </div>
      <label className="block text-sm font-bold text-green-deep">Phone <span className="font-normal text-gray-400">— optional</span><input type="tel" maxLength={40} autoComplete="tel" value={form.phone} onChange={set('phone')} className={authInput} /></label>
      <label className="flex items-start gap-3 text-sm text-text-mid"><input type="checkbox" required checked={form.consent} onChange={set('consent')} className="mt-1 h-4 w-4 accent-green-deep" /><span>I agree that FXMed may store these details to run my courses and issue certificates. Course content is educational and is not medical advice.</span></label>
      <button disabled={loading} className={authButton}>{loading ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p className="mt-6 text-center text-sm text-text-mid">Already have an account? <Link href={`/learn/login${next !== '/learn' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-green-mid hover:underline">Sign in</Link></p>
  </LearnerAuthCard>
}

export default function LearnerSignup() { return <Suspense><SignupForm /></Suspense> }
