import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lagosToday } from '@/lib/bookingTimes'
import { checkRateLimit } from '@/lib/request-security'
import { siteUrl } from '@/lib/seo'
import { classifySource, describeBrowser, isBot, isPrivatePath, locationOf, referrerHostOf, visitorHash } from '@/lib/site-analytics'

// POST - A page view from the public website (components/SiteTracker), or how
// long that page was visible. Sent with navigator.sendBeacon, so the reply is
// always 204 and the work happens after it. Only the live site is recorded,
// never previews or local development, unless ANALYTICS_ANY_HOST is "true".

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

const siteHost = new URL(siteUrl).hostname
const bare = (host: string) => host.toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '')
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
const done = () => new NextResponse(null, { status: 204 })

export async function POST(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  if (!supabase || (process.env.ANALYTICS_ANY_HOST !== 'true' && bare(host) !== bare(siteHost))) return done()
  const userAgent = request.headers.get('user-agent') || ''
  if (isBot(userAgent)) return done()
  if (!checkRateLimit(request, 'analytics-collect', 300, 5 * 60 * 1000).allowed) return done()

  let body: Record<string, any>
  try {
    body = JSON.parse(await request.text())
  } catch {
    return done()
  }
  if (!body || typeof body !== 'object' || !uuidPattern.test(String(body.id || ''))) return done()

  if (body.type === 'leave') {
    const seconds = Number(body.seconds)
    if (!Number.isFinite(seconds) || seconds < 0) return done()
    after(async () => {
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase.from('site_page_views').update({ duration_seconds: Math.min(Math.round(seconds), 1800) }).eq('id', body.id).gte('created_at', since)
      if (error && error.code !== '42P01' && error.code !== 'PGRST205') console.error('Analytics: time on page not saved:', error.message)
    })
    return done()
  }

  const path = text(body.path, 300)
  const sessionId = text(body.sessionId, 64)
  if (body.type !== 'view' || !path || !path.startsWith('/') || isPrivatePath(path) || !sessionId || !/^[A-Za-z0-9-]+$/.test(sessionId)) return done()

  const entry = body.entry === true
  const utm = entry && body.utm && typeof body.utm === 'object' ? body.utm : {}
  const referrerHost = entry ? referrerHostOf(String(body.referrer || ''), host) : null
  const utmSource = text(utm.source, 100)
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || ''
  const width = Number(body.width)
  // Read from the request now; the insert runs after the reply.
  const location = locationOf(request.headers)
  const browser = describeBrowser(userAgent, Number.isFinite(width) ? width : undefined)

  after(async () => {
    const { error } = await supabase.from('site_page_views').insert({
      id: body.id,
      visitor_hash: visitorHash(ip, userAgent, lagosToday()),
      session_id: sessionId,
      is_entry: entry,
      path: path.split('?')[0].split('#')[0],
      referrer_host: referrerHost,
      source: entry ? classifySource({ referrerHost, utmSource, clickIds: { gclid: utm.gclid === true, fbclid: utm.fbclid === true } }) : 'Direct',
      utm_source: utmSource,
      utm_medium: text(utm.medium, 100),
      utm_campaign: text(utm.campaign, 150),
      ...location,
      ...browser,
    })
    // Before migration 046 the table is missing; the site carries on regardless.
    if (error && error.code !== '42P01' && error.code !== 'PGRST205' && error.code !== '23505') console.error('Analytics: page view not saved:', error.message)
  })
  return done()
}
