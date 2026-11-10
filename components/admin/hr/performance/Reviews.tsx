'use client'

import { useState } from 'react'
import { labelOf, reviewStatuses, reviewTypes, type ReviewType } from '@/lib/hr'
import { addDays, behaviourAreas, checkInAreas, displayDate, finalRating, isCheckIn, isRated, probationExtensionMaxMonths, probationOutcomes, addMonths, type HrReview, type PerformanceFile } from '@/lib/hr-performance'
import { Badge, Buttons, Card, Empty, Field, Modal, RatingSelect, call, primaryButton, smallButton, statusTone } from './ui'

type Mode = 'self' | 'manager' | 'decision' | 'finalise' | 'respond' | 'second' | 'schedule'
type Props = { file: PerformanceFile; reload: () => Promise<void>; onError: (message: string) => void; onNotice: (message: string) => void }
const ratingLabel = (rating: number | null) => rating ? `${rating} · ${['Does not meet', 'Partly meets', 'Meets expectations', 'Strong', 'Outstanding'][rating - 1]}` : '—'

export default function Reviews({ file, reload, onError, onNotice }: Props) {
  const [editing, setEditing] = useState<{ mode: Mode; review: HrReview | null } | null>(null)
  const { access, reviews } = file; const manages = access.isAdmin || access.isManager
  const probation = reviews.filter((review) => isCheckIn(review.review_type) || review.review_type === 'probation_decision')
  const appraisals = reviews.filter((review) => !probation.includes(review))
  async function act(body: Record<string, unknown>, done = 'Saved.') {
    const result = await call('/reviews', body.id ? 'PATCH' : 'POST', body)
    if (!result.ok) { onError(result.data.error || 'Could not save the review.'); return false }
    const letterDue = (result.data as { letterDue?: string }).letterDue
    onNotice(letterDue ? `${done} Give the employee the written outcome by ${displayDate(letterDue)}.` : done); await reload(); return true
  }
  const actions = (review: HrReview) => {
    const open = !['final', 'cancelled'].includes(review.status); const buttons: [string, Mode][] = []
    if (access.isSelf && ['scheduled', 'self_review'].includes(review.status) && review.review_type !== 'probation_decision') buttons.push([review.self_review ? 'Edit self-review' : 'Write self-review', 'self'])
    if (manages && !(access.isSelf && !access.isAdmin) && open && review.review_type !== 'probation_decision' && (review.status !== 'calibration' || access.isAdmin)) buttons.push(['Manager review', 'manager'])
    if (access.isAdmin && open && review.review_type === 'probation_decision') buttons.push(['Record decision', 'decision'])
    if (access.isAdmin && review.review_type === 'annual' && ['calibration', 'manager_review'].includes(review.status)) buttons.push(['Calibrate and finalise', 'finalise'])
    if (access.isSelf && review.status !== 'cancelled' && ['calibration', 'final'].includes(review.status)) buttons.push([review.employee_acknowledged_at ? 'Comment' : 'Comment / acknowledge', 'respond'])
    if (access.isAdmin && review.second_review_requested_at && !review.second_review_outcome) buttons.push(['Decide second review', 'second'])
    return buttons
  }
  const list = (items: HrReview[]) => items.length ? <div className="divide-y">{items.map((review) => <ReviewRow key={review.id} review={review} file={file} buttons={actions(review)} onOpen={(mode) => setEditing({ mode, review })} onCancel={access.isAdmin && !['final', 'cancelled'].includes(review.status) ? () => { if (confirm('Cancel this review?')) act({ id: review.id, action: 'cancel' }, 'Review cancelled.') } : undefined} />)}</div> : null
  return <div className="space-y-5">
    <Card title="Probation" description="Check-ins at the end of week 1 and days 30, 60 and 90, then the written decision within 5 working days of day 90." action={access.isAdmin && file.employee.start_date ? <button onClick={() => act({ employee_id: file.employee.id, action: 'schedule_probation' }, 'Probation reviews scheduled.')} className={smallButton}>Schedule probation reviews</button> : undefined}>
      {list(probation) || <Empty>{file.employee.start_date ? 'No probation reviews scheduled.' : 'Add a start date to the employee record to schedule probation reviews.'}</Empty>}
      {file.employee.probation_end_date && <p className="border-t px-5 py-3 text-xs text-text-mid">Probation ends {displayDate(file.employee.probation_end_date)}{file.employee.confirmed_at ? ` · confirmed ${displayDate(file.employee.confirmed_at)}` : ''}</p>}
    </Card>
    <Card title="Appraisals" description="Mid-year review in July (no rating); annual appraisal December to January, calibrated in February." action={manages && !(access.isSelf && !access.isAdmin) ? <button onClick={() => setEditing({ mode: 'schedule', review: null })} className={primaryButton}>+ Schedule review</button> : undefined}>
      {list(appraisals) || <Empty>No appraisals yet.</Empty>}
    </Card>
    {editing && <ReviewEditor mode={editing.mode} review={editing.review} file={file} onClose={() => setEditing(null)} onSave={async (body, done) => { const ok = await act(body, done); if (ok) setEditing(null) }} />}
  </div>
}

