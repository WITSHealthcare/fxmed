import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { adminRoleLabels, type AdminRole, isAdminUser } from '@/lib/admin-auth'

const validRoles = new Set<AdminRole>(['admin', 'clinical', 'ambassador', 'sales'])

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

async function getRequestUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth configuration is missing')
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // User management does not refresh auth cookies from this route.
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  return user
}

export async function GET(request: NextRequest) {
  try {
    const requester = await getRequestUser(request)
    if (!isAdminUser(requester)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error

    const users = data.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role || user.user_metadata?.role || 'staff',
      roleLabel: adminRoleLabels[user.app_metadata?.role as AdminRole] || adminRoleLabels[user.user_metadata?.role as AdminRole] || 'Staff',
      confirmed: Boolean(user.email_confirmed_at),
      created_at: user.created_at,
    }))

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const requester = await getRequestUser(request)
    if (!isAdminUser(requester)) {
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
      },
      user_metadata: {
        role,
        is_admin: role === 'admin',
      },
    })

    if (error) throw error

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
