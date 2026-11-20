'use client'

import { displayName, type HrEmployee } from '@/lib/hr'
import { hrPerformanceApi } from '@/lib/hr-performance'
import { Alert as BaseAlert, type Tone } from '@/components/admin/ui'
export { Badge, Card, Empty, Modal, Stat } from '@/components/admin/ui'

// Performance notices ("info") are cautions, shown in amber.
export function Alert({ children, tone = 'error' }: { children: React.ReactNode; tone?: 'error' | 'info' }) { return <BaseAlert tone={tone === 'info' ? 'warn' : 'error'}>{children}</BaseAlert> }

// Shared bits for the Performance, Leave & Pay screens (styled like Training.tsx).
export type ApiResult<T = Record<string, unknown>> = { ok: boolean; data: T & { error?: string; warnings?: string[] } }
export async function call<T = Record<string, unknown>>(path: string, method = 'GET', body?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(`${hrPerformanceApi}${path}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  return { ok: response.ok, data: await response.json().catch(() => ({ error: 'Unexpected response from the server.' })) }
}
export const nameOf = (employees: Pick<HrEmployee, 'id' | 'legal_name' | 'preferred_name'>[], id: string | null | undefined) => { const employee = employees.find((item) => item.id === id); return employee ? displayName(employee) : '—' }

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-green-deep">{label} {hint && <span className="font-normal text-gray-400">— {hint}</span>}<div className="mt-1">{children}</div></label> }
export const statusTone = (status: string): Tone => ['final', 'approved', 'approved_with_changes', 'taken', 'met', 'passed', 'done', 'closed', 'agreed', 'on_track'].includes(status) ? 'green'
  : ['declined', 'not_met', 'not_passed', 'missing', 'cancelled_by_employer'].includes(status) ? 'red' : ['cancelled', 'dropped', 'not_applicable'].includes(status) ? 'gray' : ['submitted', 'calibration', 'at_risk', 'extended', 'active'].includes(status) ? 'amber' : 'blue'

export function Buttons({ onCancel, saving, label, extra }: { onCancel: () => void; saving: boolean; label: string; extra?: React.ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-3 pt-2"><button type="button" onClick={onCancel} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button>{extra}<button disabled={saving} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : label}</button></div>
}
export const smallButton = 'rounded-full border px-4 py-2 text-xs font-bold text-green-deep hover:bg-green-50 disabled:opacity-50'
export const primaryButton = 'rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'
export function RatingSelect({ value, onChange, max = 5, label = 'No rating' }: { value: number | null; onChange: (value: number | null) => void; max?: number; label?: string }) {
  return <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} className="input"><option value="">{label}</option>{[5, 4, 3, 2, 1].filter((n) => n <= max).map((n) => <option key={n} value={n}>{n} · {['Does not meet', 'Partly meets', 'Meets expectations', 'Strong', 'Outstanding'][n - 1]}</option>)}</select>
}
