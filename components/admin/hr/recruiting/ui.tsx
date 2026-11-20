'use client'

import type { ReactNode } from 'react'
import { Stat as BaseStat } from '@/components/admin/ui'
export { Alert, Badge, Card as Section, Empty, Modal } from '@/components/admin/ui'

// Small shared pieces for the recruiting screens (styled like Training.tsx).
export const api = '/api/admin/hr/recruiting'
export async function call<T = Record<string, unknown>>(url: string, method = 'GET', body?: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const response = await fetch(url, body instanceof FormData ? { method, body } : { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  return { ok: response.ok, data }
}
const dayFormat = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
const timeFormat = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })
export const showDate = (value: string | null | undefined) => value ? dayFormat.format(new Date(value.length === 10 ? `${value}T12:00:00+01:00` : value)) : '—'
export const showTime = (value: string | null | undefined) => value ? timeFormat.format(new Date(value)) : '—'
// datetime-local value read as Lagos time (UTC+1, no daylight saving).
export const fromLocalInput = (value: string) => value ? `${value}:00+01:00` : null

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label className="block text-sm font-bold text-green-deep">{label} {hint && <span className="font-normal text-gray-400">— {hint}</span>}<div className="mt-1">{children}</div></label> }
export const primary = 'rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'
export const outline = 'rounded-full border px-4 py-2 text-xs font-bold text-green-deep disabled:opacity-50'
export const danger = 'rounded-full px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50'
// Recruiting's warning figures (overdue scorecards, lapsed offers) are red.
export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' }) { return <BaseStat label={label} value={value} tone={tone === 'warn' ? 'danger' : undefined} /> }
