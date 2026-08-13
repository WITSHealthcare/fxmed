import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { canAccessCrmView, canAccessTab, getUserAdminRole, type AdminRole, type AdminTab, type CrmAccess } from '@/lib/admin-auth'

export async function getRequestAdminUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null

  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: { getAll: () => request.cookies.getAll(), setAll() {} },
  })
  try {
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) return null

    // Check the authoritative auth record so deactivation takes effect even
    // while a previously issued browser token is still valid.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) return user.app_metadata?.dashboard_active === false ? null : user
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error: lookupError } = await adminClient.auth.admin.getUserById(user.id)
    if (lookupError || !data.user || data.user.app_metadata?.dashboard_active === false) return null
    if (data.user.banned_until && new Date(data.user.banned_until).getTime() > Date.now()) return null
    return data.user
  } catch {
    return null
  }
}

export async function getAuthorizedAdminRole(request: NextRequest, tab: AdminTab): Promise<AdminRole | null> {
  const user = await getRequestAdminUser(request)
  const role = getUserAdminRole(user)
  return canAccessTab(role, tab) ? role : null
}

export async function getAuthorizedCrmRole(request: NextRequest, view: CrmAccess): Promise<AdminRole | null> {
  const user = await getRequestAdminUser(request)
  const role = getUserAdminRole(user)
  return canAccessTab(role, 'crm') && canAccessCrmView(role, view) ? role : null
}
