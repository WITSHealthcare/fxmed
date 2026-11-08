'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FormFill } from '@/components/forms/FormKit'
import type { FormAnswers, FormResponseView } from '@/lib/forms'
import type { PublicFormRecord } from '@/lib/forms-types'

type Loaded = { form: PublicFormRecord; my_response: FormResponseView | null; preview: boolean }
type Problem = { error: string; signIn?: string | null }
const portalName = { staff: 'the FXMed staff dashboard', patients: 'your FXMed patient portal' } as const

export default function PublicFormPage({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null); const [problem, setProblem] = useState<Problem | null>(null)
  const [contact, setContact] = useState({ name: '', email: '', phone: '' }); const [website, setWebsite] = useState('')
  const [submitted, setSubmitted] = useState<FormResponseView | null>(null); const [error, setError] = useState(''); const [round, setRound] = useState(0)

  useEffect(() => {
    fetch(`/api/forms/${encodeURIComponent(slug)}`).then(async (response) => {
      const result = await response.json().catch(() => ({}))
      if (response.ok) setLoaded(result); else setProblem({ error: result.error || 'This form could not be loaded.', signIn: result.signIn })
    }).catch(() => setProblem({ error: 'This form could not be loaded. Check your connection and try again.' }))
  }, [slug])

  async function submit(answers: FormAnswers) {
    setError('')
    const response = await fetch(`/api/forms/${encodeURIComponent(slug)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, contact, website }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Your response could not be sent. Please try again.'); return false }
    setSubmitted(result.response || { answers, score: null, passed: null, submitted_at: new Date().toISOString() }); window.scrollTo({ top: 0, behavior: 'smooth' }); return true
  }

  const form = loaded?.form; const quiz = form?.definition.kind === 'quiz'
  const contactRequired = form?.collect_contact === 'required'
  return <main className="min-h-screen bg-cream px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-2xl">
      <Link href="/" aria-label="FXMed home" className="mb-8 block"><Image src="/FXMed_Logo_Black.png" alt="FXMed" width={240} height={67} priority className="mx-auto h-[56px] w-auto" /></Link>
      <div className="rounded-[28px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_40px_rgba(26,61,46,0.10)] sm:p-10">
        {!loaded && !problem && <p className="py-16 text-center text-text-mid">Loading…</p>}
        {problem && <div className="py-10 text-center"><h1 className="text-2xl font-bold text-green-deep">{problem.signIn ? 'Please sign in' : 'Form unavailable'}</h1><p className="mt-3 text-text-mid">{problem.error}</p>
          {problem.signIn && <Link href={problem.signIn} className="primary mt-6">Sign in to {problem.signIn.startsWith('/admin') ? portalName.staff : portalName.patients}</Link>}</div>}
        {form && <>
          {loaded!.preview && <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Admin preview: {form.status === 'draft' ? 'this form is a draft and is not open to anyone yet.' : 'this form is not shared with your account, so you cannot submit it.'}</p>}
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-mid">{quiz ? 'Quiz' : 'Survey'}</p>
          <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.4rem)] font-bold leading-tight text-green-deep">{form.title}</h1>
          {form.description && <p className="mt-3 whitespace-pre-wrap leading-7 text-text-mid">{form.description}</p>}
          <div className="mt-8">
            {form.status === 'closed' ? <p className="rounded-xl bg-gray-50 p-6 text-center text-text-mid">This form is closed and no longer accepts responses.</p>
              : submitted && (form.audience === 'customers' || !form.one_response_per_person) ? <Done form={form} response={submitted} onAgain={() => { setSubmitted(null); setRound((n) => n + 1) }} />
              : <>
                {submitted && <p className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{form.confirmation_message || 'Thank you, your response has been recorded.'}</p>}
                {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <FormFill key={round} form={form.definition} response={submitted || loaded!.my_response} preview={loaded!.preview} onSubmit={submit}>
                  {form.audience === 'customers' && form.collect_contact !== 'none' && <fieldset className="rounded-xl border bg-[#fbfaf6] p-4"><legend className="px-1 text-sm font-bold text-green-deep">Your details {contactRequired ? '' : <span className="font-normal text-text-mid">(optional)</span>}</legend>
                    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-green-deep">Full name{contactRequired && <span className="text-red-600"> *</span>}<input required={contactRequired && !loaded!.preview} autoComplete="name" maxLength={160} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="input mt-1" /></label>
                      <label className="text-xs font-bold text-green-deep">Email{contactRequired && <span className="text-red-600"> *</span>}<input type="email" required={contactRequired && !loaded!.preview} autoComplete="email" maxLength={254} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="input mt-1" /></label>
                      <label className="text-xs font-bold text-green-deep sm:col-span-2">Phone <span className="font-normal text-text-mid">(optional)</span><input type="tel" autoComplete="tel" maxLength={40} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="input mt-1" /></label></div>
                    <p className="mt-3 text-xs text-text-mid">We use these details only to follow up on your response.</p></fieldset>}
                  <label aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                </FormFill>
              </>}
          </div>
        </>}
      </div>
      <p className="mt-6 text-center text-xs text-text-mid">FXMed · Functional medicine that comes to you</p>
    </div>
  </main>
}

function Done({ form, response, onAgain }: { form: PublicFormRecord; response: FormResponseView; onAgain: () => void }) {
  const quiz = form.definition.kind === 'quiz'
  return <div className="py-6 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl text-green-700">✓</div>
    <h2 className="mt-4 text-2xl font-bold text-green-deep">{form.confirmation_message || 'Thank you, your response has been recorded.'}</h2>
    {quiz && response.score !== null && <p className="mt-3 text-text-mid">You scored <strong>{response.score}%</strong>{response.passed === null ? '' : response.passed ? ', a pass.' : `. The pass mark is ${form.definition.passPercent}%.`}</p>}
    <button type="button" onClick={onAgain} className="secondary mt-6">Submit another response</button>
  </div>
}
