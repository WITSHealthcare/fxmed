'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LearnerAuthCard, { authButton, authInput, safeNext } from '@/components/training/LearnerAuthCard'
import { signIn, signOut, supabase } from '@/lib/supabase-auth'

function LoginForm() {
  const router = useRouter(); const next = safeNext(useSearchParams().get('next'))
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    try {
      const { user } = await signIn(email.trim(), password)
      if (user.app_metadata?.account_type !== 'learner') { await signOut(); throw new Error('This account is not a course learner account. FXMed staff take courses from the dashboard.') }
      const response = await fetch('/api/learn')
      if (!response.ok) { await signOut(); throw new Error((await response.json().catch(() => ({}))).error || 'Your learner account is unavailable. Contact FXMed.') }
      router.replace(next); router.refresh()
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.') }
    finally { setLoading(false) }
  }
  async function reset() {
    if (!email.includes('@')) return setError('Enter your email address first.')
    setLoading(true); setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/learn/setup` })
    if (resetError) setError(resetError.message); else setMessage('If this email has a learner account, a password-reset link has been sent.')
    setLoading(false)
  }

  return <LearnerAuthCard eyebrow="FXMed courses" title="Welcome back" intro="Sign in to continue your courses.">
    {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm font-bold text-green-deep">Email address<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} /></label>
      <label className="block text-sm font-bold text-green-deep">Password<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} /></label>
      <button disabled={loading} className={authButton}>{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <button type="button" onClick={reset} disabled={loading} className="mt-4 w-full text-sm font-bold text-green-mid hover:underline disabled:opacity-50">Forgot password?</button>
    <p className="mt-6 text-center text-sm text-text-mid">New here? <Link href={`/learn/signup${next !== '/learn' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-green-mid hover:underline">Create a learner account</Link></p>
  </LearnerAuthCard>
}

export default function LearnerLogin() { return <Suspense><LoginForm /></Suspense> }
