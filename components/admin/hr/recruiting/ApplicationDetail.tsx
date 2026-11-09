'use client'

import { useCallback, useEffect, useState } from 'react'
import { applicationStages, candidateSources, credentialStatuses, credentialTypes, documentTypes, formatNaira, hrEmploymentTypes, interviewFormats, interviewStatuses, labelOf, offerStatuses, recommendations, referenceOutcomes, roleFamilies, type ApplicationStage, type CredentialStatus, type CredentialType, type DocumentType, type InterviewStatus, type RoleFamily } from '@/lib/hr'
import { communicationChannels, interviewLoops, isClosedStage, manualStageTargets, missingApprovals, offerApprovalRoles, referenceQuestions, type DecisionCheck, type HrApplication, type HrApplicationEvent, type HrCandidate, type HrInterview, type HrOffer, type HrReferenceCheck, type HrRequisition, type HrScorecard, type HrScorecardTemplate, type SalaryBandSummary, type offerApprovalRules } from '@/lib/hr-recruiting'
import { dueLabel } from '@/lib/follow-ups'
import { Alert, Badge, Empty, Field, Modal, api, call, danger, fromLocalInput, outline, primary, showDate, showTime } from './ui'

export type Staff = { id: string; email: string; name: string; role: string }
type Credential = { id: string; credential_type: CredentialType; issuing_body: string | null; registration_number: string | null; licence_number: string | null; issued_on: string | null; expires_on: string | null; status: CredentialStatus; verification_method: string | null; verified_at: string | null; notes: string; employee_id: string | null }
type Document = { id: string; document_type: DocumentType; title: string; mime_type: string | null; size_bytes: number | null; is_restricted: boolean; status: string; verified_at: string | null; verification_method: string | null; employee_id: string | null; created_at: string }
type Offer = HrOffer & { band: SalaryBandSummary | null; rules: ReturnType<typeof offerApprovalRules> }
type Detail = {
  application: HrApplication & { candidate: HrCandidate }; events: HrApplicationEvent[]; interviews: HrInterview[]; template: HrScorecardTemplate | null; requisition: HrRequisition | null; staff: Staff[]
  scorecards: (HrScorecard & { interviewer_email: string })[]; decision: DecisionCheck; references: HrReferenceCheck[]; credentials: Credential[]; documents: Document[]; offers: Offer[]
}
type Tab = 'overview' | 'interviews' | 'decision' | 'checks' | 'offer'
const tabs: { id: Tab; label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'interviews', label: 'Interviews' }, { id: 'decision', label: 'Debrief' }, { id: 'checks', label: 'References & checks' }, { id: 'offer', label: 'Offer & hire' }]
const ask = (message: string) => { const value = window.prompt(message); return value && value.trim() ? value.trim() : null }
export const staffName = (staff: Staff[], id: string | null | undefined) => { const member = staff.find((item) => item.id === id); return member ? member.name || member.email : id ? 'Former staff' : '—' }

// One application, for People Ops / MD: stage moves with reasons, candidate
// contact log, interviews and panel, debrief decision rules, references and
// credential checks, the offer with its approvals, and the hire handover.
export default function ApplicationDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null); const [tab, setTab] = useState<Tab>('overview'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { const { ok, data } = await call<Detail>(`${api}/applications?id=${id}`); ok ? setDetail(data) : setError(data.error || 'Could not load the application.') }, [id])
  useEffect(() => { load() }, [load])
  // Runs an API call, then reloads this file and the pipeline.
  const run = useCallback(async (url: string, method: string, body?: unknown) => {
    setBusy(true); setError(''); const { ok, data } = await call(url, method, body); setBusy(false)
    if (!ok) { setError(data.error || 'Something went wrong.'); return false }
    await load(); onChanged(); return true
  }, [load, onChanged])
  if (!detail) return <Modal title="Application" onClose={onClose} wide>{error ? <Alert>{error}</Alert> : <p className="text-text-mid">Loading…</p>}</Modal>
  const { application } = detail; const closed = isClosedStage(application.stage)
  return <Modal title={application.candidate?.full_name || 'Candidate'} eyebrow={`${application.opening_title} · ${labelOf(applicationStages, application.stage)}`} onClose={onClose} wide>
    <nav className="mb-5 flex flex-wrap gap-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-full px-4 py-2 text-xs font-bold ${tab === item.id ? 'bg-green-deep text-white' : 'border text-green-deep'}`}>{item.label}</button>)}</nav>
    <div className="space-y-5"><Alert>{error}</Alert>
      {tab === 'overview' && <Overview detail={detail} run={run} busy={busy} closed={closed} />}
      {tab === 'interviews' && <Interviews detail={detail} run={run} busy={busy} closed={closed} />}
      {tab === 'decision' && <Debrief detail={detail} run={run} busy={busy} />}
      {tab === 'checks' && <Checks detail={detail} run={run} busy={busy} closed={closed} setError={setError} />}
      {tab === 'offer' && <Offers detail={detail} run={run} busy={busy} closed={closed} />}
    </div>
  </Modal>
}
type Props = { detail: Detail; run: (url: string, method: string, body?: unknown) => Promise<boolean>; busy: boolean; closed?: boolean }

