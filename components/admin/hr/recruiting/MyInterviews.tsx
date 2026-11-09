'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { interviewFormats, labelOf, recommendations, scorecardStatuses, type Recommendation } from '@/lib/hr'
import { competenciesForStep, defaultScorecardCompetencies, interviewLoops, scorecardRatingLabels, type HrInterview, type HrScorecard, type HrScorecardTemplate, type ScorecardCompetency, type ScorecardRating } from '@/lib/hr-recruiting'
import { Alert, Badge, Empty, Field, Modal, Section, api, call, outline, primary, showTime } from './ui'

export type Assignment = {
  scorecard: HrScorecard; interview: HrInterview; template: HrScorecardTemplate | null
  application: { id: string; opening_title: string; department: string | null; role_family: HrScorecardTemplate['role_family'] | null; stage: string; cover_note: string; has_cv: boolean; candidate_name: string; candidate_location: string | null }
}

export async function openCv(applicationId: string, setError: (message: string) => void) {
  const { ok, data } = await call<{ url: string }>(`${api}/checks?cv=${applicationId}`)
  if (ok && data.url) window.open(data.url, '_blank', 'noopener,noreferrer'); else setError(data.error || 'Could not open the CV.')
}

// "My interviews": the interviews the signed-in staff member is assigned to,
// the candidate summary and CV, and their own scorecard only.
export default function MyInterviews({ admin = false }: { admin?: boolean }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [open, setOpen] = useState<Assignment | null>(null)
  const load = useCallback(async () => { setLoading(true); setError(''); const { ok, data } = await call<{ assignments: Assignment[] }>(admin ? `${api}?mine=1` : api); ok ? setAssignments(data.assignments || []) : setError(data.error || 'Could not load your interviews.'); setLoading(false) }, [admin])
  useEffect(() => { load() }, [load])
  if (loading) return <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading your interviews…</div>
  const pending = assignments.filter((item) => item.scorecard.status !== 'submitted' && !item.scorecard.conflict_declared && item.interview.status !== 'cancelled')
  return <div className="space-y-6">
    <Alert>{error}</Alert>
    <Section title="My interviews" description="Score each candidate on your own, before the debrief, with the evidence of what they said or did. You only see your own scorecards.">
      {!assignments.length ? <Empty>No interviews are assigned to you right now.</Empty> : <div className="divide-y">{assignments.map((item) => <div key={item.scorecard.id} className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="min-w-[240px] flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold text-green-deep">{item.application.candidate_name}</h4><StatusBadge card={item.scorecard} interview={item.interview} /></div>
          <p className="mt-1 text-sm text-text-mid">{item.application.opening_title} · {item.interview.loop_step_code ? `${item.interview.loop_step_code} ` : ''}{item.interview.title}</p>
          <p className="mt-2 text-xs text-gray-500">{showTime(item.interview.scheduled_at)} · {labelOf(interviewFormats, item.interview.format)}{item.interview.duration_min ? ` · ${item.interview.duration_min} min` : ''}{item.interview.location_or_link ? ` · ${item.interview.location_or_link}` : ''}</p>
          {item.interview.adjustments_requested && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><b>Adjustments requested:</b> {item.interview.adjustments_requested}</p>}
        </div>
        <div className="flex gap-2">{item.application.has_cv && <button onClick={() => openCv(item.application.id, setError)} className={outline}>Open CV</button>}<button onClick={() => setOpen(item)} className={primary}>{item.scorecard.status === 'submitted' ? 'View scorecard' : 'Scorecard'}</button></div>
      </div>)}</div>}
    </Section>
    {pending.length > 0 && <p className="text-xs text-text-mid">{pending.length} scorecard(s) still to submit. Same questions and tasks for every candidate; never ask about pregnancy, marital plans, religion, ethnicity or state of origin.</p>}
    {open && <ScorecardModal assignment={open} onClose={() => setOpen(null)} onSaved={async () => { await load(); setOpen(null) }} />}
  </div>
}

function StatusBadge({ card, interview }: { card: HrScorecard; interview: HrInterview }) {
  if (interview.status === 'cancelled') return <Badge tone="gray">Interview cancelled</Badge>
  if (card.conflict_declared) return <Badge tone="red">Conflict declared</Badge>
  return <Badge tone={card.status === 'submitted' ? 'green' : 'amber'}>{labelOf(scorecardStatuses, card.status)}</Badge>
}

