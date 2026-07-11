'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

type FormData = {
  full_name: string
  phone: string
  email: string
  gender: string
  date_of_birth: string
  marital_status: string
  address: string
  city: string
  state: string
  health_concern: string
  conditions: string
  medications: string
  blood_pressure: string
  blood_sugar: string
  outreach_event: string
}

const EMPTY_FORM: FormData = {
  full_name: '', phone: '', email: '',
  gender: '', date_of_birth: '', marital_status: '',
  address: '', city: '', state: '',
  health_concern: '', conditions: '', medications: '', blood_pressure: '', blood_sugar: '',
  outreach_event: '',
}

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-[12px] font-dm-sans focus:outline-none focus:ring-2 focus:ring-green-mid focus:border-transparent'
const labelClass = 'block font-dm-sans font-semibold text-green-deep mb-2 text-sm'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-dm-sans font-bold text-green-deep text-lg border-b border-gray-200 pb-2 mb-4 mt-2">
      {children}
    </h2>
  )
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Prefill the outreach/event from a ?event= query param so each event can use
  // its own QR code / link (e.g. /register?event=Lekki%20Health%20Fair).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const event = params.get('event') || params.get('outreach')
    if (event) setForm((prev) => ({ ...prev, outreach_event: event }))
  }, [])

  const update = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('Please provide at least your full name and phone number.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-custom text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="font-dm-sans font-bold text-green-deep text-[1.75rem] mb-3">
            Thank you for registering!
          </h1>
          <p className="font-dm-sans text-text-mid mb-8">
            Your details have been received. Our team will be in touch with you soon.
          </p>
          <button
            onClick={() => {
              setForm((prev) => ({ ...EMPTY_FORM, outreach_event: prev.outreach_event }))
              setSubmitted(false)
            }}
            className="bg-gold text-green-deep px-6 py-3 rounded-[50px] font-dm-sans font-bold transition-all hover:bg-gold-light"
          >
            Register another person
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="FXMed" width={200} height={100} className="h-[90px] w-auto mx-auto mb-4" priority />
          <h1 className="font-dm-sans font-bold text-green-deep text-[2rem] mb-2">Outreach Registration</h1>
          <p className="font-dm-sans text-text-mid">
            Please share a few details so our team can support your health journey.
          </p>
        </div>

        <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-custom">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 mb-6">
              <p className="font-dm-sans text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal */}
            <SectionTitle>Your details</SectionTitle>
            <Field label="Full name" required>
              <input type="text" value={form.full_name} onChange={update('full_name')} required className={inputClass} placeholder="e.g. Jane Doe" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Phone number" required>
                <input type="tel" value={form.phone} onChange={update('phone')} required className={inputClass} placeholder="e.g. 0801 234 5678" />
              </Field>
              <Field label="Email address">
                <input type="email" value={form.email} onChange={update('email')} className={inputClass} placeholder="you@example.com" />
              </Field>
            </div>

            {/* Biodata */}
            <SectionTitle>Biodata</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Gender">
                <select value={form.gender} onChange={update('gender')} className={inputClass}>
                  <option value="">Select…</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </Field>
              <Field label="Date of birth">
                <input type="date" value={form.date_of_birth} onChange={update('date_of_birth')} className={inputClass} max={new Date().toISOString().split('T')[0]} />
              </Field>
            </div>
            <Field label="Marital status">
              <select value={form.marital_status} onChange={update('marital_status')} className={inputClass}>
                <option value="">Select…</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
                <option>Other</option>
              </select>
            </Field>

            {/* Location */}
            <SectionTitle>Location</SectionTitle>
            <Field label="Home address">
              <input type="text" value={form.address} onChange={update('address')} className={inputClass} placeholder="Street address" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="City / Area">
                <input type="text" value={form.city} onChange={update('city')} className={inputClass} />
              </Field>
              <Field label="State">
                <input type="text" value={form.state} onChange={update('state')} className={inputClass} />
              </Field>
            </div>

            {/* Health */}
            <SectionTitle>Health snapshot</SectionTitle>
            <Field label="Main health concern">
              <textarea value={form.health_concern} onChange={update('health_concern')} rows={2} className={inputClass} placeholder="What would you like help with?" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Known conditions">
                <textarea value={form.conditions} onChange={update('conditions')} rows={2} className={inputClass} placeholder="e.g. Diabetes, Hypertension" />
              </Field>
              <Field label="Current medications">
                <textarea value={form.medications} onChange={update('medications')} rows={2} className={inputClass} placeholder="e.g. Metformin" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Blood pressure">
                <input type="text" value={form.blood_pressure} onChange={update('blood_pressure')} className={inputClass} placeholder="e.g. 120/80" />
              </Field>
              <Field label="Blood sugar">
                <input type="text" value={form.blood_sugar} onChange={update('blood_sugar')} className={inputClass} placeholder="e.g. 5.6 mmol/L" />
              </Field>
            </div>
            <p className="font-dm-sans text-text-mid text-xs -mt-2">
              Blood pressure and blood sugar are usually recorded by our team at the outreach.
            </p>

            {/* Outreach */}
            <SectionTitle>Outreach</SectionTitle>
            <Field label="Outreach / Event">
              <input type="text" value={form.outreach_event} onChange={update('outreach_event')} className={inputClass} placeholder="e.g. Lekki Health Fair, June 2026" />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-green-deep px-6 py-4 rounded-[50px] font-dm-sans font-bold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Submitting…' : 'Submit registration'}
            </button>
          </form>
        </div>

        <p className="text-center font-dm-sans text-text-mid text-xs mt-6">
          Your information is kept private and used only to support your care.
        </p>
      </div>
    </div>
  )
}
