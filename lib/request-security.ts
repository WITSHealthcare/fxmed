import type { NextRequest } from 'next/server'

type RateLimitEntry = { count: number; resetAt: number }

const rateLimits = new Map<string, RateLimitEntry>()

export function getClientAddress(request: NextRequest) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/**
 * Best-effort application rate limiting. This protects a warm server instance;
 * production should also enforce limits at the CDN/WAF layer.
 */
export function checkRateLimit(request: NextRequest, scope: string, limit: number, windowMs: number) {
  const now = Date.now()
  const key = `${scope}:${getClientAddress(request)}`
  const current = rateLimits.get(key)

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }

  current.count += 1
  return { allowed: true, retryAfter: 0 }
}

export function cleanPublicString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const valueTrimmed = value.trim()
  return valueTrimmed ? valueTrimmed.slice(0, maxLength) : null
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
