import type { NextRequest } from 'next/server'
import { siteUrl } from '@/lib/seo'

function isLocalUrl(value: string) {
  try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(value).hostname) }
  catch { return true }
}

/**
 * Absolute URL for a portal page that invite and reset emails link to.
 * Prefers the host handling the admin request so preview and production
 * deployments send users back to themselves. Never emails a localhost link
 * from a production deployment, even if an environment variable is stale.
 */
export function portalUrl(request: NextRequest, path: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const requestOrigin = forwardedHost ? `${forwardedProto || 'https'}://${forwardedHost}` : request.nextUrl.origin
  const origin = process.env.NODE_ENV === 'production' && isLocalUrl(requestOrigin)
    ? siteUrl
    : requestOrigin
  const safeOrigin = process.env.NODE_ENV === 'production' && isLocalUrl(origin)
    ? 'https://www.fxmed.ng'
    : origin.replace(/\/+$/, '')
  return `${safeOrigin}${path}`
}
