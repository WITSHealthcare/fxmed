'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, EyeIcon, EyeSlashIcon, LockKeyIcon } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase-auth'

export default function AmbassadorSetup() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    async function prepareSession() {
      setError('')
      const search = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const callbackError = search.get('error_description') || hash.get('error_description')
      if (callbackError) {
        setError(decodeURIComponent(callbackError.replace(/\+/g, ' ')))
        setReady(true)
        return
      }

      // createBrowserClient normally consumes invite/recovery parameters while
      // it initializes. Wait for that first so a PKCE code is not exchanged twice.
      let { data: { session }, error: sessionError } = await supabase.auth.getSession()

      // Fallback for an implicit-flow link when automatic URL detection was
      // interrupted by a browser extension or cross-browser email handoff.
      if (!session) {
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          session = result.data.session
          sessionError = result.error
        }
      }

      // Only exchange a remaining PKCE code if automatic initialization did not
      // establish a session. This avoids the common "code already used" error.
      const code = search.get('code')
      if (!session && code) {
        const result = await supabase.auth.exchangeCodeForSession(code)
        session = result.data.session
        sessionError = result.error
      }

      if (session) {
        setHasSession(true)
        setEmail(session.user.email || '')
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        setError(sessionError?.message || 'This setup link is invalid or has expired. Request a new setup email from the FXMed team.')
      }
      setReady(true)
    }
    prepareSession().catch((setupError) => {
      setError(setupError instanceof Error ? setupError.message : 'Could not verify this setup link.')
      setReady(true)
    })
  }, [])

  async function completeSetup(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 8) return setError('Your password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('The passwords do not match.')
    if (!hasSession) return setError('Your setup session is no longer valid. Request a new setup email from the FXMed team.')
    setSaving(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { account_type: 'ambassador' } })
    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }
    const activationResponse = await fetch('/api/ambassador-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const activationResult = await activationResponse.json().catch(() => ({}))
    if (!activationResponse.ok) {
      setError(activationResult.error || 'Your password was saved, but the portal could not finish activation. Try signing in from the Ambassador Portal login page.')
      setSaving(false)
      return
    }
    setComplete(true)
    window.sessionStorage.setItem('fxmed-ambassador-welcome', 'true')
    window.setTimeout(() => {
      router.replace('/ambassador-portal')
      router.refresh()
    }, 900)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07130e] px-4 py-12">
      <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 h-[30rem] w-[30rem] rounded-full bg-green-mid/20 blur-3xl" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="bg-green-deep px-7 py-5 sm:px-10">
          <div className="relative mx-auto h-20 w-72 overflow-hidden" aria-label="FXMed">
            <Image src="/logo.png" alt="FXMed" width={430} height={242} priority className="absolute left-1/2 top-1/2 h-auto w-[24rem] max-w-none -translate-x-1/2 -translate-y-1/2 brightness-0 invert" />
          </div>
        </div>
        <div className="p-7 sm:p-10">
          <div className="flex items-center gap-3 font-dm-sans text-xs font-bold uppercase tracking-[0.12em] text-green-mid">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-deep text-white">1</span>
            <span>Create password</span>
            <span className="h-px flex-1 bg-green-deep/10" />
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-deep/10 text-green-deep/45">2</span>
            <span className="text-green-deep/45">Enter portal</span>
          </div>
          <p className="mt-8 font-dm-sans text-xs font-bold uppercase tracking-[0.15em] text-green-mid">Ambassador Portal</p>
          <h1 className="mt-2 font-dm-sans text-3xl font-bold text-green-deep">Activate your account</h1>
          <p className="mt-3 font-dm-sans text-sm leading-6 text-text-mid">Create a secure password, then you’ll be signed in and taken directly to your Ambassador Portal.</p>
          {email && <p className="mt-4 rounded-xl bg-[#FCFFF0] px-4 py-3 font-dm-sans text-sm text-text-mid">Activating access for <strong className="text-green-deep">{email}</strong></p>}
          {!ready ? <div className="mx-auto mt-10 h-9 w-9 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /> : complete ? (
            <div role="status" className="mt-8 rounded-[20px] border border-green-mid/20 bg-green-50 p-6 text-center">
              <CheckCircleIcon size={48} weight="fill" className="mx-auto text-green-mid" />
              <h2 className="mt-3 font-dm-sans text-xl font-bold text-green-deep">Your account is ready</h2>
              <p className="mt-2 font-dm-sans text-sm text-text-mid">Taking you to your Ambassador Portal…</p>
            </div>
          ) : (
            <form onSubmit={completeSetup} className="mt-8 space-y-5">
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-dm-sans text-sm leading-6 text-red-700">{error}</div>}
              {hasSession && <>
                <PasswordField label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} />
                <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} />
                <div className="flex items-center gap-2 font-dm-sans text-xs text-text-mid"><LockKeyIcon size={17} weight="fill" className="text-green-mid" />Use at least 8 characters. Keep this password private.</div>
              </>}
              <button type="submit" disabled={saving || !hasSession} className="w-full rounded-full bg-green-deep px-6 py-4 font-dm-sans font-bold text-white transition hover:bg-green-mid disabled:opacity-50">{saving ? 'Activating your account…' : 'Activate account and continue'}</button>
              {!hasSession && <p className="text-center font-dm-sans text-sm leading-6 text-text-mid">Need a fresh link? Go to the <Link href="/ambassador-portal/login" className="font-bold text-green-mid underline underline-offset-4">Ambassador login page</Link>, enter your email, and select <strong>Forgot password?</strong></p>}
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

function PasswordField({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return (
    <label className="block font-dm-sans text-sm font-bold text-green-deep">
      {label}
      <span className="relative mt-2 block">
        <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} minLength={8} required autoComplete="new-password" className="w-full rounded-xl border border-green-deep/15 px-4 py-3.5 pr-12 font-normal outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" />
        <button type="button" onClick={onToggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-green-deep/55 hover:bg-green-deep/5 hover:text-green-deep">
          {visible ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </span>
    </label>
  )
}
