import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminRoleLabels, getConfiguredAdminEmails, type AdminRole, isAdminUser } from '@/lib/admin-auth'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { writeAdminActivity } from '@/lib/admin-activity'

const validRoles = new Set<AdminRole>(['admin', 'clinical', 'sales'])

function getStoredDashboardRole(user: { email?: string; app_metadata?: Record<string, any>; user_metadata?: Record<string, any> }): AdminRole | null {
  const role = user.app_metadata?.role || user.user_metadata?.role
  if (validRoles.has(role)) return role
  if (user.email && getConfiguredAdminEmails().includes(user.email.toLowerCase())) return 'admin'
  return null
}

function isUserActive(user: { banned_until?: string; app_metadata?: Record<string, any> }) {
  const isBanned = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now())
  return user.app_metadata?.dashboard_active !== false && !isBanned
}

function serializeDashboardUser(user: any, role: AdminRole) {
  return {
    id: user.id,
    email: user.email,
    role,
    roleLabel: adminRoleLabels[role],
    confirmed: Boolean(user.email_confirmed_at),
    active: isUserActive(user),
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_sign_in_at: user.last_sign_in_at || null,
  }
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin configuration is missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const requester = await getRequestAdminUser(request)
    if (!requester || !isAdminUser(requester)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const requestedUserId = new URL(request.url).searchParams.get('userId')
    if (requestedUserId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedUserId)) {
        return NextResponse.json({ error: 'A valid user is required' }, { status: 400 })
      }
      const { data: targetResult, error: targetError } = await supabaseAdmin.auth.admin.getUserById(requestedUserId)
      if (targetError || !targetResult.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const target = targetResult.user
      const role = getStoredDashboardRole(target)
      if (!role) return NextResponse.json({ error: 'This is not a dashboard user' }, { status: 400 })

      const [adminLogs, emrLogs] = await Promise.all([
        supabaseAdmin.from('admin_activity_logs').select('id,action,module,entity_type,entity_id,description,outcome,metadata,created_at').or(`user_id.eq.${requestedUserId},subject_user_id.eq.${requestedUserId}`).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('emr_audit_logs').select('id,action,entity_type,entity_id,metadata,created_at').eq('user_id', requestedUserId).order('created_at', { ascending: false }).limit(100),
      ])
      const isMissingActivityTable = adminLogs.error?.code === '42P01' || adminLogs.error?.code === 'PGRST205'
      if (adminLogs.error && !isMissingActivityTable) throw adminLogs.error
      if (emrLogs.error && emrLogs.error.code !== '42P01' && emrLogs.error.code !== 'PGRST205') throw emrLogs.error

      const activity = [
        ...(adminLogs.data || []).map(log => ({ ...log, id: `admin-${log.id}`, source: 'admin' })),
        ...(emrLogs.data || []).map(log => ({ ...log, id: `emr-${log.id}`, source: 'emr', module: 'Healthcare / EMR', description: String(log.action).replace(/_/g, ' ') })),
        { id: `auth-created-${target.id}`, source: 'auth', action: 'account_created', module: 'Authentication', entity_type: 'dashboard_user', entity_id: target.id, description: 'Dashboard account created', outcome: 'success', metadata: {}, created_at: target.created_at },
        ...(target.last_sign_in_at ? [{ id: `auth-login-${target.id}`, source: 'auth', action: 'last_sign_in', module: 'Authentication', entity_type: 'dashboard_user', entity_id: target.id, description: 'Most recent successful sign in', outcome: 'success', metadata: {}, created_at: target.last_sign_in_at }] : []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100)

      return NextResponse.json({ activity, migrationRequired: isMissingActivityTable })
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error

    const users = data.users.flatMap((user) => {
      const role = getStoredDashboardRole(user)
      if (!role) return []
      return [serializeDashboardUser(user, role)]
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ users, currentUserId: requester.id })
  } catch (error: any) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const requester = await getRequestAdminUser(request)
    if (!requester || !isAdminUser(requester)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    const action = body.action === 'reset_password' ? 'reset_password' : 'set_active'
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'A valid user is required' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdminClient()
    const { data: targetResult, error: targetError } = await supabaseAdmin.auth.admin.getUserById(id)
    if (targetError || !targetResult.user) throw targetError || new Error('User not found')
    const target = targetResult.user
    const role = getStoredDashboardRole(target)
    if (!role) return NextResponse.json({ error: 'This is not a dashboard user' }, { status: 400 })

    if (action === 'reset_password') {
      const password = typeof body.password === 'string' ? body.password : ''
      if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return NextResponse.json({ error: 'Password must include at least one letter and one number' }, { status: 400 })

      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
      if (error) throw error
      await writeAdminActivity(supabaseAdmin, requester, {
        action: 'reset_user_password',
        module: 'Users & Roles',
        description: `Reset the password for ${target.email || 'a dashboard user'}`,
        entityType: 'dashboard_user',
        entityId: target.id,
        subjectUserId: target.id,
        metadata: { target_email: target.email, target_role: role },
      })
      return NextResponse.json({ success: true })
    }

    const active = body.active
    if (typeof active !== 'boolean') return NextResponse.json({ error: 'A valid account status is required' }, { status: 400 })
    if (id === requester.id && !active) return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })

    if (!active && role === 'admin') {
      const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      const activeAdmins = userList.users.filter(user => getStoredDashboardRole(user) === 'admin' && isUserActive(user))
      if (activeAdmins.length <= 1) return NextResponse.json({ error: 'The last active administrator cannot be deactivated' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: active ? 'none' : '876000h',
      app_metadata: { ...target.app_metadata, dashboard_active: active },
    })
    if (error) throw error

    await writeAdminActivity(supabaseAdmin, requester, {
      action: active ? 'reactivate_user' : 'deactivate_user',
      module: 'Users & Roles',
      description: `${active ? 'Reactivated' : 'Deactivated'} dashboard access for ${target.email || 'a user'}`,
      entityType: 'dashboard_user',
      entityId: target.id,
      subjectUserId: target.id,
      metadata: { target_email: target.email, target_role: role },
    })

    return NextResponse.json({ user: serializeDashboardUser(data.user, role) })
  } catch (error: any) {
    console.error('Error updating dashboard user:', error)
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const requester = await getRequestAdminUser(request)
    if (!requester || !isAdminUser(requester)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const role = body.role as AdminRole

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: 'Password must include at least one letter and one number' }, { status: 400 })
    }

    if (!validRoles.has(role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role,
        is_admin: role === 'admin',
        dashboard_active: true,
      },
      user_metadata: {
        role,
        is_admin: role === 'admin',
      },
    })

    if (error) throw error

    await writeAdminActivity(supabaseAdmin, requester, {
      action: 'create_user',
      module: 'Users & Roles',
      description: `Created ${adminRoleLabels[role]} account for ${email}`,
      entityType: 'dashboard_user',
      entityId: data.user.id,
      subjectUserId: data.user.id,
      metadata: { target_email: email, target_role: role },
    })

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
        roleLabel: adminRoleLabels[role],
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating admin user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}
