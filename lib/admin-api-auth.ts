import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { canAccessTab, getUserAdminRole, type AdminRole, type AdminTab } from '@/lib/admin-auth'

export async function getAuthorizedAdminRole(request: NextRequest, tab: AdminTab): Promise<AdminRole | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null

  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll() {
        // API authorization checks do not refresh browser cookies.
      },
    },
  })

  try {
    const { data: { user }, error } = await client.auth.getUser()
    if (error) return null
    const role = getUserAdminRole(user)
    return canAccessTab(role, tab) ? role : null
  } catch {
    return null
  }
}
