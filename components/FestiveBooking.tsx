'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { visitTimes, wellnessPackages, type WellnessPackage } from '@/lib/festive-offer'

// One booking dialog is mounted in the root layout, and every "Book" button on
// the site opens it through this event, optionally with a package chosen.
const openEvent = 'fxmed:festive-book'

export function openFestiveBooking(packageName?: string) {
  window.dispatchEvent(new CustomEvent(openEvent, { detail: { packageName } }))
}

export function FestiveBookButton({ packageName, className, children }: { packageName?: string; className?: string; children: ReactNode }) {
  return <button type="button" onClick={() => openFestiveBooking(packageName)} aria-haspopup="dialog" className={className}>{children}</button>
}

const emptyForm = {
  packageName: wellnessPackages[0].name as string,
  bookedFor: 'self' as 'self' | 'gift',
  buyerFirstName: '',
  buyerLastName: '',
  buyerEmail: '',
  buyerPhone: '',
  recipientName: '',
  recipientPhone: '',
  visitAddress: '',
  letFxmedArrange: false,
  preferredDate: '',
  preferredTime: '',
  giftMessage: '',
}

type Booked = { pkg: WellnessPackage; paymentUrl: string | null; phone: string }

function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const labelClass = 'mb-1.5 block text-sm font-semibold text-green-deep'

