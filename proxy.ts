import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isDashboardUser } from '@/lib/admin-auth'
import { legacyAdminUrl } from '@/lib/admin-routes'

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
  // Signed in with the password but not yet with the two-step code.
  let needsTwoStepCode = false
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isAllowedDashboardUser = isDashboardUser(user)
    if (isAllowedDashboardUser) {
      // Optional two-step sign-in: only accounts that turned it on are asked
      // for a code. A failed lookup never blocks a normal password sign-in.
      try {
        const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        needsTwoStepCode = level?.nextLevel === 'aal2' && level.currentLevel !== 'aal2'
      } catch (error) {
        console.error('proxy two-step check failed:', error)
      }
    }
  } catch (error) {
    // Never let a transient auth lookup failure turn into a 500 ("This page couldn't
    // load"). Treat it as unauthenticated; the client-side guard on /admin re-checks
    // and redirects if needed.
    console.error('proxy auth check failed:', error)
    isAllowedDashboardUser = false
  }

  if (pathname === '/admin/login') {
    if (!isAllowedDashboardUser) return response
    if (!needsTwoStepCode) return redirectTo('/admin')
    // The login page asks for the code when it sees ?step=code.
    if (request.nextUrl.searchParams.get('step') === 'code') return response
    const next = request.nextUrl.searchParams.get('next')
    return redirectTo('/admin/login', { step: 'code', ...(next ? { next } : {}) })
  }

  if (!isAllowedDashboardUser) {
    return redirectTo('/admin/login', { next: `${pathname}${request.nextUrl.search}` })
  }

  if (needsTwoStepCode) {
    return redirectTo('/admin/login', { step: 'code', next: `${pathname}${request.nextUrl.search}` })
  }

  // Old links named the tab in the query (/admin?tab=healthcare&view=...).
  // Each area now has its own address, so send them there.
  if (pathname === '/admin') {
    const target = legacyAdminUrl(request.nextUrl.searchParams)
    if (target) {
      const url = new URL(target, request.url)
      const redirect = NextResponse.redirect(url)
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
      return redirect
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
