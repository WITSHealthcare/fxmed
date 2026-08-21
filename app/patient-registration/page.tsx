'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const emptyForm = {
  first_name: '', middle_name: '', last_name: '', date_of_birth: '', sex: '',
  phone: '', email: '', address: '', city: '', state: '', country: 'Nigeria',
  marital_status: '', occupation: '', emergency_contact_name: '',
  emergency_contact_phone: '', emergency_contact_relationship: '',
  consent_confirmed: false, website: '',
}

type RegistrationForm = typeof emptyForm

const inputClass = 'input bg-white'

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`block font-dm-sans text-sm font-bold text-green-deep ${wide ? 'sm:col-span-2' : ''}`}>{label}{required && <span className="text-red-500"> *</span>}<span className="mt-2 block">{children}</span></label>
}

export default function PatientRegistrationPage() {
  const [form, setForm] = useState<RegistrationForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const set = (field: keyof RegistrationForm, value: string | boolean) => setForm(current => ({ ...current, [field]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true); setError('')
    const response = await fetch('/api/patient-registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setSubmitted(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    else setError(result.error || 'Registration could not be submitted.')
    setLoading(false)
  }

  if (submitted) return <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12"><section className="w-full max-w-lg rounded-[28px] border border-green-deep/10 bg-white p-8 text-center shadow-custom sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold text-3xl text-green-deep">✓</div><h1 className="mt-6 font-dm-sans text-3xl font-bold text-green-deep">Registration received</h1><p className="mt-4 font-dm-sans leading-7 text-text-mid">The FXMed clinical team will review the details before creating a patient record. Submission does not yet create an MRN or confirm an appointment.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/" className="rounded-full bg-green-deep px-6 py-3 font-dm-sans font-bold text-white no-underline">Return home</Link><button onClick={() => { setForm(emptyForm); setSubmitted(false) }} className="rounded-full border border-green-deep/20 px-6 py-3 font-dm-sans font-bold text-green-deep">Register another patient</button></div></section></main>

  return <main className="min-h-screen bg-cream px-4 py-10 sm:py-14">
    <div className="mx-auto max-w-3xl">
      <header className="text-center"><Link href="/"><Image src="/FXMed_Logo_Black.png" alt="FXMed" width={240} height={67} priority className="mx-auto h-[67px] w-auto" /></Link><p className="mt-5 inline-flex rounded-full bg-gold px-4 py-1.5 font-dm-sans text-[11px] font-bold uppercase tracking-[0.14em] text-green-deep">New patients</p><h1 className="mt-4 font-dm-sans text-3xl font-bold text-green-deep sm:text-4xl">Patient registration request</h1><p className="mx-auto mt-3 max-w-2xl font-dm-sans leading-7 text-text-mid">Complete this form to register with FXMed. A member of the clinical team will review the information and create your record.</p></header>

      <section className="mt-8 rounded-[28px] border border-green-deep/10 bg-white p-6 shadow-custom sm:p-9">
        {error && <div className="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 font-dm-sans text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-8">
          <fieldset><legend className="mb-5 font-dm-sans text-xl font-bold text-green-deep">Personal details</legend><div className="grid gap-5 sm:grid-cols-2"><Field label="First name" required><input className={inputClass} value={form.first_name} onChange={e => set('first_name', e.target.value)} required autoComplete="given-name" /></Field><Field label="Middle name"><input className={inputClass} value={form.middle_name} onChange={e => set('middle_name', e.target.value)} autoComplete="additional-name" /></Field><Field label="Last name" required><input className={inputClass} value={form.last_name} onChange={e => set('last_name', e.target.value)} required autoComplete="family-name" /></Field><Field label="Date of birth" required><input type="date" className={inputClass} value={form.date_of_birth} max={new Date().toISOString().slice(0, 10)} onChange={e => set('date_of_birth', e.target.value)} required /></Field><Field label="Sex" required><select className={inputClass} value={form.sex} onChange={e => set('sex', e.target.value)} required><option value="">Select…</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option><option value="unknown">Prefer not to say</option></select></Field><Field label="Marital status"><select className={inputClass} value={form.marital_status} onChange={e => set('marital_status', e.target.value)}><option value="">Select…</option><option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option></select></Field><Field label="Occupation" wide><input className={inputClass} value={form.occupation} onChange={e => set('occupation', e.target.value)} autoComplete="organization-title" /></Field></div></fieldset>

          <fieldset className="border-t border-green-deep/10 pt-8"><legend className="mb-5 font-dm-sans text-xl font-bold text-green-deep">Contact information</legend><div className="grid gap-5 sm:grid-cols-2"><Field label="Phone number" required><input type="tel" className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} required autoComplete="tel" /></Field><Field label="Email address"><input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" /></Field><Field label="Home address" wide><input className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} autoComplete="street-address" /></Field><Field label="City / area"><input className={inputClass} value={form.city} onChange={e => set('city', e.target.value)} autoComplete="address-level2" /></Field><Field label="State"><input className={inputClass} value={form.state} onChange={e => set('state', e.target.value)} autoComplete="address-level1" /></Field><Field label="Country" wide><input className={inputClass} value={form.country} onChange={e => set('country', e.target.value)} autoComplete="country-name" /></Field></div></fieldset>

          <fieldset className="border-t border-green-deep/10 pt-8"><legend className="mb-5 font-dm-sans text-xl font-bold text-green-deep">Emergency contact</legend><div className="grid gap-5 sm:grid-cols-2"><Field label="Contact name"><input className={inputClass} value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></Field><Field label="Contact phone"><input type="tel" className={inputClass} value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></Field><Field label="Relationship" wide><input className={inputClass} value={form.emergency_contact_relationship} onChange={e => set('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse, parent, sibling" /></Field></div></fieldset>

          <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={e => set('website', e.target.value)} />
          <label className="flex items-start gap-3 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 font-dm-sans text-sm leading-6 text-text-mid"><input type="checkbox" checked={form.consent_confirmed} onChange={e => set('consent_confirmed', e.target.checked)} required className="mt-1 h-4 w-4 accent-green-deep" /><span>I confirm that the information provided is accurate and consent to FXMed securely reviewing it for the purpose of creating a patient record. I understand that submitting this form does not confirm registration or an appointment.</span></label>
          <button type="submit" disabled={loading} className="w-full rounded-full bg-gold px-6 py-4 font-dm-sans font-bold text-green-deep transition hover:bg-gold-light disabled:opacity-50">{loading ? 'Submitting…' : 'Submit registration request'}</button>
        </form>
      </section>
      <p className="mt-6 text-center font-dm-sans text-xs leading-5 text-text-mid">Patient information is kept private and is reviewed only by authorized FXMed team members.</p>
    </div>
  </main>
}