export default function FestiveBooking() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousOverflow = useRef<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [booked, setBooked] = useState<Booked | null>(null)

  useEffect(() => {
    const open = (event: Event) => {
      const dialog = dialogRef.current
      if (!dialog || dialog.open) return
      const packageName = (event as CustomEvent<{ packageName?: string }>).detail?.packageName
      // A finished booking starts over; an unfinished one keeps what was typed.
      if (booked) {
        setBooked(null)
        setForm(emptyForm)
      }
      if (packageName && wellnessPackages.some((pkg) => pkg.name === packageName)) {
        setForm((current) => ({ ...current, packageName }))
      }
      setError('')
      dialog.showModal()
      previousOverflow.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    window.addEventListener(openEvent, open)
    return () => window.removeEventListener(openEvent, open)
  }, [booked])

  const close = () => dialogRef.current?.close()
  const update = <K extends keyof typeof emptyForm>(field: K, value: (typeof emptyForm)[K]) => setForm((current) => ({ ...current, [field]: value }))

  const gift = form.bookedFor === 'gift'
  const selected = wellnessPackages.find((pkg) => pkg.name === form.packageName) || wellnessPackages[0]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/festive-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          preferredDate: form.letFxmedArrange ? '' : form.preferredDate,
          preferredTime: form.letFxmedArrange ? '' : form.preferredTime,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Your booking could not be saved. Please try again.')
      setBooked({ pkg: selected, paymentUrl: payload.paymentUrl, phone: form.buyerPhone })
      dialogRef.current?.scrollTo({ top: 0 })
    } catch (caught) {
      setError(caught instanceof Error && caught.message !== 'Failed to fetch' ? caught.message : 'We could not reach FXMed. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="festive-booking-title"
      onClose={() => {
        if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current
        previousOverflow.current = null
      }}
      onClick={(event) => { if (event.target === event.currentTarget) close() }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-[24px] border-0 bg-[#f8faef] p-0 font-dm-sans text-green-deep shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <button type="button" autoFocus onClick={close} aria-label="Close booking" className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-green-deep/15 bg-white text-2xl text-green-deep shadow-sm transition hover:bg-[#e3edc6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-mid">×</button>

      {booked ? (
        <div className="px-6 pb-8 pt-14 text-center sm:px-10">
          <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl text-green-deep">✓</span>
          <h2 id="festive-booking-title" className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight">Booking received</h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-text-mid">
            Your {booked.pkg.name} package ({booked.pkg.price}) is booked.{' '}
            {booked.paymentUrl
              ? 'Complete your payment on Paystack to secure it. FXMed will then confirm the visit within 24 hours.'
              : `FXMed will contact you on ${booked.phone} within 24 hours to confirm the visit and arrange payment.`}
          </p>
          {booked.paymentUrl && (
            <a href={booked.paymentUrl} target="_blank" rel="noopener noreferrer" className="primary mt-7 w-full max-w-sm py-3.5">Pay {booked.pkg.price} on Paystack</a>
          )}
          <button type="button" onClick={close} className={`${booked.paymentUrl ? 'mx-auto mt-4 block rounded px-3 py-2 text-sm text-text-mid underline underline-offset-4 hover:text-green-deep' : 'secondary mt-7 w-full max-w-sm py-3'}`}>
            {booked.paymentUrl ? 'Close' : 'Done'}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="px-6 pb-7 pt-12 sm:px-9">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-green-mid">The festive wellness collection</p>
          <h2 id="festive-booking-title" className="mt-2 text-3xl font-bold leading-[1.15] tracking-tight">Book a wellness package</h2>

          <fieldset className="mt-6">
            <legend className={labelClass}>Package</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {wellnessPackages.map((pkg) => {
                const checked = form.packageName === pkg.name
                return (
                  <label key={pkg.name} className={`cursor-pointer rounded-2xl border-2 p-4 transition focus-within:ring-2 focus-within:ring-gold ${checked ? 'border-green-deep bg-white' : 'border-green-deep/10 bg-white/60 hover:border-green-deep/30'}`}>
                    <input type="radio" name="package" value={pkg.name} checked={checked} onChange={() => update('packageName', pkg.name)} className="sr-only" />
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{pkg.name}</span>
                      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-green-deep bg-green-deep' : 'border-green-deep/25'}`}>
                        {checked && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                    </span>
                    <span className="mt-1 block text-xl font-bold">{pkg.price}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className={labelClass}>Who is it for?</legend>
            <div className="grid grid-cols-2 gap-2 rounded-full bg-[#e3edc6] p-1">
              {([['self', 'For me'], ['gift', 'A gift for someone']] as const).map(([value, label]) => (
                <label key={value} className={`cursor-pointer rounded-full px-3 py-2.5 text-center text-sm font-semibold transition focus-within:ring-2 focus-within:ring-gold ${form.bookedFor === value ? 'bg-green-deep text-white shadow-sm' : 'text-green-deep hover:bg-white/50'}`}>
                  <input type="radio" name="bookedFor" value={value} checked={form.bookedFor === value} onChange={() => update('bookedFor', value)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <h3 className="mt-7 text-lg font-bold">Your details</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="festive-first-name" className={labelClass}>First name</label>
              <input id="festive-first-name" required autoComplete="given-name" value={form.buyerFirstName} onChange={(event) => update('buyerFirstName', event.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="festive-last-name" className={labelClass}>Last name</label>
              <input id="festive-last-name" required autoComplete="family-name" value={form.buyerLastName} onChange={(event) => update('buyerLastName', event.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="festive-email" className={labelClass}>Email</label>
              <input id="festive-email" type="email" required autoComplete="email" value={form.buyerEmail} onChange={(event) => update('buyerEmail', event.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="festive-phone" className={labelClass}>Phone (WhatsApp)</label>
              <input id="festive-phone" type="tel" required autoComplete="tel" placeholder="+234 800 000 0000" value={form.buyerPhone} onChange={(event) => update('buyerPhone', event.target.value)} className="input" />
            </div>
          </div>

          {gift && (
            <>
              <h3 className="mt-7 text-lg font-bold">Who is receiving the gift?</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="festive-recipient-name" className={labelClass}>Their full name</label>
                  <input id="festive-recipient-name" required autoComplete="off" value={form.recipientName} onChange={(event) => update('recipientName', event.target.value)} className="input" />
                </div>
                <div>
                  <label htmlFor="festive-recipient-phone" className={labelClass}>Their phone</label>
                  <input id="festive-recipient-phone" type="tel" required autoComplete="off" value={form.recipientPhone} onChange={(event) => update('recipientPhone', event.target.value)} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="festive-gift-message" className={labelClass}>Gift message <span className="font-normal text-text-mid">(optional)</span></label>
                  <textarea id="festive-gift-message" rows={2} maxLength={1000} value={form.giftMessage} onChange={(event) => update('giftMessage', event.target.value)} className="input" placeholder="We’ll include this with the gift" />
                </div>
              </div>
            </>
          )}

          <h3 className="mt-7 text-lg font-bold">The home visit</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="festive-address" className={labelClass}>{gift ? 'Their home address' : 'Your home address'}</label>
              <textarea id="festive-address" required rows={2} autoComplete={gift ? 'off' : 'street-address'} value={form.visitAddress} onChange={(event) => update('visitAddress', event.target.value)} className="input" placeholder="Street, area, city and state" />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-text-mid sm:col-span-2">
              <input type="checkbox" checked={form.letFxmedArrange} onChange={(event) => update('letFxmedArrange', event.target.checked)} className="mt-1 h-4 w-4 accent-green-deep" />
              <span>{gift ? 'Let FXMed arrange the visit date directly with them' : 'Let FXMed contact me to arrange the visit date'}</span>
            </label>
            {!form.letFxmedArrange && (
              <>
                <div>
                  <label htmlFor="festive-date" className={labelClass}>Preferred date</label>
                  <input id="festive-date" type="date" required min={tomorrow()} value={form.preferredDate} onChange={(event) => update('preferredDate', event.target.value)} className="input" />
                </div>
                <div>
                  <label htmlFor="festive-time" className={labelClass}>Preferred time</label>
                  <select id="festive-time" required value={form.preferredTime} onChange={(event) => update('preferredTime', event.target.value)} className="input">
                    <option value="">Select a time</option>
                    {visitTimes.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="mt-7 rounded-2xl border border-green-deep/10 bg-white p-4 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span>{selected.name} package</span>
              <strong className="text-lg">{selected.price}</strong>
            </div>
            <p className="mt-1 text-text-mid">{selected.paymentUrl ? 'You’ll pay securely on Paystack after booking.' : 'FXMed will contact you to confirm and arrange payment.'}</p>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={submitting} className="primary mt-5 w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Booking…' : selected.paymentUrl ? 'Book and continue to payment' : 'Book now'}
          </button>
        </form>
      )}
    </dialog>
  )
}
