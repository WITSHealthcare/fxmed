'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Counts visits to the public website for the admin SEO Analytics tab (see
// migration 046). No cookies: a visit is a random id kept for the tab's
// session, and the server works out a daily visitor from the request. Staff
// and patient areas are never counted, nor anyone whose browser asks not to be
// tracked.

const privatePrefixes = ['/admin', '/patient-portal', '/ambassador-portal']
const sessionKey = 'fxmed-visit'
let lastView: { id: string; path: string; at: number } | null = null

function send(data: Record<string, unknown>) {
  const body = JSON.stringify(data)
  try {
    if (navigator.sendBeacon?.('/api/analytics/collect', body)) return
  } catch {
    // Fall through to fetch.
  }
  fetch('/api/analytics/collect', { method: 'POST', body, keepalive: true }).catch(() => {})
}

function optedOut() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true
}

export default function SiteTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || privatePrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)) || optedOut()) return

    // The same page again straight away, as React does in development, or a
    // re-render: keep counting the view already recorded.
    const repeat = lastView && lastView.path === pathname && Date.now() - lastView.at < 2000
    const id = repeat && lastView ? lastView.id : crypto.randomUUID()
    if (!repeat) {
      let sessionId: string
      let entry = false
      try {
        sessionId = sessionStorage.getItem(sessionKey) || ''
        if (!sessionId) {
          sessionId = crypto.randomUUID()
          sessionStorage.setItem(sessionKey, sessionId)
          entry = true
        }
      } catch {
        // Storage blocked: count the page on its own.
        sessionId = crypto.randomUUID()
        entry = true
      }
      lastView = { id, path: pathname, at: Date.now() }
      const params = new URLSearchParams(window.location.search)
      send({
        type: 'view',
        id,
        sessionId,
        entry,
        path: pathname,
        // Where the visit came from, and its campaign tags, only for its first page.
        referrer: entry ? document.referrer : '',
        utm: entry ? {
          source: params.get('utm_source'),
          medium: params.get('utm_medium'),
          campaign: params.get('utm_campaign'),
          gclid: params.has('gclid'),
          fbclid: params.has('fbclid'),
        } : undefined,
        width: window.innerWidth,
      })
    }

    // Time the page was actually visible.
    let visibleMs = 0
    let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null
    const seconds = () => Math.round((visibleMs + (visibleSince ? Date.now() - visibleSince : 0)) / 1000)
    const leave = () => send({ type: 'leave', id, seconds: seconds() })
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince) visibleMs += Date.now() - visibleSince
        visibleSince = null
        leave()
      } else {
        visibleSince = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', leave)
    return () => {
      // Moving to another page ends this one.
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', leave)
      leave()
    }
  }, [pathname])

  return null
}
