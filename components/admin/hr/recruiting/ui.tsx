'use client'

import type { ReactNode } from 'react'

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
export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' }) { return <div className="rounded-[18px] border bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{label}</p><p className={`mt-2 text-3xl font-bold ${tone === 'warn' ? 'text-red-600' : 'text-green-deep'}`}>{value}</p></div> }
const tones = { green: 'bg-green-50 text-green-700', gray: 'bg-gray-100 text-gray-600', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', blue: 'bg-sky-50 text-sky-700' }
export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: keyof typeof tones }) { return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}>{children}</span> }
export function Alert({ children }: { children: ReactNode }) { return children ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div> : null }
export function Modal({ title, eyebrow, onClose, wide, children }: { title: string; eyebrow?: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[94vh] w-full overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>
    <div className="flex justify-between gap-4"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-green-mid">{eyebrow}</p>}<h3 className="mt-1 text-2xl font-bold text-green-deep">{title}</h3></div><button onClick={onClose} aria-label="Close" className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div>
    <div className="mt-6">{children}</div></div></div>
}
export function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-lg"><div className="flex flex-wrap items-center justify-between gap-4 border-b p-6"><div><h3 className="text-2xl font-bold text-green-deep">{title}</h3>{description && <p className="mt-1 text-sm text-text-mid">{description}</p>}</div>{action}</div>{children}</section>
}
export const primary = 'rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'
export const outline = 'rounded-full border px-4 py-2 text-xs font-bold text-green-deep disabled:opacity-50'
export const danger = 'rounded-full px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50'
export const Empty = ({ children }: { children: ReactNode }) => <p className="p-12 text-center text-sm text-text-mid">{children}</p>