function ScorecardModal({ assignment, onClose, onSaved }: { assignment: Assignment; onClose: () => void; onSaved: () => Promise<void> }) {
  const { scorecard, interview, template, application } = assignment
  const competencies: ScorecardCompetency[] = useMemo(() => competenciesForStep(template?.competencies || (application.role_family ? defaultScorecardCompetencies(application.role_family) : []), interview.loop_step_code), [template, application.role_family, interview.loop_step_code])
  const step = application.role_family ? interviewLoops[application.role_family].find((item) => item.code === interview.loop_step_code) : null
  const [ratings, setRatings] = useState<Record<string, ScorecardRating>>(() => Object.fromEntries((scorecard.ratings || []).map((item) => [item.competency_code, item])))
  const [recommendation, setRecommendation] = useState<Recommendation | ''>(scorecard.overall_recommendation || ''); const [notes, setNotes] = useState(scorecard.notes || '')
  const [conflict, setConflict] = useState<'no' | 'yes' | ''>(''); const [conflictNote, setConflictNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const locked = scorecard.status === 'submitted' || interview.status === 'cancelled'
  async function send(action: string, extra: Record<string, unknown> = {}) {
    if (action === 'submit' && !confirm('Submit your scorecard? After this only People Ops can unlock it.')) return
    setBusy(true); setError('')
    const { ok, data } = await call(`${api}/scorecards`, 'PATCH', { id: scorecard.id, action, ratings: Object.values(ratings), overall_recommendation: recommendation || null, notes, ...extra })
    setBusy(false); if (!ok) return setError(data.error || 'Could not save.')
    await onSaved()
  }
  const setRating = (code: string, patch: Partial<ScorecardRating>) => setRatings((current) => ({ ...current, [code]: { ...(current[code] || { competency_code: code, rating: 0, evidence: '' }), ...patch } }))
  return <Modal title={application.candidate_name} eyebrow={`${application.opening_title} · ${interview.title}`} onClose={onClose} wide>
    <Alert>{error}</Alert>
    {step && <p className="mb-4 rounded-xl bg-[#fbfaf6] p-4 text-sm text-text-mid"><b className="text-green-deep">{step.code} {step.title}</b> — {step.panel}, {step.minutes} min. Tests: {step.tests}.</p>}
    {application.cover_note && <details className="mb-4 rounded-xl border p-4 text-sm"><summary className="cursor-pointer font-bold text-green-deep">Candidate note</summary><p className="mt-2 whitespace-pre-wrap text-text-mid">{application.cover_note}</p></details>}
    {!scorecard.conflict_checked_at ? <form onSubmit={(e) => { e.preventDefault(); send('declare', { conflict: conflict === 'yes', note: conflictNote }) }} className="space-y-4 rounded-xl border p-5">
      <h4 className="font-bold text-green-deep">Conflict of interest</h4><p className="text-sm text-text-mid">Are you related to this candidate, or do you have a close personal relationship with them? If so, you must not score them.</p>
      <div className="flex gap-6 text-sm">{(['no', 'yes'] as const).map((value) => <label key={value} className="flex items-center gap-2"><input type="radio" required name="conflict" checked={conflict === value} onChange={() => setConflict(value)} />{value === 'no' ? 'No conflict' : 'Yes, I have a conflict'}</label>)}</div>
      {conflict === 'yes' && <Field label="Describe the relationship"><textarea required rows={2} maxLength={1000} value={conflictNote} onChange={(e) => setConflictNote(e.target.value)} className="input" /></Field>}
      <div className="flex justify-end"><button disabled={busy || !conflict} className={primary}>Confirm declaration</button></div>
    </form> : scorecard.conflict_declared ? <p className="rounded-xl bg-red-50 p-5 text-sm text-red-700">You declared a conflict ({scorecard.conflict_note}). People Ops will reassign this interview; you will not score this candidate.</p>
    : <form onSubmit={(e) => { e.preventDefault(); send('submit') }} className="space-y-5">
      <p className="text-xs text-text-mid">Rate 1–4 against the anchors and write the evidence. A 1 on a competency marked knockout means no hire.</p>
      {competencies.map((item) => { const current = ratings[item.code]; return <fieldset key={item.code} disabled={locked} className="rounded-xl border p-4">
        <legend className="px-1 font-bold text-green-deep">{item.name} {item.is_knockout && <Badge tone="red">Knockout</Badge>}</legend>
        <div className="grid gap-2 sm:grid-cols-4">{[1, 2, 3, 4].map((value) => <label key={value} className={`cursor-pointer rounded-lg border p-3 text-xs ${current?.rating === value ? 'border-green-deep bg-green-50' : 'border-gray-200'}`}><span className="flex items-center gap-2 font-bold text-green-deep"><input type="radio" name={`rating-${item.code}`} checked={current?.rating === value} onChange={() => setRating(item.code, { rating: value })} />{value} · {scorecardRatingLabels[value]}</span><span className="mt-1 block text-text-mid">{item.anchors[value - 1]}</span></label>)}</div>
        <textarea rows={2} maxLength={2000} value={current?.evidence || ''} onChange={(e) => setRating(item.code, { evidence: e.target.value })} placeholder="Evidence: what the candidate said or did" className="input mt-3" />
      </fieldset> })}
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Overall recommendation"><select disabled={locked} value={recommendation} onChange={(e) => setRecommendation(e.target.value as Recommendation)} className="input"><option value="">Choose…</option>{recommendations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Notes" hint="optional"><textarea disabled={locked} rows={2} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" /></Field></div>
      {locked ? <p className="text-sm text-text-mid">{scorecard.status === 'submitted' ? `Submitted ${showTime(scorecard.submitted_at)}. Ask People Ops if it needs a change.` : 'This interview was cancelled.'}</p>
        : <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => send('save')} className="rounded-full border px-5 py-2.5 text-sm font-bold">Save draft</button><button disabled={busy} className={primary}>{busy ? 'Saving…' : 'Submit scorecard'}</button></div>}
    </form>}
  </Modal>
}
