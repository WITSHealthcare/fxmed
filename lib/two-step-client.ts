'use client'

import { supabase } from '@/lib/supabase-auth'

// Browser side of two-step sign-in (Supabase TOTP multi-factor auth).

export type TwoStepStatus = {
  // Signed in with the code this session (aal2).
  verified: boolean
  // Has an authenticator set up, so the code is needed to finish signing in.
  enrolled: boolean
  factorId: string | null
}

export async function getTwoStepStatus(): Promise<TwoStepStatus> {
  const [{ data: level }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])
  const factor = factors?.totp?.[0] || null
  return { verified: level?.currentLevel === 'aal2', enrolled: Boolean(factor) || level?.nextLevel === 'aal2', factorId: factor?.id || null }
}

// Finish signing in with the 6-digit code from the authenticator app.
export async function verifyTwoStepCode(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') })
  if (error) throw new Error(error.message.includes('Invalid') ? 'That code is not right or has expired. Try the newest code.' : error.message)
}

// Start setting up an authenticator: returns the QR code to scan and the key
// to type in by hand. Half-finished earlier attempts are cleared first.
export async function startTwoStepSetup() {
  const { data: factors } = await supabase.auth.mfa.listFactors()
  for (const factor of factors?.all || []) {
    if (factor.factor_type === 'totp' && factor.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: factor.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `FXMed ${new Date().toISOString().slice(0, 16)}`, issuer: 'FXMed' })
  if (error || !data) throw new Error(error?.message || 'Two-step sign-in could not be started.')
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export async function removeTwoStep(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
}
