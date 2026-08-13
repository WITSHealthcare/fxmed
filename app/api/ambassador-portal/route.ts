import { NextRequest, NextResponse } from 'next/server'
import { getRequestAmbassador } from '@/lib/ambassador-portal'

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestAmbassador(request, true)
    if (!context) return NextResponse.json({ error: 'Ambassador access required' }, { status: 403 })
    const { profile, database } = context

    const [referralsResult, payoutsResult, announcementsResult, resourcesResult] = await Promise.all([
      database.from('ambassador_referrals').select('*').eq('ambassador_id', profile.id).order('created_at', { ascending: false }),
      database.from('ambassador_payouts').select('*').eq('ambassador_id', profile.id).order('created_at', { ascending: false }),
      database.from('ambassador_announcements').select('*').eq('published', true).order('created_at', { ascending: false }).limit(20),
      database.from('ambassador_resources').select('*').eq('published', true).order('created_at', { ascending: false }).limit(50),
    ])

    const error = referralsResult.error || payoutsResult.error || announcementsResult.error || resourcesResult.error
    if (error) throw error
    return NextResponse.json({
      profile,
      referrals: referralsResult.data || [],
      payouts: payoutsResult.data || [],
      announcements: announcementsResult.data || [],
      resources: resourcesResult.data || [],
    })
  } catch (error) {
    console.error('Error loading ambassador portal:', error)
    return NextResponse.json({ error: 'Failed to load the ambassador portal.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestAmbassador(request)
    if (!context) return NextResponse.json({ error: 'Active ambassador access required' }, { status: 403 })
    const { profile, database } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'Profile details are required.' }, { status: 400 })

    const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) || null : null
    const updates: Record<string, string | null> = {
      activated_at: profile.activated_at || new Date().toISOString(),
    }
    for (const [field, max] of Object.entries({
      phone: 40,
      organization: 160,
      job_title: 120,
      bank_name: 120,
      bank_account_name: 160,
      bank_account_number: 30,
    })) {
      if (field in body) updates[field] = clean(body[field], max)
    }
    const { data, error } = await database.from('ambassador_profiles').update(updates).eq('id', profile.id).select('*').single()
    if (error) throw error
    return NextResponse.json({ profile: { ...profile, ...data } })
  } catch (error) {
    console.error('Error updating ambassador profile:', error)
    return NextResponse.json({ error: 'Failed to update your profile.' }, { status: 500 })
  }
}
