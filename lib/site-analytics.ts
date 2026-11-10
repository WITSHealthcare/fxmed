import { createHash } from 'crypto'

// Recording visits to the public website (see migration 046). Server only.

/** Staff and patient areas are never recorded. */
const privatePrefixes = ['/admin', '/patient-portal', '/ambassador-portal', '/api']
export function isPrivatePath(path: string) {
  return privatePrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

const botPattern = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp\/|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client|java\//i
export function isBot(userAgent: string) {
  return !userAgent || botPattern.test(userAgent)
}

/** A rough device, browser and operating system, from the user agent. */
export function describeBrowser(userAgent: string, width?: number) {
  const ua = userAgent
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'Tablet'
    : /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua) || (width !== undefined && width > 0 && width < 640) ? 'Mobile'
    : 'Desktop'
  const browser = /FBAN|FBAV|FB_IAB/.test(ua) ? 'Facebook app'
    : /Instagram/.test(ua) ? 'Instagram app'
    : /WhatsApp/i.test(ua) ? 'WhatsApp'
    : /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome'
    : /FxiOS|Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Other'
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Other'
  return { device, browser, os }
}

// Referring hosts and campaign sources, as people would name them. AI
// assistants come before Google, since gemini.google.com is a Google host.
const sourceRules: Array<[RegExp, string]> = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$|^openai$|^chatgpt$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$|^perplexity$/, 'Perplexity'],
  [/^gemini\.google\.com$|^gemini$/, 'Gemini'],
  [/(^|\.)copilot\.microsoft\.com$|^copilot$/, 'Copilot'],
  [/^mail\.google\.com$|(^|\.)mail\.yahoo\.com$|(^|\.)outlook\.(live|office)\.com$|^e-?mail$|^newsletter$/, 'Email'],
  [/(^|\.)google\.[a-z.]+$|^google$/, 'Google'],
  [/(^|\.)bing\.com$|^bing$/, 'Bing'],
  [/(^|\.)yahoo\.com$|^yahoo$/, 'Yahoo'],
  [/(^|\.)duckduckgo\.com$|^duckduckgo$/, 'DuckDuckGo'],
  [/(^|\.)yandex\.[a-z]+$/, 'Yandex'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'],
  [/(^|\.)baidu\.com$/, 'Baidu'],
  [/(^|\.)facebook\.com$|^fb\.me$|^fb$|^facebook$/, 'Facebook'],
  [/(^|\.)instagram\.com$|^ig$|^instagram$/, 'Instagram'],
  [/(^|\.)whatsapp\.com$|^wa\.me$|^whatsapp$/, 'WhatsApp'],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$|^twitter$|^x$/, 'X (Twitter)'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^linkedin$/, 'LinkedIn'],
  [/(^|\.)tiktok\.com$|^tiktok$/, 'TikTok'],
  [/(^|\.)youtube\.com$|^youtu\.be$|^youtube$/, 'YouTube'],
  [/(^|\.)threads\.net$|^threads$/, 'Threads'],
  [/(^|\.)pinterest\.[a-z.]+$|^pinterest$/, 'Pinterest'],
  [/(^|\.)telegram\.(org|me)$|^t\.me$|^telegram$/, 'Telegram'],
]

const nameFor = (value: string) => sourceRules.find(([pattern]) => pattern.test(value))?.[1]

/**
 * Where a visit came from: a campaign tag first, then ad click ids, then the
 * referring site. No referrer, or one from this site, is Direct.
 */
export function classifySource({ referrerHost, utmSource, clickIds }: { referrerHost: string | null; utmSource: string | null; clickIds: { gclid?: boolean; fbclid?: boolean } }) {
  if (utmSource) {
    const tag = utmSource.trim().toLowerCase()
    return nameFor(tag) || utmSource.trim().slice(0, 60)
  }
  if (clickIds.gclid) return 'Google Ads'
  if (clickIds.fbclid && !referrerHost) return 'Facebook'
  if (!referrerHost) return 'Direct'
  return nameFor(referrerHost) || referrerHost.replace(/^www\./, '')
}

/** The referring site's host, or null when there is none or it is this site. */
export function referrerHostOf(referrer: string, siteHost: string) {
  try {
    const host = new URL(referrer).hostname.toLowerCase()
    const bare = (value: string) => value.replace(/^www\./, '')
    return !host || bare(host) === bare(siteHost) ? null : host
  } catch {
    return null
  }
}

/**
 * A visitor for one Lagos day: a one-way hash of their IP address and browser
 * with a secret salt. It changes every day, so it cannot follow anyone over
 * time, and the IP itself is never stored.
 */
export function visitorHash(ip: string, userAgent: string, day: string) {
  const salt = process.env.ANALYTICS_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fxmed'
  return createHash('sha256').update(`${salt}|${day}|${ip}|${userAgent}`).digest('hex').slice(0, 32)
}

/** Vercel's location headers, decoded. Absent when not running on Vercel. */
export function locationOf(headers: Headers) {
  const read = (name: string) => {
    const value = headers.get(name)
    if (!value) return null
    try { return decodeURIComponent(value).slice(0, 80) } catch { return value.slice(0, 80) }
  }
  return { country: read('x-vercel-ip-country'), region: read('x-vercel-ip-country-region'), city: read('x-vercel-ip-city') }
}
