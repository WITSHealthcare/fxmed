'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signOut, supabase } from '@/lib/supabase-auth'

export default function AmbassadorPortalLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { user } = await signIn(email.trim(), password)
      if (user.app_metadata?.account_type !== 'ambassador' && user.user_metadata?.account_type !== 'ambassador') {
        await signOut()
        throw new Error('This account does not have Ambassador Portal access.')
      }
      const response = await fetch('/api/ambassador-portal')
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        await signOut()
        throw new Error(result.error || 'Ambassador Portal access is unavailable.')
      }
      router.replace('/ambassador-portal')
      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword() {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter your ambassador email address first.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/ambassador-portal/setup`,
    })
    if (resetError) setError(resetError.message)
    else setMessage('If this email has portal access, a password-reset link has been sent.')
    setLoading(false)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07130e] px-4 py-12">
      <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 h-[30rem] w-[30rem] rounded-full bg-green-mid/20 blur-3xl" />
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl lg:grid-cols-[42%_58%]">
        <div className="hidden flex-col items-start bg-green-deep p-10 text-left text-white lg:flex">
          <div className="relative h-32 w-full overflow-hidden" aria-label="FXMed">
            <Image
              src="/logo.png"
              alt="FXMed"
              width={900}
              height={507}
              priority
              className="absolute -left-[4.75rem] top-1/2 h-auto w-[27rem] max-w-none -translate-y-1/2 brightness-0 invert"
            />
          </div>
          <div className="mt-6 w-full text-left">
            <span className="inline-flex rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-green-deep">FXMed Elite</span>
            <h1 className="mt-6 font-dm-sans text-5xl font-bold leading-[1.05]">Your network.<br /><span className="text-gold">Your impact.</span></h1>
            <p className="mt-5 max-w-sm font-dm-sans leading-7 text-white/70">Track every referral, follow client progress, and see your commission history in one place.</p>
          </div>
          <p className="mt-auto font-dm-sans text-xs text-white/45">Ambassador accounts are activated by the FXMed team.</p>
        </div>

        <div className="p-7 sm:p-12 lg:p-14">
          <div className="relative mb-10 h-24 w-full overflow-hidden lg:hidden" aria-label="FXMed">
            <Image
              src="/logo.png"
              alt="FXMed"
              width={620}
              height={349}
              priority
              className="absolute left-1/2 top-1/2 h-auto w-[24.75rem] max-w-none -translate-x-1/2 -translate-y-1/2 brightness-0"
            />
          </div>
          <p className="font-dm-sans text-xs font-bold uppercase tracking-[0.16em] text-green-mid">Ambassador Portal</p>
          <h2 className="mt-2 font-dm-sans text-4xl font-bold text-green-deep">Welcome back</h2>
          <p className="mt-3 font-dm-sans text-sm leading-6 text-text-mid">Sign in with the account you activated from your FXMed invitation.</p>

          {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-dm-sans text-sm text-red-700">{error}</div>}
          {message && <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-dm-sans text-sm text-green-700">{message}</div>}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block font-dm-sans text-sm font-bold text-green-deep">Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full rounded-xl border border-green-deep/15 bg-[#fbfcf8] px-4 py-3.5 font-normal outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/15" placeholder="you@example.com" />
            </label>
            <label className="block font-dm-sans text-sm font-bold text-green-deep">Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="mt-2 w-full rounded-xl border border-green-deep/15 bg-[#fbfcf8] px-4 py-3.5 font-normal outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/15" placeholder="Your password" />
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-full bg-green-deep px-6 py-4 font-dm-sans font-bold text-white transition hover:bg-green-mid disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in to your portal'}</button>
          </form>
          <button type="button" onClick={resetPassword} disabled={loading} className="mt-4 w-full font-dm-sans text-sm font-bold text-green-mid hover:underline disabled:opacity-50">Forgot password?</button>
          <p className="mt-8 text-center font-dm-sans text-sm text-text-mid">Not yet an ambassador? <Link href="/ambassadors" className="font-bold text-green-mid hover:underline">View the program</Link></p>
        </div>
      </div>
    </main>
  )
}