function ReviewRow({ review, file, buttons, onOpen, onCancel }: { review: HrReview; file: PerformanceFile; buttons: [string, Mode][]; onOpen: (mode: Mode) => void; onCancel?: () => void }) {
  const [open, setOpen] = useState(false); const rating = finalRating(review)
  const signoff = file.signoffOptions.find((option) => option.ref === review.clinical_signoff_ref)
  return <div className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <button onClick={() => setOpen(!open)} className="min-w-[220px] flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-green-deep">{labelOf(reviewTypes, review.review_type)}{review.review_year && !isCheckIn(review.review_type) ? ` ${review.review_year}` : ''}</h4><Badge tone={statusTone(review.status)}>{labelOf(reviewStatuses, review.status)}</Badge>{review.probation_outcome && <Badge tone={review.probation_outcome === 'confirmed' ? 'green' : review.probation_outcome === 'extended' ? 'amber' : 'red'}>{labelOf([...probationOutcomes], review.probation_outcome)}</Badge>}{review.ethics_override && <Badge tone="red">Ethics override</Badge>}{review.second_review_requested_at && <Badge tone="amber">{review.second_review_outcome ? 'Second review done' : 'Second review requested'}</Badge>}</div>
        <p className="mt-1 text-xs text-gray-500">Due {displayDate(review.scheduled_date)}{review.held_at ? ` · held ${displayDate(review.held_at)}` : ''}{isRated(review.review_type) && rating ? ` · rating ${ratingLabel(rating)}` : ''}{review.employee_acknowledged_at ? ` · acknowledged ${displayDate(review.employee_acknowledged_at)}` : ''}</p></button>
      <div className="flex flex-wrap gap-2">{buttons.map(([label, mode]) => <button key={mode} onClick={() => onOpen(mode)} className={smallButton}>{label}</button>)}{onCancel && <button onClick={onCancel} className="px-2 text-xs font-bold text-red-600">Cancel</button>}</div>
    </div>
    {open && <dl className="mt-4 grid gap-3 rounded-xl bg-[#fbfaf6] p-4 text-sm">
      {[['Self-review', review.self_review], ['Manager summary', review.manager_summary], [review.review_type === 'probation_decision' ? 'What must improve' : 'Actions and development plan', review.improvement_actions], ['Ethics override', review.ethics_override_reason], ['Employee comment', review.employee_comment], ['Second review outcome', review.second_review_outcome]].filter(([, text]) => text).map(([label, text]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-green-mid">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-text-mid">{text}</dd></div>)}
      {Object.entries(review.scores).filter(([key]) => key !== 'self').length > 0 && <div><dt className="text-xs font-bold uppercase tracking-wide text-green-mid">Scores</dt><dd className="mt-1 flex flex-wrap gap-2">{Object.entries(review.scores).filter(([key]) => key !== 'self').map(([key, value]) => <span key={key} className="rounded-full border bg-white px-3 py-1 text-xs">{checkInAreas.find((area) => area.key === key)?.label || key}: {String(value)}</span>)}</dd></div>}
      {review.probation_new_end_date && <div><dt className="text-xs font-bold uppercase tracking-wide text-green-mid">New probation end date</dt><dd className="mt-1">{displayDate(review.probation_new_end_date)}</dd></div>}
      {review.clinical_signoff_ref && <div><dt className="text-xs font-bold uppercase tracking-wide text-green-mid">Training sign-off</dt><dd className="mt-1 text-text-mid">{signoff ? `${signoff.label} (${displayDate(signoff.submitted_at)})` : 'Linked to a Training tab response'}</dd></div>}
      {!review.self_review && !review.manager_summary && <p className="text-text-mid">Nothing written yet.</p>}
    </dl>}
  </div>
}

function ReviewEditor({ mode, review, file, onClose, onSave }: { mode: Mode; review: HrReview | null; file: PerformanceFile; onClose: () => void; onSave: (body: Record<string, unknown>, done: string) => Promise<void> }) {
  const r = review; const type = r?.review_type
  const scoreKeys = type && isCheckIn(type) ? checkInAreas.map((area) => ({ key: area.key as string, label: area.label })) : behaviourAreas.map((label) => ({ key: label, label }))
  const managerScores = Object.fromEntries(Object.entries(r?.scores || {}).filter(([key]) => key !== 'self')) as Record<string, number>
  const [form, setForm] = useState({
    review_type: 'annual' as ReviewType, scheduled_date: '', review_year: String(new Date().getFullYear()),
    self_review: r?.self_review || '', self_scores: ((r?.scores?.self as Record<string, number>) || {}), manager_summary: r?.manager_summary || '', improvement_actions: r?.improvement_actions || '',
    scores: managerScores, overall_rating: r?.overall_rating ?? null as number | null, ethics_override: r?.ethics_override || false, ethics_override_reason: r?.ethics_override_reason || '',
    held_at: r?.held_at?.slice(0, 10) || '', clinical_signoff_ref: r?.clinical_signoff_ref || '', calibrated_rating: r?.calibrated_rating ?? r?.overall_rating ?? null as number | null,
    probation_outcome: r?.probation_outcome || '', probation_new_end_date: r?.probation_new_end_date || '', employee_comment: r?.employee_comment || '', second_review_outcome: r?.second_review_outcome || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }))
  const submit = async (body: Record<string, unknown>, done: string) => { setSaving(true); await onSave(body, done); setSaving(false) }
  const scoreGrid = (values: Record<string, number>, onChange: (values: Record<string, number>) => void) => <div className="grid gap-3 sm:grid-cols-2">{scoreKeys.map(({ key, label }) => <Field key={key} label={label}><RatingSelect value={values[key] ?? null} onChange={(value) => { const next = { ...values }; if (value) next[key] = value; else delete next[key]; onChange(next) }} label="Not scored" /></Field>)}</div>
  const title = type ? labelOf(reviewTypes, type) : 'Schedule a review'; const signoffs = file.signoffOptions
  const currentEnd = file.employee.probation_end_date || (file.employee.start_date ? addDays(file.employee.start_date, 90) : '')

  if (mode === 'schedule') return <Modal title={title} eyebrow="Performance" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ employee_id: file.employee.id, review_type: form.review_type, scheduled_date: form.scheduled_date, review_year: Number(form.review_year) }, 'Review scheduled.') }} className="space-y-4">
    <Field label="Review"><select value={form.review_type} onChange={(e) => set({ review_type: e.target.value as ReviewType })} className="input">{reviewTypes.filter((item) => file.access.isAdmin || item.value !== 'probation_decision').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Due date"><input required type="date" value={form.scheduled_date} onChange={(e) => set({ scheduled_date: e.target.value })} className="input" /></Field><Field label="Review year"><input type="number" min="2020" max="2100" value={form.review_year} onChange={(e) => set({ review_year: e.target.value })} className="input" /></Field></div>
    <Buttons onCancel={onClose} saving={saving} label="Schedule" /></form></Modal>

  if (mode === 'self') return <Modal title={`Self-review: ${title}`} eyebrow="Your review" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ id: r!.id, action: 'self_review', self_review: form.self_review, self_scores: form.self_scores, submit: true }, 'Self-review sent to your manager.') }} className="space-y-4">
    <Field label="How did it go?" hint="Progress on each goal and KPI, what helped, what got in the way"><textarea rows={8} maxLength={8000} value={form.self_review} onChange={(e) => set({ self_review: e.target.value })} className="input" /></Field>
    {type && !isCheckIn(type) && <div><p className="mb-2 text-sm font-bold text-green-deep">Behaviours (your own rating)</p>{scoreGrid(form.self_scores, (self_scores) => set({ self_scores }))}</div>}
    <Buttons onCancel={onClose} saving={saving} label="Send to manager" extra={<button type="button" disabled={saving} onClick={() => submit({ id: r!.id, action: 'self_review', self_review: form.self_review, self_scores: form.self_scores }, 'Draft saved.')} className="rounded-full border px-5 py-3 text-sm font-bold text-green-deep">Save draft</button>} /></form></Modal>

  if (mode === 'manager') {
    const body = () => ({ id: r!.id, action: 'manager_review', manager_summary: form.manager_summary, improvement_actions: form.improvement_actions, scores: form.scores, overall_rating: form.overall_rating, ethics_override: form.ethics_override, ethics_override_reason: form.ethics_override_reason, held_at: form.held_at, clinical_signoff_ref: form.clinical_signoff_ref })
    return <Modal title={`Manager review: ${title}`} eyebrow={file.employee.legal_name} onClose={onClose} wide><form onSubmit={(e) => { e.preventDefault(); submit({ ...body(), submit: true }, type === 'annual' ? 'Sent for calibration.' : 'Review signed off.') }} className="space-y-4">
      {r?.self_review && <div className="rounded-xl bg-[#fbfaf6] p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Self-review</p><p className="mt-1 whitespace-pre-wrap text-text-mid">{r.self_review}</p></div>}
      <Field label="Meeting held on"><input type="date" value={form.held_at} onChange={(e) => set({ held_at: e.target.value })} className="input sm:max-w-xs" /></Field>
      <div><p className="mb-2 text-sm font-bold text-green-deep">{type && isCheckIn(type) ? 'Probation checklist' : 'Behaviours'}</p>{scoreGrid(form.scores, (scores) => set({ scores }))}</div>
      <Field label="Summary" hint={type && isCheckIn(type) ? 'Training progress, supervised cases or leads, reliability, wellbeing' : 'Evidence for each goal and KPI; patient details by record ID only'}><textarea required rows={6} maxLength={8000} value={form.manager_summary} onChange={(e) => set({ manager_summary: e.target.value })} className="input" /></Field>
      <Field label={type === 'annual' ? 'Development plan and next year’s goals' : 'Agreed actions'}><textarea rows={4} maxLength={8000} value={form.improvement_actions} onChange={(e) => set({ improvement_actions: e.target.value })} className="input" /></Field>
      {type === 'day_90' && <Field label="Supervisor sign-off" hint="The Training tab sign-off survey response; it is linked, not copied">{signoffs.length ? <select value={form.clinical_signoff_ref} onChange={(e) => set({ clinical_signoff_ref: e.target.value })} className="input"><option value="">Not linked yet</option>{signoffs.map((option) => <option key={option.ref} value={option.ref}>{option.label} · {displayDate(option.submitted_at)}{option.score !== null ? ` · ${option.score}%` : ''}</option>)}</select> : <p className="text-sm font-normal text-text-mid">No Training tab form responses found for this person yet.</p>}</Field>}
      {type && isRated(type) && <Field label="Overall rating" hint="Judgement, roughly 60% goals and KPIs, 40% behaviours"><RatingSelect value={form.overall_rating} onChange={(overall_rating) => set({ overall_rating })} max={form.ethics_override ? 2 : 5} /></Field>}
      {file.access.isAdmin && type && isRated(type) && <div className="rounded-xl border border-red-100 bg-red-50/50 p-4"><label className="flex items-center gap-2 text-sm font-bold text-red-700"><input type="checkbox" checked={form.ethics_override} onChange={(e) => set({ ethics_override: e.target.checked, overall_rating: e.target.checked && form.overall_rating ? Math.min(form.overall_rating, 2) : form.overall_rating })} />Ethics override (caps the rating at 2 and rules out a merit raise)</label>{form.ethics_override && <textarea required rows={2} maxLength={2000} value={form.ethics_override_reason} onChange={(e) => set({ ethics_override_reason: e.target.value })} placeholder="The substantiated clinical ethics, privacy or “what we may say” breach" className="input mt-3" />}</div>}
      <Buttons onCancel={onClose} saving={saving} label={type === 'annual' ? 'Send for calibration' : 'Sign off'} extra={<button type="button" disabled={saving} onClick={() => submit(body(), 'Draft saved.')} className="rounded-full border px-5 py-3 text-sm font-bold text-green-deep">Save draft</button>} /></form></Modal>
  }

  if (mode === 'decision') return <Modal title="Probation decision" eyebrow={file.employee.legal_name} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); if (form.probation_outcome === 'not_confirmed' && !confirm('Record probation as not confirmed? This opens an offboarding case.')) return; submit({ id: r!.id, action: 'probation_decision', probation_outcome: form.probation_outcome, probation_new_end_date: form.probation_new_end_date, manager_summary: form.manager_summary, improvement_actions: form.improvement_actions, held_at: form.held_at, clinical_signoff_ref: form.clinical_signoff_ref }, 'Probation decision recorded.') }} className="space-y-4">
    <p className="text-sm text-text-mid">Current probation end: {displayDate(currentEnd)}. The outcome is written, signed and given to the employee within 5 working days of day 90. A serious breach goes through the disciplinary process instead.</p>
    <Field label="Outcome"><select required value={form.probation_outcome} onChange={(e) => set({ probation_outcome: e.target.value as typeof form.probation_outcome })} className="input"><option value="">Choose…</option>{probationOutcomes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
    {form.probation_outcome === 'extended' && <Field label="New end date" hint={`once only, up to ${probationExtensionMaxMonths} months`}><input required type="date" min={currentEnd ? addDays(currentEnd, 1) : undefined} max={currentEnd ? addMonths(currentEnd, probationExtensionMaxMonths) : undefined} value={form.probation_new_end_date} onChange={(e) => set({ probation_new_end_date: e.target.value })} className="input" /></Field>}
    <Field label="Meeting held on"><input type="date" value={form.held_at} onChange={(e) => set({ held_at: e.target.value })} className="input sm:max-w-xs" /></Field>
    <Field label="Reasons" hint="training, competence, professional standards, reliability, fit"><textarea required rows={5} maxLength={8000} value={form.manager_summary} onChange={(e) => set({ manager_summary: e.target.value })} className="input" /></Field>
    {form.probation_outcome === 'extended' && <Field label="What must improve and by when"><textarea required rows={4} maxLength={8000} value={form.improvement_actions} onChange={(e) => set({ improvement_actions: e.target.value })} className="input" /></Field>}
    {signoffs.length > 0 && <Field label="Supervisor sign-off (Training tab)"><select value={form.clinical_signoff_ref} onChange={(e) => set({ clinical_signoff_ref: e.target.value })} className="input"><option value="">Not linked</option>{signoffs.map((option) => <option key={option.ref} value={option.ref}>{option.label} · {displayDate(option.submitted_at)}</option>)}</select></Field>}
    <Buttons onCancel={onClose} saving={saving} label="Record decision" /></form></Modal>

  if (mode === 'finalise') return <Modal title="Calibrate and finalise" eyebrow={file.employee.legal_name} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ id: r!.id, action: 'finalise', calibrated_rating: form.calibrated_rating }, 'Rating finalised. Share it with the employee in writing.') }} className="space-y-4">
    <p className="text-sm text-text-mid">Manager’s proposed rating: {ratingLabel(r?.overall_rating ?? null)}.{r?.ethics_override ? ' Ethics override applies: the final rating is capped at 2.' : ''}{r?.employee_comment ? ` Employee comment: “${r.employee_comment}”` : ''}</p>
    <Field label="Calibrated rating"><RatingSelect value={form.calibrated_rating} onChange={(calibrated_rating) => set({ calibrated_rating })} max={r?.ethics_override ? 2 : 5} /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Finalise" /></form></Modal>

  if (mode === 'second') return <Modal title="Second review" eyebrow={file.employee.legal_name} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ id: r!.id, action: 'second_review', second_review_outcome: form.second_review_outcome, calibrated_rating: form.calibrated_rating }, 'Second review recorded.') }} className="space-y-4">
    <p className="text-sm text-text-mid">Requested {displayDate(r?.second_review_requested_at)}. Decide within 10 working days; the decision is final for the appraisal. Reason given: “{r?.employee_comment}”</p>
    <Field label="Rating after review"><RatingSelect value={form.calibrated_rating} onChange={(calibrated_rating) => set({ calibrated_rating })} max={r?.ethics_override ? 2 : 5} /></Field>
    <Field label="Outcome and reasons"><textarea required rows={5} maxLength={4000} value={form.second_review_outcome} onChange={(e) => set({ second_review_outcome: e.target.value })} className="input" /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Record outcome" /></form></Modal>

  const canAppeal = r?.review_type === 'annual' && r.status === 'final' && !r.second_review_requested_at
  return <Modal title={title} eyebrow="Your review" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ id: r!.id, action: r?.status === 'final' && !r.employee_acknowledged_at ? 'acknowledge' : 'comment', employee_comment: form.employee_comment }, r?.status === 'final' && !r.employee_acknowledged_at ? 'Thanks, your acknowledgement is recorded.' : 'Comment saved.') }} className="space-y-4">
    {r && isRated(r.review_type) && <p className="text-sm text-text-mid">Rating: <strong>{ratingLabel(finalRating(r))}</strong>{r.status === 'calibration' ? ' (proposed; not final until calibration)' : ''}</p>}
    {r?.manager_summary && <div className="rounded-xl bg-[#fbfaf6] p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Manager summary</p><p className="mt-1 whitespace-pre-wrap text-text-mid">{r.manager_summary}</p></div>}
    <Field label="Your comments"><textarea rows={4} maxLength={4000} value={form.employee_comment} onChange={(e) => set({ employee_comment: e.target.value })} className="input" /></Field>
    {r?.status === 'final' && !r.employee_acknowledged_at && <p className="text-xs text-gray-500">Acknowledging confirms you have seen the review, not that you agree with it.</p>}
    <Buttons onCancel={onClose} saving={saving} label={r?.status === 'final' && !r.employee_acknowledged_at ? 'Acknowledge' : 'Save comment'} extra={canAppeal ? <button type="button" disabled={saving || !form.employee_comment.trim()} title="Within 10 working days of the final rating; say why in your comments" onClick={() => { if (confirm('Ask the Admin for a second review of this rating?')) submit({ id: r!.id, action: 'request_second_review', employee_comment: form.employee_comment }, 'Second review requested.') }} className="rounded-full border border-amber-300 px-5 py-3 text-sm font-bold text-amber-700 disabled:opacity-50">Ask for a second review</button> : undefined} /></form></Modal>
}
