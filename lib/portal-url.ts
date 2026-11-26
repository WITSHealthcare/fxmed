import type { NextRequest } from 'next/server'
import { siteUrl } from '@/lib/seo'

const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]']

function isLocalUrl(value: string) {
  try { return localHosts.includes(new URL(value).hostname) }
  catch { return true }
}

/**
 * Hosts this app is served from: the site address (with and without www) and,
 * on Vercel, this deployment's own addresses, so preview links stay on the
 * preview. Never a host taken only from the request.
 */
function trustedHosts() {
  const bare = new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, '')
  return new Set([bare, `www.${bare}`, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((host): host is string => Boolean(host))
    .map(host => host.toLowerCase().replace(/^https?:\/\//, '').replace(/[:/].*$/, '')))
}

/**
 * Absolute URL for a portal page that invite and reset emails link to.
 * Prefers the host handling the request so preview and production
 * deployments send users back to themselves, but only when that host is one
 * of this app's own: the Host and X-Forwarded-Host headers come from the
 * caller, and some of these links are requested by anyone (password resets),
 * so an unknown host falls back to the site URL rather than putting a
 * stranger's domain in an email. Never emails a localhost link from a
 * production deployment, even if an environment variable is stale.
 */
export function portalUrl(request: NextRequest, path: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  let origin = siteUrl
  try {
    const candidate = new URL(forwardedHost ? `${forwardedProto === 'http' ? 'http' : 'https'}://${forwardedHost}` : request.nextUrl.origin)
    const local = localHosts.includes(candidate.hostname)
    const trusted = local
      ? process.env.NODE_ENV !== 'production'
      : candidate.protocol === 'https:' && trustedHosts().has(candidate.hostname.toLowerCase())
    if (trusted) origin = candidate.origin
  } catch {
    // An unreadable host: use the site URL.
  }
  const safeOrigin = process.env.NODE_ENV === 'production' && isLocalUrl(origin)
    ? 'https://www.fxmed.ng'
    : origin.replace(/\/+$/, '')
  return `${safeOrigin}${path}`
}
