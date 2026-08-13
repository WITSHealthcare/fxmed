import { createServerClient } from '@supabase/ssr'
import { createClient, type User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export const referralStatuses = ['submitted', 'contacted', 'consultation_booked', 'converted', 'declined'] as const
export const commissionStatuses = ['not_earned', 'pending', 'approved', 'paid'] as const
export const ambassadorAccountStatuses = ['active', 'suspended', 'inactive'] as const
export const membershipTiers = ['essential', 'premium', 'elite'] as const
export const payoutStatuses = ['scheduled', 'processing', 'paid', 'failed'] as const

export type ReferralStatus = typeof referralStatuses[number]
export type CommissionStatus = typeof commissionStatuses[number]
export type AmbassadorAccountStatus = typeof ambassadorAccountStatuses[number]
export type MembershipTier = typeof membershipTiers[number]
export type PayoutStatus = typeof payoutStatuses[number]

export const tierCommissionDefaults: Record<MembershipTier, { rate: number; membershipAmount: number; commissionAmount: number }> = {
  essential: { rate: 10, membershipAmount: 780000, commissionAmount: 78000 },
  premium: { rate: 15, membershipAmount: 5400000, commissionAmount: 810000 },
  elite: { rate: 20, membershipAmount: 8400000, commissionAmount: 1680000 },
}

export function formatPortalLabel(value: string) {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function getAmbassadorDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    : null
}

export async function getRequestUser(request: NextRequest): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll() {
        // API authorization checks do not refresh browser cookies.
      },
    },
  })
  const { data: { user }, error } = await client.auth.getUser()
  return error ? null : user
}

export async function getRequestAmbassador(request: NextRequest, allowSuspended = false) {
  const user = await getRequestUser(request)
  const database = getAmbassadorDatabase()
  if (!user || !database) return null

  const { data: profile, error } = await database
    .from('ambassador_profiles')
    .select('*, application:ambassador_applications(first_name,last_name,email,gender,state_region,city,field_of_expertise)')
    .eq('user_id', user.id)
    .single()

  if (error || !profile || (!allowSuspended && profile.status !== 'active')) return null
  return { user, profile, database }
}

export function makeAmbassadorCode(firstName: string, lastName: string) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase().replace(/[^A-Z]/g, '') || 'FX'
  return `FXM-${initials}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
}
