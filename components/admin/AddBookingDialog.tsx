'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircleIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { BOOKING_PRICES, displayDate, displayTime, type BookingType } from '@/lib/bookingTimes'

// Staff add a booking taken by phone, WhatsApp or in person, for a registered
// EMR patient or a new one, so it shows on that patient's chart. Used in the
// Requests calendar, the financial CRM and the EMR. Website rules (24 hours'
// notice, closed days and times) do not apply, so past bookings can be
// recorded too.

export type AddedAppointment = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  home_address: string
  consultation_type: BookingType
  service_name?: string | null
  amount?: number | null
  preferred_date: string
  preferred_time: string
  symptoms: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  patient_id: string | null
  created_at: string
  updated_at: string
}

/** A registered EMR patient, as the booking form shows them. */
export type BookingPatient = {
  id: string
  mrn: string
  first_name: string
  middle_name?: string | null
  last_name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

type Added = { name: string; mrn: string | null; when: string; registration: 'created' | 'pending' | null }

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`
const patientName = (patient: BookingPatient) => [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')

const emptyForm = (date = '') => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  sex: '',
  consent: false,
  homeAddress: '',
  consultationType: 'telemedicine' as BookingType,
  // For an "other" booking or payment: what it is for, and its amount in naira.
  serviceName: '',
  amount: '',
  preferredDate: date,
  preferredTime: '',
  notes: '',
  status: 'confirmed',
  paymentStatus: 'pending',
})
type Form = ReturnType<typeof emptyForm>

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/15'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'
const optional = <span className="font-normal text-gray-400">(optional)</span>

export default function AddBookingDialog({ open, initialDate, patient: fixedPatient, onClose, onAdded }: {
  open: boolean
  /** The date to start with, as "2026-11-20". */
  initialDate?: string
  /** Book for this patient only, as from their EMR chart. */
  patient?: BookingPatient
  onClose: () => void
  onAdded: (appointment: AddedAppointment) => void
}) {
  const [form, setForm] = useState(() => emptyForm(initialDate))
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing')
  const [selected, setSelected] = useState<BookingPatient | null>(fixedPatient || null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<BookingPatient[]>([])
  const [searching, setSearching] = useState(false)
  // Whether this member of staff can register patients in the EMR themselves.
  const [canRegister, setCanRegister] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState<Added | null>(null)
  const [openedFor, setOpenedFor] = useState<string | null>(null)

  // Start a fresh form each time the dialog opens.
  const openKey = open ? `${initialDate || ''}|${fixedPatient?.id || ''}` : null
  if (openKey !== openedFor) {
    setOpenedFor(openKey)
    if (openKey) {
      setForm({ ...emptyForm(initialDate), homeAddress: fixedPatient?.address || '' })
      setPatientMode('existing')
      setSelected(fixedPatient || null)
      setSearch('')
      setError('')
      setAdded(null)
    }
  }

  // Search registered patients as staff type.
  const findingPatient = open && !fixedPatient && patientMode === 'existing' && !selected && !added
  useEffect(() => {
    if (!findingPatient) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSearching(true)
      fetch(`/api/admin/appointments?search=${encodeURIComponent(search)}`, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || 'Patients could not be searched. Please try again.')
          setResults(data.patients || [])
          setCanRegister(data.canRegister !== false)
        })
        .catch((caught) => { if (!controller.signal.aborted) setError(caught.message) })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [findingPatient, search])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, saving, onClose])

  if (!open) return null

  const update = <K extends keyof Form>(field: K, value: Form[K]) => setForm((current) => ({ ...current, [field]: value }))
  const homeVisit = form.consultationType === 'home-visit'
  const other = form.consultationType === 'other'
  const price = other ? Number(form.amount) || 0 : BOOKING_PRICES[form.consultationType as 'telemedicine' | 'home-visit']
  const newPatient = !fixedPatient && patientMode === 'new'

  const choosePatient = (patient: BookingPatient) => {
    setSelected(patient)
    setError('')
    setForm((current) => ({ ...current, homeAddress: current.homeAddress || patient.address || '' }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!newPatient && !selected) {
      setError('Choose the patient, or add them as a new patient.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, patientMode: newPatient ? 'new' : 'existing', patientId: newPatient ? undefined : selected?.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The booking could not be saved. Please try again.')
      onAdded(data.appointment)
      setAdded({
        name: newPatient ? `${form.firstName} ${form.lastName}` : patientName(selected!),
        mrn: data.patient?.mrn || null,
        when: `${displayDate(data.appointment.preferred_date)} at ${displayTime(data.appointment.preferred_time)}`,
        registration: data.registration || null,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The booking could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const title = fixedPatient ? 'Schedule an appointment' : 'Add a booking'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="add-booking-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white font-dm-sans shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-7">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-mid">Bookings</p>
            <h3 id="add-booking-title" className="text-xl font-bold text-green-deep sm:text-2xl">{added ? 'Booking added' : title}</h3>
            {!added && (
              <p className="mt-1 text-sm text-gray-500">
                {fixedPatient ? `For ${patientName(fixedPatient)} (${fixedPatient.mrn}).` : 'For bookings taken by phone, WhatsApp or in person.'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            <XIcon size={19} weight="bold" />
          </button>
        </div>

        {added ? (
          <div className="px-5 py-8 text-center sm:px-7">
            <CheckCircleIcon size={44} weight="duotone" className="mx-auto text-green-mid" />
            <p className="mt-3 text-lg font-bold text-green-deep">{added.name}{added.mrn ? ` (${added.mrn})` : ''}</p>
            <p className="mt-1 text-sm text-gray-600">{added.when}</p>
            <p className="mx-auto mt-4 max-w-md text-sm text-gray-600">
              {added.registration === 'pending'
                ? 'Their registration is waiting for the clinical team to approve in Healthcare. Once approved, this booking shows on their chart.'
                : added.registration === 'created'
                  ? 'They are now registered in the EMR, and this booking shows on their chart.'
                  : 'The booking shows on their chart, in the Requests calendar and in the financial CRM.'}
            </p>
            <button type="button" onClick={onClose} className="mt-6 rounded-lg bg-green-deep px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
              <fieldset>
                <legend className={labelClass}>Patient</legend>
                {!fixedPatient && (
                  <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
                    {(['existing', 'new'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={patientMode === mode}
                        onClick={() => { setPatientMode(mode); setError('') }}
                        className={`rounded-md px-3 py-2 text-sm font-semibold transition ${patientMode === mode ? 'bg-white text-green-deep shadow-sm' : 'text-gray-600 hover:text-green-deep'}`}
                      >
                        {mode === 'existing' ? 'Existing patient' : 'New patient'}
                      </button>
                    ))}
                  </div>
                )}

                {!newPatient && selected && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-green-deep/25 bg-green-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-green-deep">{patientName(selected)}</p>
                      <p className="truncate text-xs text-gray-600">{selected.mrn} · {selected.phone || 'No phone'}{selected.email ? ` · ${selected.email}` : ''}</p>
                    </div>
                    {!fixedPatient && (
                      <button type="button" onClick={() => setSelected(null)} className="shrink-0 text-sm font-semibold text-green-deep underline underline-offset-4">
                        Change
                      </button>
                    )}
                  </div>
                )}

                {!newPatient && !selected && (
                  <>
                    <div className="relative">
                      <MagnifyingGlassIcon aria-hidden="true" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        aria-label="Search registered patients"
                        autoFocus
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, MRN, phone or email"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                    <div className="mt-2 max-h-52 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200" aria-busy={searching}>
                      {results.map((patient) => (
                        <button key={patient.id} type="button" onClick={() => choosePatient(patient)} className="block w-full px-3 py-2 text-left transition hover:bg-green-50 focus:bg-green-50 focus:outline-none">
                          <span className="block text-sm font-semibold text-gray-900">{patientName(patient)}</span>
                          <span className="block truncate text-xs text-gray-500">{patient.mrn} · {patient.phone || 'No phone'}{patient.email ? ` · ${patient.email}` : ''}</span>
                        </button>
                      ))}
                      {!results.length && (
                        <p className="px-3 py-4 text-sm text-gray-500">
                          {searching ? 'Searching…' : (
                            <>No registered patient matches. Try another search, or{' '}
                              <button type="button" onClick={() => setPatientMode('new')} className="font-semibold text-green-deep underline underline-offset-4">add a new patient</button>.
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {newPatient && (
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
                      <label htmlFor="add-booking-email" className={labelClass}>Email {optional}</label>
                      <input id="add-booking-email" type="email" maxLength={180} autoComplete="off" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="add-booking-dob" className={labelClass}>Date of birth *</label>
                      <input id="add-booking-dob" type="date" required max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="add-booking-sex" className={labelClass}>Sex *</label>
                      <select id="add-booking-sex" required value={form.sex} onChange={(event) => update('sex', event.target.value)} className={inputClass}>
                        <option value="">Select…</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="intersex">Intersex</option>
                        <option value="unknown">Prefer not to say</option>
                      </select>
                    </div>
                    <label className="flex items-start gap-2.5 text-sm text-gray-700 sm:col-span-2">
                      <input type="checkbox" required checked={form.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-0.5 h-4 w-4 accent-green-deep" />
                      <span>The patient agreed to FXMed keeping their details on record.</span>
                    </label>
                    <p className="text-xs text-gray-500 sm:col-span-2">
                      {canRegister
                        ? 'They will be registered in the EMR with a new MRN.'
                        : 'Their registration goes to the clinical team to approve in Healthcare. The booking is linked to their chart once approved.'}
                    </p>
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend className={labelClass}>Type</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(['telemedicine', 'home-visit', 'other'] as const).map((type) => (
                    <label
                      key={type}
                      className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-green-mid/30 ${
                        form.consultationType === type ? 'border-green-deep bg-green-50 text-green-deep' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input type="radio" name="consultationType" value={type} checked={form.consultationType === type} onChange={() => update('consultationType', type)} className="sr-only" />
                      <span className="block">{type === 'telemedicine' ? 'Telemedicine' : type === 'home-visit' ? 'Home visit' : 'Other'}</span>
                      <span className="block text-xs font-normal text-gray-500">{type === 'other' ? 'Your own amount' : naira(BOOKING_PRICES[type])}</span>
                    </label>
                  ))}
                </div>
                {other && (
                  <div className="mt-3 grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="add-booking-service" className={labelClass}>Type of payment *</label>
                      <input id="add-booking-service" required maxLength={120} placeholder="e.g. Lab test, Supplements" value={form.serviceName} onChange={(event) => update('serviceName', event.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="add-booking-amount" className={labelClass}>Amount (₦) *</label>
                      <input id="add-booking-amount" type="number" required min={1} step="any" inputMode="decimal" placeholder="0" value={form.amount} onChange={(event) => update('amount', event.target.value)} className={inputClass} />
                    </div>
                  </div>
                )}
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="add-booking-address" className={labelClass}>Address {homeVisit ? '*' : optional}</label>
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
                  <label htmlFor="add-booking-notes" className={labelClass}>Symptoms or notes {optional}</label>
                  <textarea id="add-booking-notes" rows={3} maxLength={3000} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={inputClass} />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Counted as {naira(price)} in the financial CRM and on the patient’s chart. Website rules (24 hours’ notice and closed days or times) do not apply to bookings added here.
              </p>
              {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 sm:px-7">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-green-deep px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Saving…' : fixedPatient ? 'Schedule appointment' : 'Add booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
