'use client'

import { useEffect, useState } from 'react'
import { DeviceMobileIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { Alert, button } from '@/components/admin/ui'
import { getTwoStepStatus, removeTwoStep, startTwoStepSetup, verifyTwoStepCode, type TwoStepStatus } from '@/lib/two-step-client'

// Turn optional two-step sign-in on or off for the signed-in staff member,
// from the account menu.
export default function TwoStepSetup({ onDone }: { onDone?: () => void }) {
  const [status, setStatus] = useState<TwoStepStatus | null>(null)
  const [setup, setSetup] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => getTwoStepStatus().then(setStatus).catch(() => setError('Could not check two-step sign-in. Refresh and try again.'))
  useEffect(() => { void refresh() }, [])

  const begin = async () => {
    setBusy(true); setError('')
    try { setSetup(await startTwoStepSetup()) } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not start set-up.') }
    setBusy(false)
  }

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!setup) return
    setBusy(true); setError('')
    try {
      await verifyTwoStepCode(setup.factorId, code)
      setSetup(null); setCode('')
      await refresh()
      onDone?.()
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'That code did not work.') }
    setBusy(false)
  }

  const turnOff = async () => {
    if (!status?.factorId || !window.confirm('Turn off two-step sign-in? Your account will be protected by your password alone.')) return
    setBusy(true); setError('')
    try { await removeTwoStep(status.factorId); await refresh() } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not turn it off.') }
    setBusy(false)
  }

  if (!status) return <p className="text-sm text-text-mid">Checking…</p>

  if (status.enrolled && !setup) {
    return <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-4 text-green-800"><ShieldCheckIcon size={24} weight="fill" className="shrink-0" /><div><p className="font-semibold">Two-step sign-in is on</p><p className="mt-1 text-sm">You&apos;ll enter a code from your authenticator app each time you sign in.</p></div></div>
      <Alert>{error}</Alert>
      {<button type="button" onClick={turnOff} disabled={busy} className={button.danger}>Turn off two-step sign-in</button>}
    </div>
  }

  return <div className="space-y-5">
    <p className="text-sm leading-6 text-text-mid">
      Optional extra protection if your password is ever guessed or leaked. 
      After your password you&apos;ll enter a 6-digit code from an authenticator app on your phone: Google Authenticator, Microsoft Authenticator or Authy.
    </p>
    <Alert>{error}</Alert>
    {!setup ? (
      <button type="button" onClick={begin} disabled={busy} className={button.primary}><DeviceMobileIcon size={18} />{busy ? 'Starting…' : 'Set up two-step sign-in'}</button>
    ) : (
      <form onSubmit={confirm} className="space-y-5">
        <ol className="space-y-4 text-sm text-green-deep">
          <li><p className="font-semibold">1. Scan this code with your authenticator app</p>
            {/* Supabase returns the QR code as an SVG data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrCode} alt="QR code for your authenticator app" className="mt-3 h-44 w-44 rounded-xl border border-green-deep/10 bg-white p-2" />
            <p className="mt-2 text-xs text-text-mid">Can&apos;t scan? Enter this key instead: <code className="select-all break-all rounded bg-green-deep/5 px-1.5 py-0.5 font-mono">{setup.secret}</code></p>
          </li>
          <li><label className="block font-semibold">2. Enter the 6-digit code the app shows
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required className="input mt-2 max-w-[12rem] text-center font-mono text-lg tracking-[0.3em]" placeholder="000000" />
          </label></li>
        </ol>
        <button disabled={busy || code.replace(/\s/g, '').length !== 6} className={button.primary}>{busy ? 'Checking…' : 'Turn on two-step sign-in'}</button>
      </form>
    )}
  </div>
}
