import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { writeAdminActivity } from '@/lib/admin-activity'

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request)
    if (!user?.email) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })

    const body = await request.json().catch(() => null) as { currentPassword?: string; newPassword?: string } | null
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword) return NextResponse.json({ error: 'Your current password is required' }, { status: 400 })
    if (newPassword.length < 8) return NextResponse.json({ error: 'Your new password must be at least 8 characters' }, { status: 400 })
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return NextResponse.json({ error: 'Your new password must include at least one letter and one number' }, { status: 400 })
    if (currentPassword === newPassword) return NextResponse.json({ error: 'Your new password must be different from your current password' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceRoleKey) return NextResponse.json({ error: 'Authentication configuration is unavailable' }, { status: 503 })

    const authClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (signInError || signInData.user?.id !== user.id) {
      return NextResponse.json({ error: 'Your current password is incorrect' }, { status: 400 })
    }

    const { error: updateError } = await authClient.auth.updateUser({ password: newPassword })
    if (updateError) return NextResponse.json({ error: updateError.message || 'Password could not be updated' }, { status: 400 })

    const { data: sessionData } = await authClient.auth.getSession()
    const database = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    await writeAdminActivity(database, user, {
      action: 'change_password',
      module: 'My Account',
      description: 'Changed account password',
      entityType: 'dashboard_user',
      entityId: user.id,
      subjectUserId: user.id,
    })

    return NextResponse.json({
      success: true,
      session: sessionData.session ? {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      } : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error changing dashboard password:', error)
    return NextResponse.json({ error: 'Password could not be updated' }, { status: 500 })
  }
}
