'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { validateAmbassadorApplication } from '@/lib/ambassador-applications'

type FormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: string
  stateRegion: string
  city: string
  organization: string
  jobTitle: string
  fieldOfExpertise: string
  motivation: string
  consent: boolean
}

const initialValues: FormValues = {
  firstName: '', lastName: '', email: '', phone: '', gender: '', stateRegion: '', city: '',
  organization: '', jobTitle: '', fieldOfExpertise: '', motivation: '',
  consent: false,
}

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const inputClass = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-dm-sans text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-mid focus:ring-2 focus:ring-green-mid/15'

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{error}</p> : null
}

export default function AmbassadorApplicationForm() {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const setValue = (name: keyof FormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setServerError('')

    const validation = validateAmbassadorApplication(values)
    if (!validation.success) {
      setErrors(validation.errors)
      setServerError('Please correct the highlighted fields.')
      const firstInvalidField = Object.keys(validation.errors)[0]
      window.setTimeout(() => document.getElementById(firstInvalidField)?.focus(), 0)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/ambassador-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (result.fields) setErrors(result.fields)
        setServerError(result.error || 'We could not submit your application. Please try again.')
        return
      }
      setSubmitted(true)
      setValues(initialValues)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setServerError('A network error occurred. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[24px] border border-green-deep/10 bg-white p-8 text-center shadow-custom sm:p-12" role="status">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-deep">✓</div>
        <h2 className="font-dm-sans text-3xl font-bold text-green-deep">Application received</h2>
        <p className="mx-auto mb-8 mt-4 max-w-xl font-dm-sans leading-7 text-text-mid">
          Thank you for applying to become an FXMed Elite Ambassador. Your application has been received and our team will review it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/ambassadors" className="rounded-full bg-green-deep px-6 py-3 font-dm-sans font-semibold text-white no-underline hover:bg-green-mid">Back to Ambassador Program</Link>
          <button type="button" onClick={() => setSubmitted(false)} className="rounded-full border border-green-deep/20 px-6 py-3 font-dm-sans font-semibold text-green-deep hover:bg-cream">Submit another application</button>
        </div>
      </div>
    )
  }

  const field = (name: keyof FormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="mb-2 block font-dm-sans text-sm font-semibold text-green-deep">{label}</label>
      <input
        id={name}
        name={name}
        value={String(values[name])}
        onChange={(event) => setValue(name, event.target.value)}
        className={`${inputClass} ${errors[name] ? 'border-red-400' : ''}`}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...props}
      />
      <FieldError id={name} error={errors[name]} />
    </div>
  )

  const textarea = (name: keyof FormValues, label: string, hint: string, maxLength: number, required = true) => (
    <div>
      <label htmlFor={name} className="mb-2 block font-dm-sans text-sm font-semibold text-green-deep">{label}</label>
      <textarea
        id={name}
        name={name}
        value={String(values[name])}
        onChange={(event) => setValue(name, event.target.value)}
        required={required}
        maxLength={maxLength}
        rows={4}
        className={`${inputClass} resize-y ${errors[name] ? 'border-red-400' : ''}`}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={`${name}-hint${errors[name] ? ` ${name}-error` : ''}`}
      />
      <div className="mt-1.5 flex justify-between gap-4 text-xs text-gray-500"><span id={`${name}-hint`}>{hint}</span><span>{String(values[name]).length}/{maxLength}</span></div>
      <FieldError id={name} error={errors[name]} />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7">
      {serverError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-dm-sans text-sm text-red-700">{serverError}</div>}

      <fieldset aria-labelledby="personal-information-heading" className="rounded-[22px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.05)] sm:p-8">
        <h2 id="personal-information-heading" className="font-dm-sans text-xl font-bold text-green-deep">Personal information</h2>
        <p className="mb-6 mt-2 font-dm-sans text-sm text-text-mid">Tell us how to identify and contact you.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {field('firstName', 'First name *', { required: true, maxLength: 80, autoComplete: 'given-name' })}
          {field('lastName', 'Last name *', { required: true, maxLength: 80, autoComplete: 'family-name' })}
          {field('email', 'Email address *', { required: true, maxLength: 254, type: 'email', autoComplete: 'email' })}
          {field('phone', 'Phone number *', { required: true, maxLength: 40, type: 'tel', autoComplete: 'tel' })}
          <div>
            <label htmlFor="gender" className="mb-2 block font-dm-sans text-sm font-semibold text-green-deep">Gender *</label>
            <select id="gender" value={values.gender} onChange={(event) => setValue('gender', event.target.value)} required className={`${inputClass} ${errors.gender ? 'border-red-400' : ''}`} aria-invalid={Boolean(errors.gender)} aria-describedby={errors.gender ? 'gender-error' : undefined}>
              <option value="">Select gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            <FieldError id="gender" error={errors.gender} />
          </div>
          <div>
            <label htmlFor="stateRegion" className="mb-2 block font-dm-sans text-sm font-semibold text-green-deep">State *</label>
            <select id="stateRegion" value={values.stateRegion} onChange={(event) => setValue('stateRegion', event.target.value)} required autoComplete="address-level1" className={`${inputClass} ${errors.stateRegion ? 'border-red-400' : ''}`} aria-invalid={Boolean(errors.stateRegion)} aria-describedby={errors.stateRegion ? 'stateRegion-error' : undefined}>
              <option value="">Select state</option>
              {nigerianStates.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <FieldError id="stateRegion" error={errors.stateRegion} />
          </div>
          {field('city', 'City *', { required: true, maxLength: 120, autoComplete: 'address-level2' })}
        </div>
      </fieldset>

      <fieldset aria-labelledby="professional-background-heading" className="rounded-[22px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.05)] sm:p-8">
        <h2 id="professional-background-heading" className="mb-6 font-dm-sans text-xl font-bold text-green-deep">Professional background</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {field('organization', 'Organization, company, or school *', { required: true, maxLength: 160, autoComplete: 'organization' })}
          {field('jobTitle', 'Job title or role *', { required: true, maxLength: 120, autoComplete: 'organization-title' })}
          <div className="sm:col-span-2">{field('fieldOfExpertise', 'Area of expertise or field', { maxLength: 160 })}</div>
        </div>
      </fieldset>

      <fieldset aria-labelledby="ambassador-information-heading" className="rounded-[22px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.05)] sm:p-8">
        <h2 id="ambassador-information-heading" className="mb-6 font-dm-sans text-xl font-bold text-green-deep">Ambassador information</h2>
        <div className="space-y-5">
          {textarea('motivation', 'Why do you want to become an FXMed Elite Ambassador?', 'Tell us what motivates you to join this partnership.', 1600, false)}
        </div>
      </fieldset>

      <div className="rounded-[22px] border border-green-deep/10 bg-white p-6 sm:p-8">
        <label className="flex cursor-pointer items-start gap-3 font-dm-sans text-sm leading-6 text-text-mid">
          <input type="checkbox" checked={values.consent} onChange={(event) => setValue('consent', event.target.checked)} required className="mt-1 h-4 w-4 accent-green-deep" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'consent-error' : undefined} />
          <span>I confirm that the information provided is accurate and consent to FXMed using it to evaluate and contact me about this application. I understand that approval is subject to onboarding and a written Ambassador Agreement. *</span>
        </label>
        <FieldError id="consent" error={errors.consent} />
      </div>

      <button type="submit" disabled={submitting} className="w-full rounded-full bg-green-deep px-8 py-4 font-dm-sans text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-mid disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? 'Submitting application…' : 'Submit application'}
      </button>
      <p className="text-center font-dm-sans text-xs leading-5 text-gray-500">Your information is used only to review and manage your ambassador application.</p>
    </form>
  )
}
