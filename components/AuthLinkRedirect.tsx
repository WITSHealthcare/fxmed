'use client'

import { useEffect } from 'react'

// Supabase sends invite and password-reset links to the site URL instead of
// the requested portal setup page whenever that page is missing from the
// project's allowed redirect URLs. Catch those links here and forward them,
// tokens intact, to the setup page for the account they belong to.

// Read at import, before the Supabase client can consume and clear the hash.
const initialHash = typeof window === 'undefined' ? '' : window.location.hash

const setupPages: Record<string, string> = {
  patient: '/patient-portal/setup',
  ambassador: '/ambassador-portal/setup',
}

function accountType(accessToken: string) {
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    return claims.app_metadata?.account_type || claims.user_metadata?.account_type || null
  } catch {
    return null
  }
}

export default function AuthLinkRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(initialHash.replace(/^#/, ''))
    const token = params.get('access_token')
    if (!token || !['invite', 'recovery', 'signup', 'magiclink'].includes(params.get('type') || '')) return
    const target = setupPages[accountType(token)]
    if (target) window.location.replace(`${target}${initialHash}`)
  }, [])
  return null
}
