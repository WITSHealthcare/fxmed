import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { getAmbassadorDatabase, makeAmbassadorCode } from '@/lib/ambassador-portal'
import { siteUrl } from '@/lib/seo'

export async function POST(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'ambassador')) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getAmbassadorDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as { application_id?: string } | null
    if (!body?.application_id) return NextResponse.json({ error: 'Application is required.' }, { status: 400 })

    const { data: application, error: applicationError } = await database.from('ambassador_applications').select('*').eq('id', body.application_id).single()
    if (applicationError || !application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    if (application.status !== 'approved') return NextResponse.json({ error: 'Approve the application before creating portal access.' }, { status: 409 })
    const redirectTo = `${siteUrl}/ambassador-portal/setup`
    const { data: existingProfile } = await database.from('ambassador_profiles').select('*').eq('application_id', application.id).maybeSingle()
    if (existingProfile) {
      const { data: existingUser, error: userError } = await database.auth.admin.getUserById(existingProfile.user_id)
      if (userError || !existingUser.user) return NextResponse.json({ error: 'The linked portal account could not be found.' }, { status: 409 })
      const { error: metadataError } = await database.auth.admin.updateUserById(existingProfile.user_id, {
        app_metadata: { ...existingUser.user.app_metadata, account_type: 'ambassador' },
        user_metadata: { ...existingUser.user.user_metadata, account_type: 'ambassador' },
      })
      if (metadataError) throw metadataError
      const { error: resetError } = await database.auth.resetPasswordForEmail(application.email, { redirectTo })
      if (resetError) throw resetError
      return NextResponse.json({ ambassador: existingProfile, delivery: 'password_reset', message: `A fresh activation email has been sent to ${application.email}. They can use it to create a new password and enter the portal.` })
    }

    const { data: listed, error: listError } = await database.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) throw listError
    let user = listed.users.find((candidate) => candidate.email?.toLowerCase() === application.email.toLowerCase())
    if (user?.app_metadata?.role) {
      return NextResponse.json({ error: 'This email belongs to an admin dashboard user. Use a separate ambassador email.' }, { status: 409 })
    }

    let delivery: 'invite' | 'password_reset' = 'invite'
    if (!user) {
      const { data: invited, error: inviteError } = await database.auth.admin.inviteUserByEmail(application.email, {
        redirectTo,
        data: { account_type: 'ambassador', first_name: application.first_name, last_name: application.last_name },
      })
      if (inviteError) throw inviteError
      user = invited.user
    } else {
      delivery = 'password_reset'
      const { error: updateError } = await database.auth.admin.updateUserById(user.id, {
        app_metadata: { ...user.app_metadata, account_type: 'ambassador' },
        user_metadata: { ...user.user_metadata, account_type: 'ambassador' },
      })
      if (updateError) throw updateError
      const { error: resetError } = await database.auth.resetPasswordForEmail(application.email, { redirectTo })
      if (resetError) throw resetError
    }

    await database.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, account_type: 'ambassador' },
    })
    const { data: profile, error } = await database.from('ambassador_profiles').insert({
      user_id: user.id,
      application_id: application.id,
      ambassador_code: makeAmbassadorCode(application.first_name, application.last_name),
      phone: application.phone,
      organization: application.organization,
      job_title: application.job_title,
    }).select('*').single()
    if (error) throw error
    return NextResponse.json({ ambassador: profile, delivery, message: `Portal access is ready. An activation email has been sent to ${application.email} so they can create a password and enter the portal.` }, { status: 201 })
  } catch (error) {
    console.error('Error inviting ambassador:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create portal access.' }, { status: 500 })
  }
}
