'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LearnerAuthCard, { authButton, authInput, safeNext } from '@/components/training/LearnerAuthCard'
import { supabase } from '@/lib/supabase-auth'

// Learners arrive here from the sign-up or password-reset email and set a password.
function SetupForm() {
  const router = useRouter(); const next = safeNext(useSearchParams().get('next'))
  const [ready, setReady] = useState(false); const [hasSession, setHasSession] = useState(false); const [email, setEmail] = useState('')
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('')

  useEffect(() => {
    async function prepare() {
      const search = new URLSearchParams(window.location.search); const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const callbackError = search.get('error_description') || hash.get('error_description')
      if (callbackError) { setError(decodeURIComponent(callbackError.replace(/\+/g, ' '))); setReady(true); return }
      // The browser client usually consumes the link itself; only fall back if it did not.
      let { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session && hash.get('access_token') && hash.get('refresh_token')) {
        const result = await supabase.auth.setSession({ access_token: hash.get('access_token')!, refresh_token: hash.get('refresh_token')! }); session = result.data.session; sessionError = result.error
      }
      if (!session && search.get('code')) { const result = await supabase.auth.exchangeCodeForSession(search.get('code')!); session = result.data.session; sessionError = result.error }
      if (session) { setHasSession(true); setEmail(session.user.email || ''); window.history.replaceState({}, document.title, `${window.location.pathname}${next !== '/learn' ? `?next=${encodeURIComponent(next)}` : ''}`) }
      else setError(sessionError?.message || 'This link is invalid or has expired. Sign up again or use “Forgot password?” on the sign-in page.')
      setReady(true)
    }
    prepare().catch((setupError) => { setError(setupError instanceof Error ? setupError.message : 'Could not verify this link.'); setReady(true) })
  }, [next])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 8) return setError('Your password must be at least 8 characters.')
    if (password !== confirm) return setError('The passwords do not match.')
    setSaving(true); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setSaving(false); return }
    const check = await fetch('/api/learn')
    if (!check.ok) { setError((await check.json().catch(() => ({}))).error || 'Your password was saved, but this account is not a learner account.'); setSaving(false); return }
    router.replace(next); router.refresh()
  }

  return <LearnerAuthCard eyebrow="FXMed courses" title="Set your password" intro={email ? <>Setting a password for <strong className="text-green-deep">{email}</strong>.</> : 'Create a password to finish setting up your learner account.'}>
    {!ready ? <div className="mx-auto mt-10 h-9 w-9 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /> : <form onSubmit={submit} className="mt-6 space-y-5">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {hasSession && <>
        <label className="block text-sm font-bold text-green-deep">New password<input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} /></label>
        <label className="block text-sm font-bold text-green-deep">Confirm password<input type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={authInput} /></label>
      </>}
      <button disabled={saving || !hasSession} className={authButton}>{saving ? 'Saving…' : 'Save password and continue'}</button>
      {!hasSession && <p className="text-center text-sm text-text-mid">Go to the <Link href="/learn/login" className="font-bold text-green-mid underline">sign-in page</Link> and choose “Forgot password?” for a fresh link.</p>}
    </form>}
  </LearnerAuthCard>
}

export default function LearnerSetup() { return <Suspense><SetupForm /></Suspense> }
