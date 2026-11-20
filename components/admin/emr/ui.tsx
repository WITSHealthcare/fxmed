import { AddressBookIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Alert as BaseAlert, Empty as BaseEmpty, Spinner } from '@/components/admin/ui'

// Building blocks shared by the clinical workspace and its follow-up worklist.

export function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) { return <section className="glass rounded-[24px] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-semibold tracking-tight">{title}</h3>{subtitle && <p className="mt-1 text-sm leading-6 text-text-mid">{subtitle}</p>}</div>{action}</div>{children}</section> }
export function Status({ value }: { value: string }) { const tone = value === 'active' || value === 'completed' || value === 'final' || value === 'paid' ? 'bg-emerald-50 text-emerald-700' : value === 'cancelled' || value === 'severe' || value === 'critical' ? 'bg-red-50 text-red-700' : value === 'in_progress' || value === 'reviewed' || value === 'confirmed' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'; return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>{label(value)}</span> }
export function Alert({ children, tone }: { children: ReactNode; tone: 'error' | 'info' }) { return <div className="mt-5"><BaseAlert tone={tone}>{children}</BaseAlert></div> }
export function Loading() { return <Spinner /> }
export function Empty({ text }: { text: string }) { return <BaseEmpty icon={<AddressBookIcon size={32} weight="duotone" />}>{text}</BaseEmpty> }
export function Field({ label: text, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: ReactNode }) { return <label className={`block text-sm font-bold ${wide ? 'sm:col-span-2' : ''}`}>{text}{required && <span className="text-red-500"> *</span>}<span className="mt-2 block">{children}</span></label> }
export function label(value?: string) { return (value || '—').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) }
export function fullName(patient: Record<string, any>) { return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ') }
