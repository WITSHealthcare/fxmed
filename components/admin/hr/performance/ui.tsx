'use client'

import { displayName, type HrEmployee } from '@/lib/hr'
import { hrPerformanceApi } from '@/lib/hr-performance'

// Shared bits for the Performance, Leave & Pay screens (styled like Training.tsx).
export type ApiResult<T = Record<string, unknown>> = { ok: boolean; data: T & { error?: string; warnings?: string[] } }
export async function call<T = Record<string, unknown>>(path: string, method = 'GET', body?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(`${hrPerformanceApi}${path}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  return { ok: response.ok, data: await response.json().catch(() => ({ error: 'Unexpected response from the server.' })) }
}
export const nameOf = (employees: Pick<HrEmployee, 'id' | 'legal_name' | 'preferred_name'>[], id: string | null | undefined) => { const employee = employees.find((item) => item.id === id); return employee ? displayName(employee) : '—' }

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-green-deep">{label} {hint && <span className="font-normal text-gray-400">— {hint}</span>}<div className="mt-1">{children}</div></label> }
export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'warn' }) { return <div className="rounded-[18px] border bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{label}</p><p className={`mt-2 text-3xl font-bold ${tone === 'warn' ? 'text-amber-600' : 'text-green-deep'}`}>{value}</p></div> }
const tones = { green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', gray: 'bg-gray-100 text-gray-600', blue: 'bg-sky-50 text-sky-700' }
export function Badge({ children, tone = 'green' }: { children: React.ReactNode; tone?: keyof typeof tones }) { return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}>{children}</span> }
export const statusTone = (status: string): keyof typeof tones => ['final', 'approved', 'approved_with_changes', 'taken', 'met', 'passed', 'done', 'closed', 'agreed', 'on_track'].includes(status) ? 'green'
  : ['declined', 'not_met', 'not_passed', 'missing', 'cancelled_by_employer'].includes(status) ? 'red' : ['cancelled', 'dropped', 'not_applicable'].includes(status) ? 'gray' : ['submitted', 'calibration', 'at_risk', 'extended', 'active'].includes(status) ? 'amber' : 'blue'

export function Card({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><h3 className="text-xl font-bold text-green-deep">{title}</h3>{description && <p className="mt-1 text-sm text-text-mid">{description}</p>}</div>{action}</div>{children}</section>
}
export function Empty({ children }: { children: React.ReactNode }) { return <p className="p-10 text-center text-sm text-text-mid">{children}</p> }
export function Alert({ children, tone = 'error' }: { children: React.ReactNode; tone?: 'error' | 'info' }) { return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{children}</div> }

export function Modal({ title, eyebrow, onClose, children, wide }: { title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[94vh] w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl`}>
      <div className="flex justify-between gap-4"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-green-mid">{eyebrow}</p>}<h3 className="mt-1 text-2xl font-bold text-green-deep">{title}</h3></div><button onClick={onClose} aria-label="Close" className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div>
      <div className="mt-6">{children}</div>
    </div>
  </div>
}
export function Buttons({ onCancel, saving, label, extra }: { onCancel: () => void; saving: boolean; label: string; extra?: React.ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-3 pt-2"><button type="button" onClick={onCancel} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button>{extra}<button disabled={saving} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : label}</button></div>
}
export const smallButton = 'rounded-full border px-4 py-2 text-xs font-bold text-green-deep hover:bg-green-50 disabled:opacity-50'
export const primaryButton = 'rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'
export function RatingSelect({ value, onChange, max = 5, label = 'No rating' }: { value: number | null; onChange: (value: number | null) => void; max?: number; label?: string }) {
  return <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} className="input"><option value="">{label}</option>{[5, 4, 3, 2, 1].filter((n) => n <= max).map((n) => <option key={n} value={n}>{n} · {['Does not meet', 'Partly meets', 'Meets expectations', 'Strong', 'Outstanding'][n - 1]}</option>)}</select>
}