function Overview({ detail, run, busy, closed }: Props) {
  const { application, staff, events } = detail; const candidate = application.candidate; const appId = application.id
  const [form, setForm] = useState({ role_family: application.role_family || '', hiring_manager_id: application.hiring_manager_id || '', notice_period: application.notice_period || '', right_to_work_status: application.right_to_work_status || '', salary_expectation_ngn: application.salary_expectation_ngn ?? '', phone: candidate?.phone || '', location: candidate?.location || '' })
  const [stage, setStage] = useState({ to: '' as ApplicationStage | '', reason: '', note: '', channel: '' })
  const [message, setMessage] = useState({ note: '', channel: 'email' })
  const targets = manualStageTargets.filter((value) => value !== application.stage)
  const interviewed = detail.interviews.some((item) => item.status === 'completed')
  return <>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border p-5 text-sm"><h4 className="font-bold text-green-deep">Candidate</h4>
        {candidate?.anonymised_at ? <p className="mt-2 text-text-mid">Anonymised {showDate(candidate.anonymised_at)}.</p> : <dl className="mt-3 grid grid-cols-[130px_1fr] gap-y-1.5 text-text-mid">
          <dt>Email</dt><dd className="break-all">{candidate?.email}</dd><dt>Source</dt><dd>{labelOf(candidateSources, candidate?.source)}</dd>
          <dt>Privacy notice</dt><dd>v{candidate?.privacy_notice_version} · {showDate(candidate?.privacy_acknowledged_at)}</dd>
          <dt>Talent pool</dt><dd>{candidate?.talent_pool_consent ? `Consent until ${showDate(candidate.talent_pool_expires_at)}` : 'No consent'}</dd>
          <dt>Delete after</dt><dd>{candidate?.retention_delete_after ? showDate(candidate.retention_delete_after) : application.employee_id ? 'On the employee file' : '—'}</dd>
          <dt>Applied</dt><dd>{showDate(application.created_at)}</dd>
        </dl>}
        {candidate && !candidate.anonymised_at && !application.employee_id && <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => confirm(candidate.talent_pool_consent ? 'Record that the candidate renewed talent-pool consent (12 more months, up to 24 in total)?' : 'Record that the candidate gave explicit consent to stay in the talent pool?') && run(`${api}/applications`, 'PATCH', { id: appId, action: 'talent_pool', consent: true })} className={outline}>{candidate.talent_pool_consent ? 'Renew talent-pool consent' : 'Record talent-pool consent'}</button>
          {candidate.talent_pool_consent && <button disabled={busy} onClick={() => confirm('Record that the candidate withdrew talent-pool consent?') && run(`${api}/applications`, 'PATCH', { id: appId, action: 'talent_pool', consent: false })} className={outline}>Withdraw consent</button>}
          {closed && <button disabled={busy} onClick={() => { const reason = ask('Anonymise this candidate now (erasure request)? Their CV, documents, references and notes are deleted; this cannot be undone. Reason:'); if (reason) run(`${api}/applications`, 'PATCH', { id: appId, action: 'anonymise', reason }) }} className={danger}>Anonymise now</button>}
        </div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); run(`${api}/applications`, 'PATCH', { id: appId, action: 'update', ...form, hiring_manager_id: form.hiring_manager_id || null, salary_expectation_ngn: form.salary_expectation_ngn === '' ? null : form.salary_expectation_ngn }) }} className="space-y-3 rounded-xl border p-5">
        <h4 className="font-bold text-green-deep">Application</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Role family"><select disabled={closed} value={form.role_family} onChange={(e) => setForm({ ...form, role_family: e.target.value })} className="input"><option value="">Not set</option>{roleFamilies.map((item) => <option key={item.value} value={item.value}>{item.value} · {item.label}</option>)}</select></Field>
          <Field label="Hiring manager"><select disabled={closed} value={form.hiring_manager_id} onChange={(e) => setForm({ ...form, hiring_manager_id: e.target.value })} className="input"><option value="">Not set</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name || member.email}</option>)}</select></Field>
          <Field label="Phone"><input disabled={closed} maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
          <Field label="Location"><input disabled={closed} maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" /></Field>
          <Field label="Notice period"><input disabled={closed} maxLength={120} value={form.notice_period} onChange={(e) => setForm({ ...form, notice_period: e.target.value })} className="input" /></Field>
          <Field label="Salary expectation (₦/month)" hint="never ask salary history"><input disabled={closed} type="number" min="0" value={form.salary_expectation_ngn} onChange={(e) => setForm({ ...form, salary_expectation_ngn: e.target.value })} className="input" /></Field>
        </div>
        <Field label="Right to work"><input disabled={closed} maxLength={120} value={form.right_to_work_status} onChange={(e) => setForm({ ...form, right_to_work_status: e.target.value })} className="input" /></Field>
        {!closed && <div className="flex justify-end"><button disabled={busy} className={outline}>Save details</button></div>}
      </form>
    </div>
    {application.cover_note && <details className="rounded-xl border p-5 text-sm"><summary className="cursor-pointer font-bold text-green-deep">Cover note</summary><p className="mt-2 whitespace-pre-wrap text-text-mid">{application.cover_note}</p></details>}
    {!closed && <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={async (e) => { e.preventDefault(); if (await run(`${api}/applications`, 'PATCH', { id: appId, action: 'stage', ...stage, channel: stage.channel || null })) setStage({ to: '', reason: '', note: '', channel: '' }) }} className="space-y-3 rounded-xl border p-5">
        <h4 className="font-bold text-green-deep">Stage</h4>
        <p className="text-xs text-text-mid">In {labelOf(applicationStages, application.stage)} since {showDate(application.stage_entered_at)} · {application.stage_due_at ? dueLabel(application.stage_due_at) : 'no time limit'}. Offer stages follow the offer; hire from the Offer tab.</p>
        <Field label="Move to"><select required value={stage.to} onChange={(e) => setStage({ ...stage, to: e.target.value as ApplicationStage })} className="input"><option value="">Choose…</option>{targets.map((value) => <option key={value} value={value}>{labelOf(applicationStages, value)}</option>)}</select></Field>
        {(stage.to === 'rejected' || stage.to === 'withdrawn') && <Field label="Reason" hint="recorded on the file"><textarea required rows={2} maxLength={1000} value={stage.reason} onChange={(e) => setStage({ ...stage, reason: e.target.value })} className="input" /></Field>}
        {stage.to === 'rejected' && interviewed && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">After an interview, tell the candidate by phone or a personal email, not a template.</p>}
        <Field label="Note" hint="optional"><input maxLength={2000} value={stage.note} onChange={(e) => setStage({ ...stage, note: e.target.value })} className="input" /></Field>
        <Field label="Candidate told via" hint="optional"><select value={stage.channel} onChange={(e) => setStage({ ...stage, channel: e.target.value })} className="input"><option value="">Not yet</option>{communicationChannels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <div className="flex justify-end"><button disabled={busy || !stage.to} className={primary}>Move</button></div>
      </form>
      <form onSubmit={async (e) => { e.preventDefault(); if (await run(`${api}/applications`, 'PATCH', { id: appId, action: 'message', ...message })) setMessage({ note: '', channel: message.channel }) }} className="space-y-3 rounded-xl border p-5">
        <h4 className="font-bold text-green-deep">Log candidate contact</h4>
        <p className="text-xs text-text-mid">Every candidate hears from us within 5 working days at every stage. Last contact: {application.last_candidate_contact_at ? showTime(application.last_candidate_contact_at) : 'none recorded'}.</p>
        <Field label="Channel"><select value={message.channel} onChange={(e) => setMessage({ ...message, channel: e.target.value })} className="input">{communicationChannels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="What was said"><textarea required rows={3} maxLength={2000} value={message.note} onChange={(e) => setMessage({ ...message, note: e.target.value })} className="input" /></Field>
        <div className="flex justify-end"><button disabled={busy} className={outline}>Log contact</button></div>
      </form>
    </div>}
    <div className="rounded-xl border p-5"><h4 className="font-bold text-green-deep">History</h4>
      {!events.length ? <p className="mt-2 text-sm text-text-mid">No events yet.</p> : <ol className="mt-3 space-y-2 text-sm">{events.map((event) => <li key={event.id} className="flex gap-3"><span className="w-32 shrink-0 text-xs text-gray-500">{showTime(event.changed_at)}</span><span className="text-text-mid">{event.to_stage && event.to_stage !== event.from_stage && <b className="text-green-deep">{event.from_stage ? `${labelOf(applicationStages, event.from_stage)} → ` : ''}{labelOf(applicationStages, event.to_stage)}. </b>}{event.communication_sent && <Badge tone="blue">{event.communication_channel || 'contact'}</Badge>} {event.note} <span className="text-xs text-gray-400">{event.changed_by ? staffName(staff, event.changed_by) : 'Candidate'}</span></span></li>)}</ol>}
    </div>
  </>
}

function Interviews({ detail, run, busy, closed }: Props) {
  const { application, staff, interviews, scorecards } = detail; const family = application.role_family as RoleFamily | null
  const blank = { loop_step_code: '', title: '', format: 'in_person', scheduled_at: '', duration_min: '', location_or_link: '', adjustments_requested: '', interviewer_ids: [] as string[] }
  const [form, setForm] = useState(blank); const [adding, setAdding] = useState<Record<string, string>>({}); const [openCard, setOpenCard] = useState<string | null>(null)
  const steps = family ? interviewLoops[family] : []
  const competencyName = (code: string) => detail.template?.competencies.find((item) => item.code === code)?.name || code
  return <>
    {!family && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Set the role family on the Overview tab so interviews follow the fixed loop and scorecard.</p>}
    {family && <div className="rounded-xl bg-[#fbfaf6] p-4 text-sm"><b className="text-green-deep">Loop for {labelOf(roleFamilies, family)}:</b><ul className="mt-2 space-y-1 text-text-mid">{steps.map((step) => <li key={step.code}><b>{step.code}</b> {step.title} — {step.panel}, {step.minutes} min ({step.tests})</li>)}</ul></div>}
    {!interviews.length ? <Empty>No interviews scheduled yet.</Empty> : interviews.map((interview) => { const cards = scorecards.filter((card) => card.interview_id === interview.id); return <div key={interview.id} className="rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-green-deep">{interview.loop_step_code && `${interview.loop_step_code} · `}{interview.title}</h4><p className="text-xs text-text-mid">{showTime(interview.scheduled_at)} · {labelOf(interviewFormats, interview.format)}{interview.duration_min ? ` · ${interview.duration_min} min` : ''}{interview.location_or_link ? ` · ${interview.location_or_link}` : ''}</p>{interview.adjustments_requested && <p className="mt-1 text-xs text-amber-700">Adjustments: {interview.adjustments_requested}</p>}</div>
        {!closed && <div className="flex items-center gap-2"><select aria-label="Interview status" disabled={busy} value={interview.status} onChange={(e) => run(`${api}/interviews`, 'PATCH', { id: interview.id, status: e.target.value as InterviewStatus })} className="input w-40 py-2 text-xs">{interviewStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button disabled={busy} onClick={() => confirm('Remove this interview and its unsubmitted scorecards?') && run(`${api}/interviews?id=${interview.id}`, 'DELETE')} className={danger}>Remove</button></div>}
      </div>
      <ul className="mt-3 divide-y rounded-lg border text-sm">{cards.map((card) => <li key={card.id} className="p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-green-deep">{card.interviewer_email}</span>
        <span className="flex flex-wrap items-center gap-2">{card.conflict_declared ? <Badge tone="red">Conflict: {card.conflict_note}</Badge> : <Badge tone={card.status === 'submitted' ? 'green' : 'amber'}>{card.status}</Badge>}{card.overall_recommendation && <Badge tone="blue">{labelOf(recommendations, card.overall_recommendation)}</Badge>}
          {card.status === 'submitted' && <button onClick={() => setOpenCard(openCard === card.id ? null : card.id)} className={outline}>{openCard === card.id ? 'Hide' : 'Read'}</button>}
          {!closed && card.status === 'submitted' && <button disabled={busy} onClick={() => { const reason = ask('Why unlock this submitted scorecard?'); if (reason) run(`${api}/scorecards`, 'PATCH', { id: card.id, action: 'unlock', reason }) }} className={outline}>Unlock</button>}
          {!closed && (card.status !== 'submitted' || card.conflict_declared) && <button disabled={busy} onClick={() => confirm('Remove this interviewer?') && run(`${api}/interviews`, 'PATCH', { id: interview.id, action: 'remove_interviewer', scorecard_id: card.id })} className={danger}>Remove</button>}</span></div>
        {openCard === card.id && <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-xs">{card.ratings.map((rating) => <p key={rating.competency_code}><b>{competencyName(rating.competency_code)}: {rating.rating}</b> — {rating.evidence}</p>)}{card.notes && <p className="text-text-mid">Notes: {card.notes}</p>}<p className="text-gray-400">Submitted {showTime(card.submitted_at)}</p></div>}
      </li>)}{!cards.length && <li className="p-3 text-text-mid">No interviewers assigned.</li>}</ul>
      {!closed && <div className="mt-3 flex gap-2"><select aria-label="Add interviewer" value={adding[interview.id] || ''} onChange={(e) => setAdding({ ...adding, [interview.id]: e.target.value })} className="input py-2 text-xs"><option value="">Add interviewer…</option>{staff.filter((member) => !cards.some((card) => card.interviewer_id === member.id)).map((member) => <option key={member.id} value={member.id}>{member.name || member.email}</option>)}</select><button disabled={busy || !adding[interview.id]} onClick={async () => { if (await run(`${api}/interviews`, 'PATCH', { id: interview.id, action: 'add_interviewers', interviewer_ids: [adding[interview.id]] })) setAdding({ ...adding, [interview.id]: '' }) }} className={outline}>Add</button></div>}
    </div> })}
    {!closed && <form onSubmit={async (e) => { e.preventDefault(); if (await run(`${api}/interviews`, 'POST', { ...form, application_id: application.id, scheduled_at: fromLocalInput(form.scheduled_at) })) setForm(blank) }} className="space-y-3 rounded-xl border border-dashed p-5">
      <h4 className="font-bold text-green-deep">Schedule an interview</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Loop step"><select value={form.loop_step_code} onChange={(e) => { const step = steps.find((item) => item.code === e.target.value); setForm({ ...form, loop_step_code: e.target.value, title: step?.title || form.title, format: step?.format || form.format, duration_min: step ? String(step.minutes) : form.duration_min }) }} className="input"><option value="">Other</option>{steps.map((step) => <option key={step.code} value={step.code}>{step.code} {step.title}</option>)}</select></Field>
        <Field label="Title"><input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
        <Field label="Format"><select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="input">{interviewFormats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="When (Lagos time)"><input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="input" /></Field>
        <Field label="Minutes"><input type="number" min="5" max="600" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className="input" /></Field>
        <Field label="Place or link"><input maxLength={1000} value={form.location_or_link} onChange={(e) => setForm({ ...form, location_or_link: e.target.value })} className="input" /></Field>
      </div>
      <Field label="Adjustments the candidate asked for" hint="offer at every interview"><input maxLength={1000} value={form.adjustments_requested} onChange={(e) => setForm({ ...form, adjustments_requested: e.target.value })} className="input" /></Field>
      <Field label="Interviewers" hint="each scores independently and declares conflicts first"><div className="mt-1 grid gap-1 sm:grid-cols-2">{staff.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={form.interviewer_ids.includes(member.id)} onChange={(e) => setForm({ ...form, interviewer_ids: e.target.checked ? [...form.interviewer_ids, member.id] : form.interviewer_ids.filter((id) => id !== member.id) })} />{member.name || member.email} <span className="text-xs text-gray-400">{member.role}</span></label>)}</div></Field>
      {form.interviewer_ids.length === 1 && <p className="text-xs text-amber-700">No one interviews alone for a final decision; add a second panel member for the loop.</p>}
      <div className="flex justify-end"><button disabled={busy || !form.interviewer_ids.length} className={primary}>Schedule</button></div>
    </form>}
  </>
}

function Debrief({ detail, run, busy }: Props) {
  const { application, decision } = detail
  const [form, setForm] = useState({ decision: '', reason: '', override_reason: '' })
  return <>
    <div className="grid gap-4 sm:grid-cols-4">{[['Submitted', decision.submitted], ['Pending', decision.pending], ['Average', decision.average?.toFixed(2) ?? '—'], ['Ratings of 2', decision.twos]].map(([label, value]) => <div key={label} className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-green-mid">{label}</p><p className="mt-1 text-2xl font-bold text-green-deep">{value}</p></div>)}</div>
    <div className={`rounded-xl p-4 text-sm ${decision.passes ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>{decision.passes ? `Meets the decision rules (average ≥ ${Number(detail.template?.min_average ?? 3).toFixed(1)}, at most ${detail.template?.max_twos ?? 1} rating of 2, no knockout 1s).` : decision.reasons.join(' ')}{decision.conflicts > 0 && ` ${decision.conflicts} interviewer(s) declared a conflict and are excluded.`}</div>
    {!detail.template && <p className="text-xs text-text-mid">No active scorecard template for this role family; the default knockout competencies apply.</p>}
    {application.decision && <div className="rounded-xl border p-4 text-sm"><b className="text-green-deep">Decision: {application.decision === 'hire' ? 'Hire' : 'No hire'}</b> · {showDate(application.decided_at)} · {staffName(detail.staff, application.decided_by)}<p className="mt-1 whitespace-pre-wrap text-text-mid">{application.decision_reason}</p></div>}
    {application.stage === 'debrief' ? <form onSubmit={(e) => { e.preventDefault(); run(`${api}/applications`, 'PATCH', { id: application.id, action: 'decision', ...form }) }} className="space-y-3 rounded-xl border p-5">
      <h4 className="font-bold text-green-deep">Record the debrief decision</h4><p className="text-xs text-text-mid">The hiring manager chairs the debrief and records hire or no hire with the reasons. A split panel is settled by the hiring manager in writing.</p>
      <div className="flex gap-6 text-sm">{[['hire', 'Hire'], ['no_hire', 'No hire']].map(([value, label]) => <label key={value} className="flex items-center gap-2"><input type="radio" required name="decision" checked={form.decision === value} onChange={() => setForm({ ...form, decision: value })} />{label}</label>)}</div>
      <Field label="Reasons"><textarea required rows={3} maxLength={3000} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input" /></Field>
      {form.decision === 'hire' && !decision.passes && <Field label="Override of the decision rules" hint="the Approver can overrule only in writing"><textarea required rows={2} maxLength={2000} value={form.override_reason} onChange={(e) => setForm({ ...form, override_reason: e.target.value })} className="input" /></Field>}
      <div className="flex justify-end"><button disabled={busy || decision.pending > 0} className={primary}>Record decision</button></div>
    </form> : !application.decision && <p className="text-sm text-text-mid">Move the application to Debrief once every scorecard is in.</p>}
  </>
}

function Checks({ detail, run, busy, closed, setError }: Props & { setError: (message: string) => void }) {
  const { application, references, credentials, documents } = detail; const appId = application.id; const hire = application.decision === 'hire'
  const [reference, setReference] = useState<HrReferenceCheck | 'new' | null>(null)
  const [credential, setCredential] = useState({ credential_type: 'NIN', issuing_body: '', registration_number: '', licence_number: '', issued_on: '', expires_on: '', notes: '' })
  const [upload, setUpload] = useState<{ document_type: DocumentType; title: string; file: File | null }>({ document_type: hire ? 'id' : 'cv', title: '', file: null })
  async function open(documentId: string) { const { ok, data } = await call<{ url: string }>(`${api}/checks?document=${documentId}`); if (ok && data.url) window.open(data.url, '_blank', 'noopener,noreferrer'); else setError(data.error || 'Could not open the document.') }
  return <>
    {!hire && <p className="rounded-xl bg-[#fbfaf6] p-4 text-sm text-text-mid">Collect only what the stage needs: references, identity, licences and other checks start after the decision to hire. Only the CV is held before then.</p>}
    <div className="rounded-xl border p-5"><div className="flex items-center justify-between"><h4 className="font-bold text-green-deep">References</h4>{!closed && hire && <button onClick={() => setReference('new')} className={outline}>+ Referee</button>}</div>
      <p className="mt-1 text-xs text-text-mid">Two professional referees, one a recent line manager or clinical supervisor. Get the candidate's consent before each call; contact a current employer only with permission.</p>
      {!references.length ? <p className="mt-3 text-sm text-text-mid">None yet.</p> : <ul className="mt-3 divide-y text-sm">{references.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b className="text-green-deep">{item.referee_name}</b> · {item.referee_relationship || 'relationship not set'}{item.referee_organisation ? `, ${item.referee_organisation}` : ''}{item.is_current_employer && ' · current employer'}</span><span className="flex items-center gap-2">{item.candidate_consent_at ? <Badge tone="gray">Consent {showDate(item.candidate_consent_at)}</Badge> : <Badge tone="amber">No consent yet</Badge>}<Badge tone={item.outcome === 'clear' ? 'green' : item.outcome === 'concern' ? 'red' : 'gray'}>{item.outcome ? labelOf(referenceOutcomes, item.outcome) : 'Not checked'}</Badge><button onClick={() => setReference(item)} className={outline}>Open</button></span></li>)}</ul>}
    </div>
    <div className="rounded-xl border p-5"><h4 className="font-bold text-green-deep">Credentials</h4><p className="mt-1 text-xs text-text-mid">Identity, right to work, qualifications, licences (MDCN, NMCN, MLSCN, PCN…), indemnity. For NIN only the last four digits are kept. Police certificates: record the outcome only.</p>
      {!credentials.length ? <p className="mt-3 text-sm text-text-mid">None yet.</p> : <ul className="mt-3 divide-y text-sm">{credentials.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b className="text-green-deep">{labelOf(credentialTypes, item.credential_type)}</b>{item.issuing_body ? ` · ${item.issuing_body}` : ''}{item.licence_number || item.registration_number ? ` · ${item.licence_number || item.registration_number}` : ''}{item.expires_on ? ` · expires ${showDate(item.expires_on)}` : ''}{item.verification_method && <span className="block text-xs text-gray-500">{item.verification_method}</span>}</span><span className="flex items-center gap-2"><Badge tone={item.status === 'current' ? 'green' : item.status === 'failed' ? 'red' : 'amber'}>{labelOf(credentialStatuses, item.status)}</Badge>{!closed && !item.employee_id && item.status === 'pending_verification' && <><button disabled={busy} onClick={() => { const method = ask('How was it verified (register or portal checked, original sighted)?'); if (method) run(`${api}/checks`, 'PATCH', { credential_id: item.id, action: 'verify', verification_method: method }) }} className={outline}>Verify</button><button disabled={busy} onClick={() => { const method = ask('What failed?'); if (method) run(`${api}/checks`, 'PATCH', { credential_id: item.id, action: 'fail', verification_method: method }) }} className={danger}>Fail</button></>}{!closed && !item.employee_id && <button disabled={busy} onClick={() => confirm('Delete this check?') && run(`${api}/checks?credential=${item.id}`, 'DELETE')} className={danger}>×</button>}</span></li>)}</ul>}
      {!closed && hire && <form onSubmit={async (e) => { e.preventDefault(); if (await run(`${api}/checks`, 'POST', { ...credential, application_id: appId })) setCredential({ ...credential, issuing_body: '', registration_number: '', licence_number: '', issued_on: '', expires_on: '', notes: '' }) }} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
        <Field label="Type"><select value={credential.credential_type} onChange={(e) => setCredential({ ...credential, credential_type: e.target.value })} className="input">{credentialTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Issuing body"><input maxLength={160} value={credential.issuing_body} onChange={(e) => setCredential({ ...credential, issuing_body: e.target.value })} className="input" /></Field>
        <Field label="Registration no."><input maxLength={80} value={credential.registration_number} onChange={(e) => setCredential({ ...credential, registration_number: e.target.value })} className="input" /></Field>
        <Field label="Licence no."><input maxLength={80} value={credential.licence_number} onChange={(e) => setCredential({ ...credential, licence_number: e.target.value })} className="input" /></Field>
        <Field label="Issued"><input type="date" value={credential.issued_on} onChange={(e) => setCredential({ ...credential, issued_on: e.target.value })} className="input" /></Field>
        <Field label="Expires"><input type="date" value={credential.expires_on} onChange={(e) => setCredential({ ...credential, expires_on: e.target.value })} className="input" /></Field>
        <div className="sm:col-span-3 flex justify-end"><button disabled={busy} className={outline}>Add check</button></div>
      </form>}
    </div>
    <div className="rounded-xl border p-5"><h4 className="font-bold text-green-deep">Documents</h4><p className="mt-1 text-xs text-text-mid">Files are private and open through short-lived links. Health documents (medical fitness, immunisation) only after a conditional offer, with consent; deleted within 30 days if the candidate is not hired.</p>
      {!documents.length ? <p className="mt-3 text-sm text-text-mid">None yet.</p> : <ul className="mt-3 divide-y text-sm">{documents.map((doc) => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b className="text-green-deep">{doc.title}</b> · {labelOf(documentTypes, doc.document_type)}{doc.is_restricted && <> <Badge tone="red">Restricted</Badge></>}{doc.employee_id && <> <Badge tone="gray">On employee file</Badge></>}</span><span className="flex items-center gap-2">{doc.verified_at ? <Badge>Verified</Badge> : null}{!doc.employee_id && <button onClick={() => open(doc.id)} className={outline}>Open</button>}{!closed && !doc.employee_id && !doc.verified_at && doc.document_type !== 'cv' && <button disabled={busy} onClick={() => { const method = ask('How was the original checked?'); if (method) run(`${api}/checks`, 'PATCH', { document_id: doc.id, verification_method: method }) }} className={outline}>Verify</button>}{!closed && !doc.employee_id && <button disabled={busy} onClick={() => confirm('Delete this file permanently?') && run(`${api}/checks?document=${doc.id}`, 'DELETE')} className={danger}>×</button>}</span></li>)}</ul>}
      {!closed && <form onSubmit={async (e) => { e.preventDefault(); if (!upload.file) return; const data = new FormData(); data.set('application_id', appId); data.set('document_type', upload.document_type); data.set('title', upload.title); data.set('file', upload.file); if (await run(`${api}/checks`, 'POST', data)) { setUpload({ ...upload, title: '', file: null }); (e.target as HTMLFormElement).reset() } }} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
        <Field label="Type"><select value={upload.document_type} onChange={(e) => setUpload({ ...upload, document_type: e.target.value as DocumentType })} className="input">{documentTypes.filter((item) => hire || item.value === 'cv').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Title" hint="optional"><input maxLength={200} value={upload.title} onChange={(e) => setUpload({ ...upload, title: e.target.value })} className="input" /></Field>
        <Field label="File" hint="15 MB max"><input required type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] || null })} className="input" /></Field>
        <div className="sm:col-span-3 flex justify-end"><button disabled={busy || !upload.file} className={outline}>Upload</button></div>
      </form>}
    </div>
    {reference && <ReferenceModal reference={reference === 'new' ? null : reference} applicationId={appId} closed={!!closed} run={run} busy={busy} onClose={() => setReference(null)} />}
  </>
}

function ReferenceModal({ reference, applicationId, closed, run, busy, onClose }: { reference: HrReferenceCheck | null; applicationId: string; closed: boolean; run: Props['run']; busy: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ referee_name: reference?.referee_name || '', referee_relationship: reference?.referee_relationship || '', referee_organisation: reference?.referee_organisation || '', referee_contact: reference?.referee_contact || '', is_current_employer: reference?.is_current_employer || false, candidate_consent: !!reference?.candidate_consent_at, dates_confirmed: reference?.dates_confirmed ?? false, answers: { ...(reference?.answers || {}) } as Record<string, string>, outcome: reference?.outcome || '' })
  return <Modal title={reference ? reference.referee_name : 'New referee'} eyebrow="Reference check" onClose={onClose}>
    <form onSubmit={async (e) => { e.preventDefault(); const ok = reference ? await run(`${api}/references`, 'PATCH', { id: reference.id, ...form, outcome: form.outcome || null }) : await run(`${api}/references`, 'POST', { application_id: applicationId, ...form }); if (ok) onClose() }} className="space-y-3">
      <fieldset disabled={closed} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">
        <Field label="Referee name"><input required maxLength={160} value={form.referee_name} onChange={(e) => setForm({ ...form, referee_name: e.target.value })} className="input" /></Field>
        <Field label="Relationship"><input maxLength={160} placeholder="Line manager, clinical supervisor…" value={form.referee_relationship} onChange={(e) => setForm({ ...form, referee_relationship: e.target.value })} className="input" /></Field>
        <Field label="Organisation"><input maxLength={160} value={form.referee_organisation} onChange={(e) => setForm({ ...form, referee_organisation: e.target.value })} className="input" /></Field>
        <Field label="Contact"><input maxLength={254} value={form.referee_contact} onChange={(e) => setForm({ ...form, referee_contact: e.target.value })} className="input" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_current_employer} onChange={(e) => setForm({ ...form, is_current_employer: e.target.checked })} />Current employer (contact only with the candidate's permission)</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!!reference?.candidate_consent_at} checked={form.candidate_consent} onChange={(e) => setForm({ ...form, candidate_consent: e.target.checked })} />Candidate consented to this referee being contacted</label>
      {reference && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.dates_confirmed} onChange={(e) => setForm({ ...form, dates_confirmed: e.target.checked })} />Dates and role confirmed</label>
        {referenceQuestions.map((question) => <Field key={question.key} label={question.label}><textarea rows={2} maxLength={2000} value={form.answers[question.key] || ''} onChange={(e) => setForm({ ...form, answers: { ...form.answers, [question.key]: e.target.value } })} className="input" /></Field>)}
        <Field label="Outcome"><select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value as typeof form.outcome })} className="input"><option value="">Not checked</option>{referenceOutcomes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field></>}
      </fieldset>
      <div className="flex justify-between gap-3">{reference && !closed ? <button type="button" disabled={busy} onClick={async () => { if (confirm('Delete this reference?') && await run(`${api}/references?id=${reference.id}`, 'DELETE')) onClose() }} className={danger}>Delete</button> : <span />}{!closed && <button disabled={busy} className={primary}>Save</button>}</div>
    </form>
  </Modal>
}

function Offers({ detail, run, busy, closed }: Props) {
  const { application, offers } = detail; const live = offers.find((offer) => ['draft', 'pending_approval', 'approved', 'sent', 'accepted'].includes(offer.status))
  const canHire = ['accepted', 'pre_boarding'].includes(application.stage) && live?.status === 'accepted' && !application.employee_id
  return <>
    {application.employee_id && <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">Hired. The employee record exists on the People tab; credentials and documents moved to the employee file.</p>}
    {canHire && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-5"><p className="text-sm text-green-800"><b>Ready to hire.</b> Creates the employee record (pre-start until the start date), links this application, and moves credentials and documents to the employee file.</p><button disabled={busy} onClick={() => confirm('Complete the hire handover now?') && run(`${api}/applications`, 'PATCH', { id: application.id, action: 'hire' })} className={primary}>Complete hire</button></div>}
    {!live && !closed && application.decision === 'hire' && <div className="flex justify-end"><button disabled={busy} onClick={() => run(`${api}/offers`, 'POST', { application_id: application.id })} className={primary}>+ Draft offer</button></div>}
    {!live && application.decision !== 'hire' && <Empty>Offers are drafted after a hire decision at the debrief.</Empty>}
    {live && <OfferEditor key={`${live.id}-${live.updated_at}`} offer={live} run={run} busy={busy} closed={!!closed} />}
    {offers.filter((offer) => offer !== live).map((offer) => <p key={offer.id} className="rounded-xl border p-4 text-sm text-text-mid"><b className="text-green-deep">{labelOf(offerStatuses, offer.status)}</b> · {offer.job_title} · {formatNaira(offer.employment_type === 'Locum' ? offer.locum_session_rate_ngn : offer.gross_monthly_ngn)}{offer.decline_reason ? ` · ${offer.decline_reason}` : ''} · {showDate(offer.updated_at)}</p>)}
  </>
}

function OfferEditor({ offer, run, busy, closed }: { offer: Offer; run: Props['run']; busy: boolean; closed: boolean }) {
  const text = (value: string | number | null | undefined) => value === null || value === undefined ? '' : String(value)
  const [form, setForm] = useState({ job_title: offer.job_title, employment_type: offer.employment_type, band_code: text(offer.band_code), basic_ngn: text(offer.basic_ngn), housing_ngn: text(offer.housing_ngn), transport_ngn: text(offer.transport_ngn), other_allowances_ngn: text(offer.other_allowances_ngn), locum_session_rate_ngn: text(offer.locum_session_rate_ngn), commission_terms: text(offer.commission_terms), sign_on_bonus_ngn: text(offer.sign_on_bonus_ngn), above_midpoint_reason: text(offer.above_midpoint_reason), start_date: text(offer.start_date), probation_months: text(offer.probation_months), notice_terms: text(offer.notice_terms), contract_type: offer.contract_type, conditions: text(offer.conditions) })
  const [now] = useState(() => Date.now()); const editable = offer.status === 'draft' && !closed; const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  const action = (name: string, extra: Record<string, unknown> = {}) => run(`${api}/offers`, 'PATCH', { id: offer.id, action: name, ...extra })
  const withReason = (name: string, message: string) => { const reason = ask(message); if (reason) action(name, { reason }) }
  const missing = missingApprovals(offer.rules.roles, offer.approvals); const locum = form.employment_type === 'Locum'
  const gross = ['basic_ngn', 'housing_ngn', 'transport_ngn', 'other_allowances_ngn'].reduce((sum, key) => sum + (Number(form[key as keyof typeof form]) || 0), 0)
  return <div className="space-y-4 rounded-xl border p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold text-green-deep">Offer · <Badge tone={offer.status === 'accepted' ? 'green' : 'amber'}>{labelOf(offerStatuses, offer.status)}</Badge></h4><span className="text-xs text-text-mid">References {offer.references_clear ? 'clear' : 'not yet clear'} · credentials {offer.credentials_clear ? 'clear' : 'not yet clear'}</span></div>
    <div className="rounded-lg bg-[#fbfaf6] p-3 text-xs text-text-mid">{offer.band ? <>Band {offer.band.code} ({offer.band.label}{offer.band.confirmed ? '' : ', placeholder'}): {formatNaira(offer.band.min_ngn)} – {formatNaira(offer.band.midpoint_ngn)} – {formatNaira(offer.band.max_ngn)} {offer.band.pay_basis.replace('_', ' ')}.</> : 'No band matched.'} Approvals needed: {offer.rules.roles.map((role) => offerApprovalRoles.find((item) => item.value === role)?.label).join(' + ')}.{offer.rules.notes.map((note) => ` ${note}`)}{offer.rules.needsReason && ' Above the midpoint: a written reason is required.'}</div>
    <fieldset disabled={!editable} className="grid gap-3 sm:grid-cols-3">
      <Field label="Job title"><input required maxLength={160} value={form.job_title} onChange={set('job_title')} className="input" /></Field>
      <Field label="Employment type"><select value={form.employment_type} onChange={set('employment_type')} className="input">{hrEmploymentTypes.map((value) => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Band code"><input maxLength={20} value={form.band_code} onChange={set('band_code')} className="input" /></Field>
      {locum ? <Field label="Session rate (₦)"><input type="number" min="0" value={form.locum_session_rate_ngn} onChange={set('locum_session_rate_ngn')} className="input" /></Field> : <>
        <Field label="Basic (₦/month)"><input type="number" min="0" value={form.basic_ngn} onChange={set('basic_ngn')} className="input" /></Field>
        <Field label="Housing (₦/month)"><input type="number" min="0" value={form.housing_ngn} onChange={set('housing_ngn')} className="input" /></Field>
        <Field label="Transport (₦/month)"><input type="number" min="0" value={form.transport_ngn} onChange={set('transport_ngn')} className="input" /></Field>
        <Field label="Other allowances (₦/month)"><input type="number" min="0" value={form.other_allowances_ngn} onChange={set('other_allowances_ngn')} className="input" /></Field>
        <Field label="Gross monthly"><p className="input bg-gray-50">{formatNaira(gross)}</p></Field></>}
      <Field label="Sign-on bonus (₦)"><input type="number" min="0" value={form.sign_on_bonus_ngn} onChange={set('sign_on_bonus_ngn')} className="input" /></Field>
      <Field label="Start date"><input type="date" value={form.start_date} onChange={set('start_date')} className="input" /></Field>
      <Field label="Probation (months)"><input type="number" min="0" max="12" value={form.probation_months} onChange={set('probation_months')} className="input" /></Field>
      <Field label="Contract"><select value={form.contract_type} onChange={set('contract_type')} className="input"><option value="employment">Employment</option><option value="services_agreement">Services agreement (contractor, locum)</option></select></Field>
      <div className="sm:col-span-3 grid gap-3 sm:grid-cols-2">
        <Field label="Commission terms" hint="optional"><input maxLength={2000} value={form.commission_terms} onChange={set('commission_terms')} className="input" /></Field>
        <Field label="Notice terms"><input maxLength={1000} value={form.notice_terms} onChange={set('notice_terms')} className="input" /></Field>
        <Field label="Conditions" hint="licence current on start, satisfactory medical, confidentiality undertaking"><textarea rows={2} maxLength={3000} value={form.conditions} onChange={set('conditions')} className="input" /></Field>
        <Field label="Reason above midpoint" hint="experience, scarcity, competing offer"><textarea rows={2} maxLength={2000} value={form.above_midpoint_reason} onChange={set('above_midpoint_reason')} className="input" /></Field>
      </div>
    </fieldset>
    {offer.approvals.length > 0 && <ul className="text-xs text-text-mid">{offer.approvals.map((item) => <li key={item.role}>Approved as {offerApprovalRoles.find((role) => role.value === item.role)?.label} by {item.approver_email || 'admin'} · {showTime(item.approved_at)}</li>)}</ul>}
    {offer.sent_at && <p className="text-xs text-text-mid">Sent {showTime(offer.sent_at)} · response due {showTime(offer.response_due_at)}{offer.responded_at ? ` · answered ${showTime(offer.responded_at)}` : ''}</p>}
    {!closed && <div className="flex flex-wrap justify-end gap-2">
      {offer.status === 'draft' && <><button disabled={busy} onClick={() => action('save', form)} className={outline}>Save draft</button><button disabled={busy} onClick={async () => { if (await action('save', form)) await action('submit') }} className={primary}>Send for approval</button></>}
      {offer.status === 'pending_approval' && missing.map((role) => <button key={role} disabled={busy} onClick={() => confirm(`Approve this offer as ${offerApprovalRoles.find((item) => item.value === role)?.label}? Only approve in a capacity you hold.`) && action('approve', { role })} className={primary}>Approve as {offerApprovalRoles.find((item) => item.value === role)?.label}</button>)}
      {['pending_approval', 'approved'].includes(offer.status) && <button disabled={busy} onClick={() => withReason('return', 'What needs to change?')} className={outline}>Return to draft</button>}
      {offer.status === 'approved' && <button disabled={busy} onClick={() => confirm('Make the verbal call first. Record the written offer as sent now?') && action('send', { channel: 'email' })} className={primary}>Mark sent</button>}
      {offer.status === 'sent' && <><button disabled={busy} onClick={() => confirm('Record that the candidate accepted?') && action('accept')} className={primary}>Accepted</button><button disabled={busy} onClick={() => withReason('decline', 'Reason the candidate gave for declining:')} className={outline}>Declined</button>{offer.response_due_at && Date.parse(offer.response_due_at) < now && <button disabled={busy} onClick={() => action('expire')} className={outline}>Mark expired</button>}</>}
      {['draft', 'pending_approval', 'approved', 'sent'].includes(offer.status) && <button disabled={busy} onClick={() => withReason('withdraw', 'Why is FXMed withdrawing this offer?')} className={danger}>Withdraw</button>}
    </div>}
  </div>
}
