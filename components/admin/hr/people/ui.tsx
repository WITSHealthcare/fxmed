'use client'

import type { ReactNode } from 'react'

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
export function Stat({ label, value, tone = '' }: { label: string; value: number | string; tone?: string }) { return <div className="rounded-[18px] border bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{label}</p><p className={`mt-2 text-3xl font-bold text-green-deep ${tone}`}>{value}</p></div> }
export function Badge({ children, tone = 'bg-green-50 text-green-700' }: { children: ReactNode; tone?: string }) { return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{children}</span> }
export function Alert({ children }: { children: ReactNode }) { return children ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div> : null }
export function Card({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 border-b p-6"><div><h3 className="text-xl font-bold text-green-deep">{title}</h3>{description && <p className="mt-1 text-sm text-text-mid">{description}</p>}</div>{action}</div>{children}</section>
}
export function Modal({ title, eyebrow, onClose, children, wide }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[94vh] w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl`}><div className="flex justify-between gap-4"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-green-mid">{eyebrow}</p>}<h3 className="mt-1 text-2xl font-bold text-green-deep">{title}</h3></div><button type="button" aria-label="Close" onClick={onClose} className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div><div className="mt-6">{children}</div></div></div>
}
export const buttonPrimary = 'rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'
export const buttonSecondary = 'rounded-full border px-4 py-2 text-xs font-bold text-green-deep disabled:opacity-50'
export const Empty = ({ children }: { children: ReactNode }) => <p className="p-10 text-center text-sm text-text-mid">{children}</p>
