import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import {
  ambassadorAccountStatuses,
  commissionStatuses,
  getAmbassadorDatabase,
  membershipTiers,
  payoutStatuses,
  referralStatuses,
  tierCommissionDefaults,
  type MembershipTier,
} from '@/lib/ambassador-portal'

async function authorized(request: NextRequest) {
  return Boolean(await getAuthorizedAdminRole(request, 'ambassador'))
}

export async function GET(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getAmbassadorDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const [profiles, referrals, payouts, announcements, resources] = await Promise.all([
      database.from('ambassador_profiles').select('*, application:ambassador_applications(*)').order('created_at', { ascending: false }),
      database.from('ambassador_referrals').select('*, ambassador:ambassador_profiles(ambassador_code, application:ambassador_applications(first_name,last_name,email))').order('created_at', { ascending: false }),
      database.from('ambassador_payouts').select('*, ambassador:ambassador_profiles(ambassador_code,bank_name,bank_account_name,bank_account_number,application:ambassador_applications(first_name,last_name,email)), referral:ambassador_referrals(first_name,last_name)').order('created_at', { ascending: false }),
      database.from('ambassador_announcements').select('*').order('created_at', { ascending: false }),
      database.from('ambassador_resources').select('*').order('created_at', { ascending: false }),
    ])
    const error = profiles.error || referrals.error || payouts.error || announcements.error || resources.error
    if (error) throw error
    return NextResponse.json({ ambassadors: profiles.data || [], referrals: referrals.data || [], payouts: payouts.data || [], announcements: announcements.data || [], resources: resources.data || [] })
  } catch (error) {
    console.error('Error loading ambassador management:', error)
    return NextResponse.json({ error: 'Failed to load ambassador management.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getAmbassadorDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.id !== 'string' || (body.entity !== 'referral' && body.entity !== 'ambassador' && body.entity !== 'payout')) {
      return NextResponse.json({ error: 'A valid record is required.' }, { status: 400 })
    }

    if (body.entity === 'ambassador') {
      if (typeof body.status !== 'string' || !ambassadorAccountStatuses.includes(body.status as never)) {
        return NextResponse.json({ error: 'A valid account status is required.' }, { status: 400 })
      }
      const { data, error } = await database.from('ambassador_profiles').update({ status: body.status }).eq('id', body.id).select('*').single()
      if (error) throw error
      return NextResponse.json({ ambassador: data })
    }

    if (body.entity === 'payout') {
      if (typeof body.status !== 'string' || !payoutStatuses.includes(body.status as never)) {
        return NextResponse.json({ error: 'A valid payout status is required.' }, { status: 400 })
      }
      const proofUrl = typeof body.proof_url === 'string' ? body.proof_url.trim().slice(0, 1000) : ''
      if (proofUrl && !/^https?:\/\//i.test(proofUrl)) return NextResponse.json({ error: 'Payment proof must be a valid HTTP(S) URL.' }, { status: 400 })
      const updates = {
        status: body.status,
        payment_reference: typeof body.payment_reference === 'string' ? body.payment_reference.trim().slice(0, 160) || null : null,
        proof_url: proofUrl || null,
        paid_at: body.status === 'paid' ? new Date().toISOString() : null,
      }
      const { data, error } = await database.from('ambassador_payouts').update(updates).eq('id', body.id).select('*').single()
      if (error) throw error
      if (body.status === 'paid' && data.referral_id) {
        await database.from('ambassador_referrals').update({ commission_status: 'paid' }).eq('id', data.referral_id)
      }
      return NextResponse.json({ payout: data })
    }

    if (typeof body.status !== 'string' || !referralStatuses.includes(body.status as never)) {
      return NextResponse.json({ error: 'A valid referral status is required.' }, { status: 400 })
    }
    const tier = typeof body.membership_tier === 'string' && membershipTiers.includes(body.membership_tier as MembershipTier)
      ? body.membership_tier as MembershipTier : null
    const commissionStatus = typeof body.commission_status === 'string' && commissionStatuses.includes(body.commission_status as never)
      ? body.commission_status : body.status === 'converted' ? 'pending' : 'not_earned'
    const defaults = tier ? tierCommissionDefaults[tier] : { rate: 0, membershipAmount: 0, commissionAmount: 0 }
    const updates = {
      status: body.status,
      membership_tier: tier,
      membership_amount: Number(body.membership_amount) >= 0 ? Number(body.membership_amount) : defaults.membershipAmount,
      commission_rate: Number(body.commission_rate) >= 0 ? Number(body.commission_rate) : defaults.rate,
      commission_amount: Number(body.commission_amount) >= 0 ? Number(body.commission_amount) : defaults.commissionAmount,
      commission_status: commissionStatus,
      admin_feedback: typeof body.admin_feedback === 'string' ? body.admin_feedback.trim().slice(0, 1600) || null : null,
      converted_at: body.status === 'converted' ? new Date().toISOString() : null,
    }
    const { data, error } = await database.from('ambassador_referrals').update(updates).eq('id', body.id).select('*').single()
    if (error) throw error
    return NextResponse.json({ referral: data })
  } catch (error) {
    console.error('Error updating ambassador record:', error)
    return NextResponse.json({ error: 'Failed to update the ambassador record.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getAmbassadorDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'Request details are required.' }, { status: 400 })

    if (body.entity === 'announcement') {
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : ''
      const announcementBody = typeof body.body === 'string' ? body.body.trim().slice(0, 4000) : ''
      if (!title || !announcementBody) return NextResponse.json({ error: 'Announcement title and message are required.' }, { status: 400 })
      const { data, error } = await database.from('ambassador_announcements').insert({ title, body: announcementBody, published: body.published !== false }).select('*').single()
      if (error) throw error
      return NextResponse.json({ announcement: data }, { status: 201 })
    }

    if (body.entity === 'resource') {
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : ''
      const resourceUrl = typeof body.resource_url === 'string' ? body.resource_url.trim().slice(0, 1000) : ''
      if (!title || !/^https?:\/\//i.test(resourceUrl)) return NextResponse.json({ error: 'Resource title and a valid HTTP(S) URL are required.' }, { status: 400 })
      const { data, error } = await database.from('ambassador_resources').insert({
        title,
        resource_url: resourceUrl,
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 1000) || null : null,
        published: body.published !== false,
      }).select('*').single()
      if (error) throw error
      return NextResponse.json({ resource: data }, { status: 201 })
    }

    if (typeof body.referral_id !== 'string') return NextResponse.json({ error: 'Referral is required.' }, { status: 400 })

    const { data: referral, error: referralError } = await database.from('ambassador_referrals').select('*').eq('id', body.referral_id).single()
    if (referralError || !referral) return NextResponse.json({ error: 'Referral not found.' }, { status: 404 })
    if (referral.status !== 'converted' || Number(referral.commission_amount) <= 0) {
      return NextResponse.json({ error: 'Only converted referrals with a commission can be scheduled.' }, { status: 409 })
    }
    const { data, error } = await database.from('ambassador_payouts').insert({
      ambassador_id: referral.ambassador_id,
      referral_id: referral.id,
      amount: referral.commission_amount,
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) || null : null,
    }).select('*').single()
    if (error?.code === '23505') return NextResponse.json({ error: 'A payout already exists for this referral.' }, { status: 409 })
    if (error) throw error
    await database.from('ambassador_referrals').update({ commission_status: 'approved' }).eq('id', referral.id)
    return NextResponse.json({ payout: data }, { status: 201 })
  } catch (error) {
    console.error('Error scheduling ambassador payout:', error)
    return NextResponse.json({ error: 'Failed to schedule the payout.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getAmbassadorDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity')
    const id = searchParams.get('id')
    const table = entity === 'announcement' ? 'ambassador_announcements' : entity === 'resource' ? 'ambassador_resources' : null
    if (!table || !id) return NextResponse.json({ error: 'A valid content record is required.' }, { status: 400 })
    const { error } = await database.from(table).delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ambassador content:', error)
    return NextResponse.json({ error: 'Failed to delete ambassador content.' }, { status: 500 })
  }
}
