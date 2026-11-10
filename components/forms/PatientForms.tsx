'use client'

import { useCallback, useEffect, useState } from 'react'
import { FormFill } from '@/components/forms/FormKit'
import type { FormAnswers, FormResponseView } from '@/lib/forms'
import type { PublicFormRecord } from '@/lib/forms-types'

type PatientForm = PublicFormRecord & { my_response: FormResponseView | null }

// The patient portal's Forms section: surveys and questionnaires the clinic has shared.
export default function PatientForms() {
  const [forms, setForms] = useState<PatientForm[] | null>(null); const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null); const [thanks, setThanks] = useState<Record<string, string>>({})
  const load = useCallback(async () => {
    const response = await fetch('/api/patient-portal/forms', { cache: 'no-store' }); const result = await response.json().catch(() => ({}))
    if (response.ok) { setForms(result.forms || []); setError('') } else setError(result.error || 'Your forms could not be loaded.')
  }, [])
  useEffect(() => { load() }, [load])

  async function submit(form: PatientForm, answers: FormAnswers) {
    const response = await fetch(`/api/forms/${form.slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Your answers could not be sent. Please try again.'); return false }
    setError(''); setThanks((t) => ({ ...t, [form.id]: form.confirmation_message || 'Thank you, your answers have been sent to your care team.' }))
    if (!form.one_response_per_person) setOpen(null)
    await load(); return true
  }

  return <section className="mt-8 rounded-[24px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.06)] sm:p-8">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-mid">From your care team</p>
    <h2 className="mt-3 text-2xl font-bold">Forms and questionnaires</h2>
    {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!forms ? <p className="mt-6 text-text-mid">Loading…</p> : !forms.length ? <p className="mt-6 text-text-mid">There are no forms for you to fill in right now. Your care team will let you know when there is one.</p>
      : <div className="mt-6 divide-y divide-green-deep/10 rounded-2xl border border-green-deep/10">{forms.map((form) => <div key={form.id} className="p-5">
        <button type="button" onClick={() => setOpen(open === form.id ? null : form.id)} className="flex w-full items-start justify-between gap-4 text-left">
          <span><span className="block font-bold text-green-deep">{form.title}</span>{form.description && <span className="mt-1 block text-sm text-text-mid">{form.description}</span>}
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${form.my_response ? 'bg-green-50 text-green-700' : 'bg-gold/30 text-green-deep'}`}>{form.my_response ? `Sent ${new Date(form.my_response.submitted_at).toLocaleDateString('en-NG')}` : 'To do'}</span></span>
          <span className="text-2xl text-green-deep">{open === form.id ? '−' : '+'}</span>
        </button>
        {thanks[form.id] && <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{thanks[form.id]}</p>}
        {open === form.id && <div className="mt-4 rounded-2xl bg-cream/60 p-4"><FormFill form={form.definition} response={form.one_response_per_person ? form.my_response : null} onSubmit={(answers) => submit(form, answers)} /></div>}
      </div>)}</div>}
  </section>
}
