'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, EyeIcon, EyeSlashIcon, LockKeyIcon } from '@phosphor-icons/react'
import { patientAuth } from '@/lib/patient-auth'

// Where a patient's invitation or password-reset link lands. The link always
// decides whose account this is, whatever else is signed in on the browser,
// and the server confirms it is a patient's portal account before a password
// can be set.

// Read at import, before anything on the page can clear them.
const initialHash = typeof window === 'undefined' ? '' : window.location.hash
const initialSearch = typeof window === 'undefined' ? '' : window.location.search

type Stage = 'checking' | 'ready' | 'invalid' | 'complete'
type Linked = { email: string; firstName: string | null; activated: boolean }

const expiredLink = 'This link has expired or has already been used. Enter your email below and we will send you a new one.'

export default function PatientPortalSetup() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('checking')
  const [linked, setLinked] = useState<Linked | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    async function prepare() {
      const auth = patientAuth()
      const search = new URLSearchParams(initialSearch)
      const hash = new URLSearchParams(initialHash.replace(/^#/, ''))
      const linkError = search.get('error_description') || hash.get('error_description')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const code = search.get('code')
      // The tokens are single use; keep them out of the address bar and history.
      if (initialHash || initialSearch) window.history.replaceState({}, document.title, window.location.pathname)

      if (linkError) {
        setError(`${decodeURIComponent(linkError.replace(/\+/g, ' '))}. Enter your email below and we will send you a new link.`)
        setStage('invalid')
        return
      }
      // A link in the address bar always replaces any earlier portal sign-in.
      if (accessToken && refreshToken) {
        const { error: sessionError } = await auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (sessionError) { setError(expiredLink); setStage('invalid'); return }
      } else if (code) {
        const { error: exchangeError } = await auth.exchangeCodeForSession(code)
        if (exchangeError) { setError(expiredLink); setStage('invalid'); return }
      }

      const response = await fetch('/api/patient-portal/setup', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || expiredLink)
        setStage('invalid')
        return
      }
      setLinked(result)
      setStage('ready')
    }
    prepare().catch(() => {
      setError('We could not check this link. Check your connection and try again, or request a new link below.')
      setStage('invalid')
    })
  }, [])

  async function completeSetup(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 8) return setError('Your password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('The passwords do not match.')
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/patient-portal/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || 'Your password could not be saved. Please try again.')
        if (response.status === 401 || response.status === 403) setStage('invalid')
        return
      }
      setStage('complete')
      window.sessionStorage.setItem('fxmed-patient-welcome', 'true')
      window.setTimeout(() => {
        router.replace('/patient-portal')
        router.refresh()
      }, 900)
    } catch {
      setError('We could not reach FXMed. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const resetting = Boolean(linked?.activated)

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
            <span>{resetting ? 'New password' : 'Create password'}</span>
            <span className="h-px flex-1 bg-green-deep/10" />
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${stage === 'complete' ? 'bg-green-deep text-white' : 'bg-green-deep/10 text-green-deep/45'}`}>2</span>
            <span className={stage === 'complete' ? '' : 'text-green-deep/45'}>Enter portal</span>
          </div>
          <p className="mt-8 font-dm-sans text-xs font-bold uppercase tracking-[0.15em] text-green-mid">Patient Portal</p>
          <h1 className="mt-2 font-dm-sans text-3xl font-bold text-green-deep">
            {stage === 'invalid' ? 'Get a new link' : resetting ? 'Choose a new password' : linked?.firstName ? `Welcome, ${linked.firstName}` : 'Activate your account'}
          </h1>
          {stage !== 'invalid' && (
            <p className="mt-3 font-dm-sans text-sm leading-6 text-text-mid">
              {resetting ? 'Choose a new password, then you’ll be signed in and taken to your Patient Portal.' : 'Create a secure password, then you’ll be signed in and taken directly to your Patient Portal.'}
            </p>
          )}
          {linked && stage !== 'invalid' && <p className="mt-4 rounded-xl bg-[#FCFFF0] px-4 py-3 font-dm-sans text-sm text-text-mid">{resetting ? 'Resetting the password for' : 'Activating access for'} <strong className="text-green-deep">{linked.email}</strong></p>}

          {stage === 'checking' && <div className="mx-auto mt-10 h-9 w-9 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" aria-label="Checking your link" />}

          {stage === 'complete' && (
            <div role="status" className="mt-8 rounded-[20px] border border-green-mid/20 bg-green-50 p-6 text-center">
              <CheckCircleIcon size={48} weight="fill" className="mx-auto text-green-mid" />
              <h2 className="mt-3 font-dm-sans text-xl font-bold text-green-deep">{resetting ? 'Your password is updated' : 'Your account is ready'}</h2>
              <p className="mt-2 font-dm-sans text-sm text-text-mid">Taking you to your Patient Portal…</p>
            </div>
          )}

          {stage === 'ready' && (
            <form onSubmit={completeSetup} className="mt-8 space-y-5">
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-dm-sans text-sm leading-6 text-red-700">{error}</div>}
              <PasswordField label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} />
              <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} />
              <div className="flex items-center gap-2 font-dm-sans text-xs text-text-mid"><LockKeyIcon size={17} weight="fill" className="text-green-mid" />Use at least 8 characters. Keep this password private.</div>
              <button type="submit" disabled={saving} className="w-full rounded-full bg-green-deep px-6 py-4 font-dm-sans font-bold text-white transition hover:bg-green-mid disabled:opacity-50">
                {saving ? 'Saving…' : resetting ? 'Save password and continue' : 'Activate account and continue'}
              </button>
            </form>
          )}

          {stage === 'invalid' && <RequestNewLink error={error} />}
        </div>
      </div>
    </main>
  )
}

/** For an expired, used or mistaken link: send a fresh one to the patient's email. */
function RequestNewLink({ error }: { error: string }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [requestError, setRequestError] = useState('')

  async function send(event: React.FormEvent) {
    event.preventDefault()
    setSending(true)
    setMessage('')
    setRequestError('')
    try {
      const response = await fetch('/api/patient-portal/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setRequestError(result.error || 'We could not send a new link. Please try again.')
      else setMessage(result.message)
    } catch {
      setRequestError('We could not reach FXMed. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={send} className="mt-6 space-y-5">
      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-dm-sans text-sm leading-6 text-amber-900">{error}</div>}
      {message ? (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-dm-sans text-sm leading-6 text-green-800">{message}</div>
      ) : (
        <>
          <label className="block font-dm-sans text-sm font-bold text-green-deep">Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="The email your care team invited" className="mt-2 w-full rounded-xl border border-green-deep/15 px-4 py-3.5 font-normal outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" />
          </label>
          {requestError && <p role="alert" className="font-dm-sans text-sm text-red-700">{requestError}</p>}
          <button type="submit" disabled={sending} className="w-full rounded-full bg-green-deep px-6 py-4 font-dm-sans font-bold text-white transition hover:bg-green-mid disabled:opacity-50">{sending ? 'Sending…' : 'Send me a new link'}</button>
        </>
      )}
      <p className="text-center font-dm-sans text-sm text-text-mid">Already set up? <Link href="/patient-portal/login" className="font-bold text-green-mid underline underline-offset-4">Sign in to your portal</Link></p>
    </form>
  )
}

function PasswordField({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return (
    <label className="block font-dm-sans text-sm font-bold text-green-deep">
      {label}
      <span className="relative mt-2 block">
        <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" className="w-full rounded-xl border border-green-deep/15 px-4 py-3.5 pr-12 font-normal outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" />
        <button type="button" onClick={onToggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-green-deep/55 hover:bg-green-deep/5 hover:text-green-deep">
          {visible ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </span>
    </label>
  )
}
