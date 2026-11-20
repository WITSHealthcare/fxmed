'use client'

import type { ReactNode } from 'react'
export { Alert, Badge, Card, Empty, Modal, Stat } from '@/components/admin/ui'

// Small shared pieces for the People area, styled like Training.tsx.
export const peopleApi = '/api/admin/hr/people'
const dateFormat = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
export const formatDay = (value: string | null | undefined) => value ? dateFormat.format(new Date(value.length === 10 ? `${value}T12:00:00+01:00` : value)) : '—'

// JSON (or FormData) request; returns the parsed body or throws the API's message.
export async function call<T = Record<string, unknown>>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const init: RequestInit = { method }
  if (body instanceof FormData) init.body = body
  else if (body !== undefined) { init.body = JSON.stringify(body); init.headers = { 'Content-Type': 'application/json' } }
  const response = await fetch(url, init); const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Something went wrong.')
  return result as T
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) { return <label className={`block text-sm font-bold text-green-deep ${className}`}>{label} {hint && <span className="font-normal text-gray-400">— {hint}</span>}{children}</label> }
export const buttonPrimary = 'rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'
export const buttonSecondary = 'rounded-full border px-4 py-2 text-xs font-bold text-green-deep disabled:opacity-50'