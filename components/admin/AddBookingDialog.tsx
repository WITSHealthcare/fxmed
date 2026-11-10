'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { XIcon } from '@phosphor-icons/react'

// Staff add a booking taken by phone, WhatsApp or in person. Used in the
// Requests calendar and the financial CRM. Website rules (24 hours' notice,
// closed days and times) do not apply, so past bookings can be recorded too.

export type AddedAppointment = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  home_address: string
  consultation_type: 'telemedicine' | 'home-visit'
  preferred_date: string
  preferred_time: string
  symptoms: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  created_at: string
  updated_at: string
}

const prices = { telemedicine: '₦25,000', 'home-visit': '₦85,000' }

const emptyForm = (date = '') => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  homeAddress: '',
  consultationType: 'telemedicine' as 'telemedicine' | 'home-visit',
  preferredDate: date,
  preferredTime: '',
  notes: '',
  status: 'confirmed',
  paymentStatus: 'pending',
})

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/15'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

export default function AddBookingDialog({ open, initialDate, onClose, onAdded }: {
  open: boolean
  /** The date to start with, as "2026-11-20". */
  initialDate?: string
  onClose: () => void
  onAdded: (appointment: AddedAppointment) => void
}) {
  const [form, setForm] = useState(() => emptyForm(initialDate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [openedFor, setOpenedFor] = useState<string | null>(null)

  // Start a fresh form each time the dialog opens.
  const openKey = open ? initialDate || 'any' : null
  if (openKey !== openedFor) {
    setOpenedFor(openKey)
    if (openKey) {
      setForm(emptyForm(initialDate))
      setError('')
    }
  }

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, saving, onClose])

  if (!open) return null

  const update = <K extends keyof ReturnType<typeof emptyForm>>(field: K, value: ReturnType<typeof emptyForm>[K]) =>
    setForm((current) => ({ ...current, [field]: value }))
  const homeVisit = form.consultationType === 'home-visit'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The booking could not be saved. Please try again.')
      onAdded(data.appointment)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The booking could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="add-booking-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-5 sm:px-7">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-mid">Requests</p>
            <h3 id="add-booking-title" className="font-dm-sans text-xl font-bold text-green-deep sm:text-2xl">Add a booking</h3>
            <p className="mt-1 text-sm text-gray-500">For bookings taken by phone, WhatsApp or in person.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            <XIcon size={19} weight="bold" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <fieldset>
              <legend className={labelClass}>Type</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['telemedicine', 'home-visit'] as const).map((type) => (
                  <label
                    key={type}
                    className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-green-mid/30 ${
                      form.consultationType === type ? 'border-green-deep bg-green-50 text-green-deep' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input type="radio" name="consultationType" value={type} checked={form.consultationType === type} onChange={() => update('consultationType', type)} className="sr-only" />
                    <span className="block">{type === 'telemedicine' ? 'Telemedicine' : 'Home visit'}</span>
                    <span className="block text-xs font-normal text-gray-500">{prices[type]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-booking-first-name" className={labelClass}>First name *</label>
                <input id="add-booking-first-name" required maxLength={100} autoComplete="off" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-booking-last-name" className={labelClass}>Last name *</label>
                <input id="add-booking-last-name" required maxLength={100} autoComplete="off" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-booking-phone" className={labelClass}>Phone *</label>
                <input id="add-booking-phone" type="tel" required maxLength={40} autoComplete="off" placeholder="+234 800 000 0000" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-booking-email" className={labelClass}>Email <span className="font-normal text-gray-400">(optional)</span></label>
                <input id="add-booking-email" type="email" maxLength={180} autoComplete="off" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="add-booking-address" className={labelClass}>
                  Address {homeVisit ? '*' : <span className="font-normal text-gray-400">(optional)</span>}
                </label>
                <textarea id="add-booking-address" rows={2} required={homeVisit} maxLength={500} value={form.homeAddress} onChange={(event) => update('homeAddress', event.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-booking-date" className={labelClass}>Date *</label>
                <input id="add-booking-date" type="date" required value={form.preferredDate} onChange={(event) => update('preferredDate', event.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-booking-time" className={labelClass}>Time (Lagos) *</label>
                <input id="add-booking-time" type="time" required step={300} value={form.preferredTime} onChange={(event) => update('preferredTime', event.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-booking-status" className={labelClass}>Booking status</label>
                <select id="add-booking-status" value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label htmlFor="add-booking-payment" className={labelClass}>Payment</label>
                <select id="add-booking-payment" value={form.paymentStatus} onChange={(event) => update('paymentStatus', event.target.value)} className={inputClass}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="add-booking-notes" className={labelClass}>Symptoms or notes <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea id="add-booking-notes" rows={3} maxLength={3000} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={inputClass} />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Counted as {prices[form.consultationType]} in the financial CRM. Website rules (24 hours’ notice and closed days or times) do not apply to bookings added here.
            </p>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 sm:px-7">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-green-deep px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
