'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { XIcon } from '@phosphor-icons/react'

// The one set of building blocks for admin screens. Older per-area kits
// (hr/*/ui.tsx, emr/ui.tsx) re-export from here so every area looks the same.

export const button = {
  primary: 'brand-gradient inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(19,58,42,0.55)] transition hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(19,58,42,0.6)] disabled:opacity-50',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-full border border-green-deep/10 bg-white/70 px-4 py-2 text-xs font-semibold text-green-deep backdrop-blur transition hover:bg-white disabled:opacity-50',
  danger: 'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50',
  ghost: 'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-text-mid transition hover:bg-green-deep/5 hover:text-green-deep disabled:opacity-50',
}

const tones = {
  green: 'bg-green-50 text-green-700',
  gray: 'bg-gray-100 text-gray-600',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-sky-50 text-sky-700',
}
export type Tone = keyof typeof tones

// tone is a named tone, or (for older callers) a class string.
export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: Tone | string }) {
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone as Tone] ?? tone}`}>{children}</span>
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warn' | 'danger' | string }) {
  const toneClass = tone === 'warn' ? 'text-amber-600' : tone === 'danger' ? 'text-red-600' : tone || 'text-green-deep'
  return <div className="glass rounded-[20px] p-4 sm:p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-mid/80">{label}</p><p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${tone ? toneClass : 'text-gradient'}`}>{value}</p></div>
}

export function Card({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="glass overflow-hidden rounded-[24px]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-green-deep/[0.06] p-5 sm:p-6"><div><h3 className="text-lg font-semibold tracking-tight text-green-deep">{title}</h3>{description && <p className="mt-1 text-sm text-text-mid">{description}</p>}</div>{action}</div>{children}</section>
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' | 'warn' }) {
  if (!children) return null
  const style = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-sky-200 bg-sky-50 text-sky-800'
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${style}`}>{children}</div>
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="col-span-full p-10 text-center text-sm text-text-mid">{icon && <div className="mb-3 flex justify-center text-green-mid/60">{icon}</div>}{children}</div>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="flex min-h-48 items-center justify-center"><span role="status" aria-label={label} className="h-9 w-9 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div>
}

export function Field({ label, hint, required, className = '', children }: { label: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  return <label className={`block text-sm font-bold text-green-deep ${className}`}>{label}{required && <span className="text-red-500"> *</span>} {hint && <span className="font-normal text-gray-400">— {hint}</span>}<div className="mt-1">{children}</div></label>
}

// A dialog that closes on Escape or a click outside, keeps the page behind it
// from scrolling, and hands focus back to whatever opened it.
export function Modal({ title, eyebrow, onClose, wide, children }: { title: string; eyebrow?: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [])
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-deep/40 p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`max-h-[94vh] w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} overflow-y-auto rounded-[26px] border border-white/70 bg-white p-7 shadow-[0_30px_80px_-20px_rgba(16,45,33,0.45)] outline-none`}>
      <div className="flex justify-between gap-4"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-green-mid">{eyebrow}</p>}<h3 className="mt-1 text-2xl font-bold tracking-tight text-green-deep">{title}</h3></div><button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"><XIcon size={16} weight="bold" /></button></div>
      <div className="mt-6">{children}</div>
    </div>
  </div>
}

// Toasts and confirmations, in place of the browser's alert() and confirm().
type Toast = { id: number; text: string; tone: 'success' | 'error' }
type ConfirmRequest = { text: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void }
type Feedback = {
  toast: (text: string, tone?: Toast['tone']) => void
  confirm: (text: string, options?: { confirmLabel?: string; danger?: boolean }) => Promise<boolean>
}

const FeedbackContext = createContext<Feedback | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const nextId = useRef(0)

  const toast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = ++nextId.current
    setToasts((current) => [...current, { id, text, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000)
  }, [])

  const confirm = useCallback((text: string, options: { confirmLabel?: string; danger?: boolean } = {}) => new Promise<boolean>((resolve) => {
    setRequest({ text, confirmLabel: options.confirmLabel || 'Confirm', danger: options.danger ?? false, resolve })
  }), [])

  const answer = (ok: boolean) => { request?.resolve(ok); setRequest(null) }

  return <FeedbackContext.Provider value={{ toast, confirm }}>
    {children}
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((item) => <div key={item.id} className={`pointer-events-auto rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_16px_40px_-12px_rgba(16,45,33,0.5)] backdrop-blur-xl ${item.tone === 'error' ? 'bg-red-600/90' : 'bg-green-deep/90'}`}>{item.text}</div>)}
    </div>
    {request && <Modal title="Please confirm" onClose={() => answer(false)}>
      <p className="text-sm leading-6 text-text-mid">{request.text}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={() => answer(false)} className={button.secondary}>Cancel</button>
        <button type="button" onClick={() => answer(true)} className={request.danger ? 'rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700' : button.primary}>{request.confirmLabel}</button>
      </div>
    </Modal>}
  </FeedbackContext.Provider>
}

// Falls back to the browser dialogs when used outside the admin shell.
export function useFeedback(): Feedback {
  return useContext(FeedbackContext) ?? {
    toast: (text) => window.alert(text),
    confirm: async (text) => window.confirm(text),
  }
}
