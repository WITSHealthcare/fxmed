import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isDashboardUser } from '@/lib/admin-auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Build a redirect that carries over any auth cookies refreshed during getUser().
  // Returning a bare NextResponse.redirect() drops those cookies, which de-syncs the
  // browser and server sessions and causes intermittent logouts / redirect bounces.
  const redirectTo = (target: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone()
    url.pathname = target
    url.search = ''
    if (params) {
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    }
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return pathname === '/admin/login' ? response : redirectTo('/admin/login', { error: 'auth-config' })
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  let isAllowedDashboardUser = false
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isAllowedDashboardUser = isDashboardUser(user)
  } catch (error) {
    // Never let a transient auth lookup failure turn into a 500 ("This page couldn't
    // load"). Treat it as unauthenticated; the client-side guard on /admin re-checks
    // and redirects if needed.
    console.error('proxy auth check failed:', error)
    isAllowedDashboardUser = false
  }

  if (pathname === '/admin/login') {
    return isAllowedDashboardUser ? redirectTo('/admin') : response
  }

  if (!isAllowedDashboardUser) {
    return redirectTo('/admin/login', { next: pathname })
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
