'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowSquareOutIcon, PaperPlaneTiltIcon, PlusIcon, PrinterIcon, SirenIcon } from '@phosphor-icons/react'
import { Alert, Empty, Field, Loading, Panel, fullName, label } from '@/components/admin/emr/ui'
import { Modal, schemeName, type CoverageState } from '@/components/admin/emr/Coverage'
import {
  authorizationStatuses, coverageNeedsVerification, openReferralStatuses, optionLabel, referralExpectedDays,
  referralLevels, referralStatuses, referralUrgencies, unsuccessfulReferralStatuses, addLagosDays,
} from '@/lib/coverage'
import { daysUntilDue, lagosDate } from '@/lib/follow-ups'
import { printType, reportPrintCss } from '@/lib/reportTheme'

const api = '/api/admin/emr/referrals'
const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })

type Row = Record<string, any>

const statusTone: Record<string, string> = {
  draft: 'bg-gray-100 text-text-mid', sent: 'bg-blue-50 text-blue-700', accepted: 'bg-blue-50 text-blue-700',
  attended: 'bg-emerald-50 text-emerald-700', completed: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700', cancelled: 'bg-gray-100 text-text-mid', lost_to_follow_up: 'bg-red-50 text-red-700',
}
const urgencyTone: Record<string, string> = { routine: 'bg-gray-100 text-text-mid', urgent: 'bg-amber-50 text-amber-800', emergency: 'bg-red-600 text-white' }

function isOverdue(referral: Row) {
  return ['sent', 'accepted'].includes(referral.status) && referral.expected_by && referral.expected_by < lagosDate()
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{children}</span>
}

// The team-wide view: referrals to chase, and how referrals are turning out.
export default function ReferralWorklist({ onPatient }: { onPatient: (id: string, tab?: string) => void }) {
  const [days, setDays] = useState(90)
  const [data, setData] = useState<{ open: Row[]; recent: Row[]; summary: Record<string, number | null> } | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const response = await fetch(`${api}?days=${days}`)
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setData(result); setError('') } else setError(result.error || 'Referrals could not be loaded.')
  }, [days])
  useEffect(() => { load() }, [load])

  const groups = useMemo(() => {
    const open = data?.open || []
    return [
      ['Overdue — patient not yet seen', open.filter(isOverdue)],
      ['Drafts not yet sent', open.filter(item => item.status === 'draft')],
      ['Awaiting attendance', open.filter(item => ['sent', 'accepted'].includes(item.status) && !isOverdue(item))],
      ['Attended — awaiting feedback', open.filter(item => item.status === 'attended')],
    ] as Array<[string, Row[]]>
  }, [data])
  const closed = (data?.recent || []).filter(item => !openReferralStatuses.includes(item.status) && item.status !== 'draft')
  const summary = data?.summary || {}

  return <div className="space-y-6">
    <Panel title="Referral outcomes" subtitle={`Referrals sent in the last ${days} days, for referral-completion reporting.`} action={<div className="flex gap-1 rounded-[14px] border border-green-deep/10 bg-white p-1">{[30, 90, 365].map(option => <button key={option} type="button" onClick={() => setDays(option)} className={`rounded-[10px] px-3 py-2 text-sm font-bold ${days === option ? 'bg-green-deep text-white' : 'text-text-mid hover:bg-green-deep/5'}`}>{option === 365 ? '12 months' : `${option} days`}</button>)}</div>}>
      {error && <Alert tone="error">{error}</Alert>}
      {!data ? <Loading /> : <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{([
        ['Sent', summary.sent, ''], ['Attended', summary.attended, ''], ['Completion rate', summary.completionRate === null || summary.completionRate === undefined ? '—' : `${summary.completionRate}%`, ''],
        ['Median days to attend', summary.medianDaysToAttend ?? '—', ''], ['Feedback received', summary.feedbackReceived, ''],
        ['Still open', summary.open, ''], ['Overdue', summary.overdue, summary.overdue ? 'text-red-700' : ''],
      ] as Array<[string, any, string]>).map(([text, value, tone]) => <div key={text} className="rounded-[14px] bg-[#FCFFF0] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-text-mid/60">{text}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value ?? 0}</p></div>)}</div>}
    </Panel>
    <Panel title="Referral worklist" subtitle="Referrals still in progress, most urgent first. Open a patient to send, update or print a referral.">
      {!data ? <Loading /> : <>
        {groups.filter(([, items]) => items.length).map(([title, items]) => <section key={title} className="mt-7">
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-green-mid">{title} · {items.length}</h4>
          <div className="mt-3 space-y-3">{items.map(item => <ReferralSummary key={item.id} referral={item} onPatient={onPatient} />)}</div>
        </section>)}
        {!data.open.length && <Empty text="No referrals in progress." />}
        {closed.length > 0 && <details className="mt-8"><summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-green-mid">Closed in the period · {closed.length}</summary><div className="mt-3 space-y-3">{closed.map(item => <ReferralSummary key={item.id} referral={item} onPatient={onPatient} />)}</div></details>}
      </>}
    </Panel>
  </div>
}

function ReferralSummary({ referral, onPatient }: { referral: Row; onPatient: (id: string, tab?: string) => void }) {
  const patient = referral.patient || {}
  const due = referral.expected_by && ['sent', 'accepted'].includes(referral.status) ? daysUntilDue(`${referral.expected_by}T09:00:00+01:00`) : null
  return <button type="button" onClick={() => onPatient(referral.patient_id, 'referrals')} className="flex w-full flex-wrap items-center gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left hover:border-green-mid">
    <div className="min-w-0 flex-1">
      <p><span className="text-xs font-bold text-green-mid">{patient.mrn}</span> <span className="font-bold">{fullName(patient)}</span></p>
      <p className="mt-1 text-sm font-semibold text-text-dark">{referral.receiving_facility}{referral.receiving_specialty ? ` · ${referral.receiving_specialty}` : ''}</p>
      <p className="mt-1 line-clamp-1 text-xs text-text-mid">{referral.reason}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {referral.urgency !== 'routine' && <Pill tone={urgencyTone[referral.urgency]}>{optionLabel(referralUrgencies, referral.urgency)}</Pill>}
      {due !== null && <Pill tone={due < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-text-mid'}>{due < 0 ? `${-due} day${due === -1 ? '' : 's'} overdue` : due === 0 ? 'Expected today' : `Expected in ${due} day${due === 1 ? '' : 's'}`}</Pill>}
      <Pill tone={statusTone[referral.status]}>{optionLabel(referralStatuses, referral.status)}</Pill>
      <ArrowSquareOutIcon size={18} className="text-green-mid" />
    </div>
  </button>
}

// One patient's referrals, for the patient record.
export function PatientReferrals({ patient, chart, coverage, onChanged }: { patient: Row; chart: Row; coverage: CoverageState; onChanged: () => void }) {
  const [referrals, setReferrals] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Row | 'new' | null>(null)
  const load = useCallback(async () => {
    const response = await fetch(`${api}?patientId=${patient.id}`)
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setReferrals(result.referrals || []); setError('') } else { setReferrals([]); setError(result.error || 'Referrals could not be loaded.') }
  }, [patient.id])
  useEffect(() => { load() }, [load])
  const refresh = async () => { await load(); onChanged() }

  return <Panel title="Referrals" subtitle="Patients sent on to secondary, tertiary or specialist care, followed until the receiving facility responds." action={<button onClick={() => setForm('new')} className="primary"><PlusIcon size={18} weight="bold" />New referral</button>}>
    {error && <Alert tone="error">{error}</Alert>}
    {!referrals ? <Loading /> : <div className="mt-6 space-y-4">
      {referrals.map(referral => <ReferralCard key={referral.id} referral={referral} patient={patient} coverage={coverage} onEdit={() => setForm(referral)} onChanged={refresh} />)}
      {!referrals.length && <Empty text="No referrals for this patient." />}
    </div>}
    {form && <ReferralForm patient={patient} chart={chart} coverage={coverage} referral={form === 'new' ? undefined : form} onClose={() => setForm(null)} onSaved={async () => { setForm(null); await refresh() }} />}
  </Panel>
}

type Action = 'send' | 'accepted' | 'attended' | 'completed' | 'close' | 'authorization'

function ReferralCard({ referral, patient, coverage, onEdit, onChanged }: { referral: Row; patient: Row; coverage: CoverageState; onEdit: () => void; onChanged: () => Promise<void> }) {
  const [action, setAction] = useState<Action | null>(null)
  const cover = (coverage.data?.coverage || []).find(item => item.id === referral.coverage_id)
  const open = openReferralStatuses.includes(referral.status)
  const timeline = ([['Sent', referral.sent_at], ['Accepted', referral.accepted_at], ['Attended', referral.attended_at], ['Feedback', referral.feedback_received_at], ['Closed', referral.closed_at]] as Array<[string, string | null]>).filter(([, at]) => at)

  return <article className={`rounded-[18px] border p-5 ${referral.urgency === 'emergency' ? 'border-red-200 bg-red-50/40' : 'border-green-deep/10 bg-[#FCFFF0]'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-green-mid">{referral.referral_number} · {optionLabel(referralLevels, referral.referral_level)}</p>
        <p className="mt-1 text-lg font-bold">{referral.receiving_facility}{referral.receiving_specialty ? ` · ${referral.receiving_specialty}` : ''}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-text-mid">{referral.reason}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {referral.urgency !== 'routine' && <Pill tone={urgencyTone[referral.urgency]}>{referral.urgency === 'emergency' && <SirenIcon size={14} weight="fill" />}{optionLabel(referralUrgencies, referral.urgency)}</Pill>}
        {isOverdue(referral) && <Pill tone="bg-red-50 text-red-700">Overdue</Pill>}
        <Pill tone={statusTone[referral.status]}>{optionLabel(referralStatuses, referral.status)}</Pill>
      </div>
    </div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <Item label="Provisional diagnosis" value={[referral.provisional_diagnosis, referral.icd10_code].filter(Boolean).join(' · ')} />
      <Item label="Cover" value={cover ? `${schemeName(cover)} · ${cover.enrollee_id}` : referral.coverage_id ? 'Coverage record' : 'Self-paying'} />
      <Item label="Authorisation" value={[optionLabel(authorizationStatuses, referral.authorization_status), referral.authorization_code].filter(Boolean).join(' · ')} />
      <Item label="Expected to be seen by" value={referral.expected_by && day.format(new Date(`${referral.expected_by}T00:00:00`))} />
    </dl>
    {timeline.length > 0 && <p className="mt-3 text-xs text-text-mid">{timeline.map(([text, at]) => `${text} ${day.format(new Date(at!))}`).join(' → ')}</p>}
    {referral.feedback && <p className="mt-3 rounded-[12px] bg-white p-3 text-sm"><span className="font-bold text-green-deep">Feedback from {referral.receiving_facility}:</span> <span className="whitespace-pre-wrap">{referral.feedback}</span></p>}
    {referral.closed_reason && <p className="mt-3 rounded-[12px] bg-white p-3 text-sm"><span className="font-bold text-red-700">Closed:</span> {referral.closed_reason}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      {referral.status === 'draft' && <button onClick={() => setAction('send')} className="primary"><PaperPlaneTiltIcon size={18} weight="duotone" />Send referral</button>}
      {referral.status === 'draft' && <button onClick={onEdit} className="secondary">Edit draft</button>}
      <button onClick={() => printReferralLetter(patient, referral, cover)} className="secondary"><PrinterIcon size={18} weight="duotone" />Print letter</button>
      {referral.status === 'sent' && <button onClick={() => setAction('accepted')} className="secondary">Facility accepted</button>}
      {['sent', 'accepted'].includes(referral.status) && <button onClick={() => setAction('attended')} className="secondary">Patient attended</button>}
      {open && <button onClick={() => setAction('completed')} className="secondary">Record feedback</button>}
      {(open || referral.status === 'draft') && referral.authorization_status !== 'not_required' && <button onClick={() => setAction('authorization')} className="secondary">Update authorisation</button>}
      {(open || referral.status === 'draft') && <button onClick={() => setAction('close')} className="secondary text-red-700">Close without attendance</button>}
    </div>
    {action && <UpdateForm action={action} referral={referral} patient={patient} coverage={coverage} onClose={() => setAction(null)} onSaved={async () => { setAction(null); await onChanged() }} />}
  </article>
}

function Item({ label: text, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-text-mid/55">{text}</dt><dd className="mt-1 font-semibold">{value || 'Not recorded'}</dd></div>
}

const actionTitles: Record<Action, string> = {
  send: 'Send referral', accepted: 'Facility accepted the referral', attended: 'Patient attended',
  completed: 'Record feedback from the facility', close: 'Close referral without attendance', authorization: 'Update authorisation',
}

function UpdateForm({ action, referral, patient, coverage, onClose, onSaved }: { action: Action; referral: Row; patient: Row; coverage: CoverageState; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Row>({
    expected_by: referral.expected_by || addLagosDays(referralExpectedDays[referral.urgency] ?? 14),
    receiving_contact: referral.receiving_contact || '', authorization_status: referral.authorization_status, authorization_code: referral.authorization_code || '',
    feedback: referral.feedback || '', closed_reason: '', close_status: 'lost_to_follow_up',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field: string) => (event: { target: { value: string } }) => setForm(current => ({ ...current, [field]: event.target.value }))
  const cover = (coverage.data?.coverage || []).find(item => item.id === referral.coverage_id)
  const unverified = action === 'send' && cover && coverageNeedsVerification(cover)

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const body: Row = { id: referral.id }
    if (action === 'send') Object.assign(body, { status: 'sent', expected_by: form.expected_by, receiving_contact: form.receiving_contact, authorization_status: form.authorization_status, authorization_code: form.authorization_code })
    if (action === 'accepted' || action === 'attended') Object.assign(body, { status: action, receiving_contact: form.receiving_contact })
    if (action === 'completed') Object.assign(body, { status: 'completed', feedback: form.feedback })
    if (action === 'close') Object.assign(body, { status: form.close_status, closed_reason: form.closed_reason })
    if (action === 'authorization') Object.assign(body, { authorization_status: form.authorization_status, authorization_code: form.authorization_code })
    const response = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setError(result.error || 'The referral could not be updated.'); return }
    if (result.warning) window.alert(result.warning)
    onSaved()
  }

  const closeOptions = referral.status === 'draft' ? ['cancelled'] : unsuccessfulReferralStatuses
  return <Modal eyebrow={`Referral ${referral.referral_number}`} title={actionTitles[action]} subtitle={`${fullName(patient)} · ${referral.receiving_facility}`} onClose={onClose}>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      {unverified && <div className="sm:col-span-2"><Alert tone="error">This patient’s {schemeName(cover)} eligibility has not been confirmed today. Record an eligibility check on the Coverage tab before referring under this cover.</Alert></div>}
      {action === 'send' && <>
        <p className="rounded-[14px] bg-[#FCFFF0] p-4 text-sm leading-6 text-text-mid sm:col-span-2">Sending fixes the referral letter. Print it for the patient, and a follow-up is added to confirm they were seen by the date below.</p>
        <Field label="Patient should be seen by" required><input className="input" type="date" required min={lagosDate()} value={form.expected_by} onChange={set('expected_by')} /></Field>
        <Field label="Contact at receiving facility"><input className="input" value={form.receiving_contact} onChange={set('receiving_contact')} placeholder="Name, unit or phone" /></Field>
      </>}
      {(action === 'send' || action === 'authorization') && <>
        <Field label="HMO / scheme authorisation" required><select className="input" required value={form.authorization_status} onChange={set('authorization_status')}>{authorizationStatuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Authorisation code" required={form.authorization_status === 'approved'}><input className="input font-mono" required={form.authorization_status === 'approved'} value={form.authorization_code} onChange={set('authorization_code')} /></Field>
      </>}
      {(action === 'accepted' || action === 'attended') && <Field label="Contact at receiving facility" wide><input className="input" value={form.receiving_contact} onChange={set('receiving_contact')} placeholder="Who confirmed, for the record" /></Field>}
      {action === 'completed' && <Field label="Feedback (counter-referral)" required wide><textarea className="input min-h-32" required value={form.feedback} onChange={set('feedback')} placeholder="Findings, treatment given and the plan the receiving facility sent back" /></Field>}
      {action === 'close' && <>
        <Field label="Outcome" required><select className="input" required value={form.close_status} onChange={set('close_status')}>{closeOptions.map(value => <option key={value} value={value}>{optionLabel(referralStatuses, value)}</option>)}</select></Field>
        <span className="hidden sm:block" />
        <Field label="Why" required wide><textarea className="input min-h-24" required value={form.closed_reason} onChange={set('closed_reason')} placeholder="For example: patient could not be reached after three attempts" /></Field>
      </>}
      {error && <div className="sm:col-span-2"><Alert tone="error">{error}</Alert></div>}
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onClose} className="secondary">Cancel</button><button disabled={saving} className={action === 'close' ? 'secondary text-red-700 disabled:opacity-50' : 'primary disabled:opacity-50'}>{saving ? 'Saving…' : actionTitles[action]}</button></div>
    </form>
  </Modal>
}

// A new referral starts from what the record already says, for the clinician
// to edit: the latest encounter, active diagnoses, medications and results.
function prefill(chart: Row) {
  const encounter = chart.encounters?.[0]
  const diagnoses = (chart.diagnoses || []).filter((item: Row) => item.status === 'active')
  const medications = (chart.medications || []).filter((item: Row) => item.status === 'active')
  const results = (chart.results || []).slice(0, 8)
  return {
    encounter_id: encounter?.id || '',
    clinical_summary: [encounter?.chief_complaint && `Presenting complaint: ${encounter.chief_complaint}`, encounter?.examination && `Examination: ${encounter.examination}`, encounter?.clinical_assessment && `Assessment: ${encounter.clinical_assessment}`].filter(Boolean).join('\n'),
    provisional_diagnosis: diagnoses.map((item: Row) => item.diagnosis_name).join('; '),
    icd10_code: diagnoses.map((item: Row) => item.icd10_code).filter(Boolean).join(', '),
    treatment_given: medications.map((item: Row) => [item.medication_name, item.strength, item.dose, item.frequency].filter(Boolean).join(' ')).join('\n'),
    investigations_summary: results.map((item: Row) => `${item.test_name}: ${item.result}${item.unit ? ` ${item.unit}` : ''}${item.abnormal_flag && item.abnormal_flag !== 'normal' ? ` (${item.abnormal_flag})` : ''}`).join('\n'),
  }
}

function ReferralForm({ patient, chart, coverage, referral, onClose, onSaved }: { patient: Row; chart: Row; coverage: CoverageState; referral?: Row; onClose: () => void; onSaved: () => void }) {
  const activeCover = (coverage.data?.coverage || []).filter(item => item.status === 'active')
  const [form, setForm] = useState<Row>(() => referral
    ? Object.fromEntries(Object.entries(referral).map(([key, value]) => [key, value ?? '']))
    : { referral_level: 'secondary', urgency: 'routine', receiving_facility: '', receiving_specialty: '', receiving_contact: '', reason: '', authorization_status: activeCover.length ? 'requested' : 'not_required', authorization_code: '', coverage_id: activeCover[0]?.id || '', ...prefill(chart) })
  const [saving, setSaving] = useState<'draft' | 'send' | null>(null)
  const [error, setError] = useState('')
  const set = (field: string) => (event: { target: { value: string } }) => setForm(current => ({ ...current, [field]: event.target.value }))
  const fields = ['encounter_id','coverage_id','referral_level','urgency','receiving_facility','receiving_specialty','receiving_contact','reason','clinical_summary','provisional_diagnosis','icd10_code','investigations_summary','treatment_given','authorization_status','authorization_code']

  async function save(send: boolean) {
    setSaving(send ? 'send' : 'draft'); setError('')
    const payload = Object.fromEntries(fields.map(field => [field, form[field]]))
    const response = referral
      ? await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: referral.id, ...payload, ...(send ? { status: 'sent' } : {}) }) })
      : await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: patient.id, ...payload, send }) })
    const result = await response.json().catch(() => ({}))
    setSaving(null)
    if (!response.ok) { setError(result.error || 'The referral could not be saved.'); return }
    if (result.warning) window.alert(result.warning)
    onSaved()
  }

  return <Modal eyebrow="Referral" title={referral ? `Edit draft ${referral.referral_number}` : 'New referral'} subtitle={`${patient.mrn} · ${fullName(patient)}`} onClose={onClose}>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); save(false) }} className="grid gap-5 sm:grid-cols-2">
      <Field label="Level of care" required><select className="input" required value={form.referral_level} onChange={set('referral_level')}>{referralLevels.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="Urgency" required><select className="input" required value={form.urgency} onChange={set('urgency')}>{referralUrgencies.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      {form.urgency === 'emergency' && <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 sm:col-span-2"><p className="flex items-center gap-2 font-bold"><SirenIcon size={18} weight="fill" />Emergency referral</p><p className="mt-1">Recording a referral does not arrange the transfer. Stabilise the patient, call the receiving facility before transfer, and arrange emergency transport (Lagos: 767 or 112). HMO authorisation is not needed before an emergency transfer; request it afterwards.</p></div>}
      <Field label="Receiving facility" required><input className="input" required value={form.receiving_facility} onChange={set('receiving_facility')} placeholder="An NHIA-accredited secondary or tertiary facility" /></Field>
      <Field label="Department or specialty"><input className="input" value={form.receiving_specialty} onChange={set('receiving_specialty')} placeholder="For example: Cardiology clinic" /></Field>
      <Field label="Reason for referral" required wide><textarea className="input min-h-20" required value={form.reason} onChange={set('reason')} placeholder="What you are asking the receiving clinician to do" /></Field>
      <Field label="Clinical summary" wide><textarea className="input min-h-28" value={form.clinical_summary} onChange={set('clinical_summary')} /></Field>
      <Field label="Provisional diagnosis"><input className="input" value={form.provisional_diagnosis} onChange={set('provisional_diagnosis')} /></Field>
      <Field label="ICD-10"><input className="input" value={form.icd10_code} onChange={set('icd10_code')} /></Field>
      <Field label="Investigations and results"><textarea className="input min-h-24" value={form.investigations_summary} onChange={set('investigations_summary')} /></Field>
      <Field label="Treatment given"><textarea className="input min-h-24" value={form.treatment_given} onChange={set('treatment_given')} /></Field>
      <Field label="Encounter"><select className="input" value={form.encounter_id} onChange={set('encounter_id')}><option value="">Not linked to an encounter</option>{(chart.encounters || []).map((item: Row) => <option key={item.id} value={item.id}>{item.encounter_number} · {day.format(new Date(item.created_at))}</option>)}</select></Field>
      <Field label="Referred under"><select className="input" value={form.coverage_id} onChange={set('coverage_id')}><option value="">Self-paying (no cover)</option>{activeCover.map(item => <option key={item.id} value={item.id}>{schemeName(item)} · {item.enrollee_id}</option>)}</select></Field>
      <Field label="HMO / scheme authorisation"><select className="input" value={form.authorization_status} onChange={set('authorization_status')}>{authorizationStatuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="Authorisation code"><input className="input font-mono" value={form.authorization_code} onChange={set('authorization_code')} /></Field>
      <p className="text-xs leading-5 text-text-mid sm:col-span-2">The summary, diagnosis, results and treatment were filled in from the record. Check every field before sending; once sent, the letter cannot be changed.</p>
      {error && <div className="sm:col-span-2"><Alert tone="error">{error}</Alert></div>}
      <div className="flex flex-wrap justify-end gap-3 sm:col-span-2"><button type="button" onClick={onClose} className="secondary">Cancel</button><button disabled={Boolean(saving)} className="secondary disabled:opacity-50">{saving === 'draft' ? 'Saving…' : 'Save draft'}</button><button type="button" disabled={Boolean(saving)} onClick={event => { const formElement = (event.currentTarget as HTMLButtonElement).form; if (formElement?.reportValidity()) save(true) }} className="primary disabled:opacity-50"><PaperPlaneTiltIcon size={18} weight="duotone" />{saving === 'send' ? 'Sending…' : 'Save and send'}</button></div>
    </form>
  </Modal>
}

function escapeHtml(value: unknown) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character)) }
const block = (value: unknown) => escapeHtml(value || 'Not recorded').replace(/\n/g, '<br>')

function printReferralLetter(patient: Row, referral: Row, cover?: Row) {
  const row = (name: string, value: unknown) => `<tr><th>${escapeHtml(name)}</th><td>${block(value)}</td></tr>`
  const section = (title: string, value: unknown) => `<h2>${escapeHtml(title)}</h2><p>${block(value)}</p>`
  const draft = referral.status === 'draft'
  const content = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(referral.referral_number)}</title><style>${reportPrintCss()}body{color:#1a3d2e}.head{border-bottom:3px solid #c9e265;padding-bottom:16px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end}h1{margin:0;font-size:${printType('title')}}h2{font-size:${printType('section')};margin:20px 0 6px}.meta{color:#52665b;font-size:${printType('subtitle')}}table{width:100%;border-collapse:collapse;margin-top:6px}th{text-align:left;width:32%;color:#52665b;font-weight:600;padding:5px 8px 5px 0;vertical-align:top}td{padding:5px 0;vertical-align:top}.urgent{display:inline-block;background:#b42318;color:#fff;border-radius:999px;padding:4px 12px;font-weight:700}.draft{color:#b42318;font-weight:700}.sign{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:28px}.line{border-top:1px solid #1a3d2e;padding-top:6px;font-size:${printType('footer')}}.slip{margin-top:40px;border-top:2px dashed #52665b;padding-top:16px;page-break-inside:avoid}.box{border:1px solid #d8e0db;border-radius:10px;min-height:110px;margin-top:8px}.foot{margin-top:28px;font-size:${printType('footer')};color:#52665b}</style></head><body>
<div class="head"><div><h1>Referral letter</h1><div class="meta">FXMed · Confidential clinical information</div></div><div class="meta">${escapeHtml(referral.referral_number)}<br>${escapeHtml(day.format(new Date(referral.sent_at || referral.created_at)))}${referral.urgency !== 'routine' ? `<br><span class="urgent">${escapeHtml(optionLabel(referralUrgencies, referral.urgency))}</span>` : ''}</div></div>
${draft ? '<p class="draft">DRAFT — not yet sent</p>' : ''}
<table>${row('To', [referral.receiving_specialty, referral.receiving_facility].filter(Boolean).join(', '))}${row('Level of care', optionLabel(referralLevels, referral.referral_level))}${row('Patient', `${fullName(patient)} (${patient.mrn})`)}${row('Date of birth / sex', `${patient.date_of_birth ? day.format(new Date(`${patient.date_of_birth}T00:00:00`)) : 'Not recorded'} · ${label(patient.sex)}`)}${row('Phone', patient.phone)}${row('Insurance', cover ? `${schemeName(cover)} · Enrollee ${cover.enrollee_id}${cover.hmo_name ? ` · ${cover.hmo_name}` : ''}` : 'Self-paying')}${row('Authorisation', [optionLabel(authorizationStatuses, referral.authorization_status), referral.authorization_code].filter(Boolean).join(' · '))}</table>
${section('Reason for referral', referral.reason)}${section('Clinical summary', referral.clinical_summary)}${section('Provisional diagnosis', [referral.provisional_diagnosis, referral.icd10_code && `ICD-10 ${referral.icd10_code}`].filter(Boolean).join(' · '))}${section('Investigations and results', referral.investigations_summary)}${section('Treatment given', referral.treatment_given)}
<div class="sign"><div class="line">Referring clinician (name, signature, folio / MDCN number)</div><div class="line">Date</div></div>
<div class="slip"><h2>Feedback to the referring facility (counter-referral)</h2><div class="meta">Please return to FXMed with the patient or by email. Referral ${escapeHtml(referral.referral_number)} · ${escapeHtml(fullName(patient))}</div><div class="box"></div><div class="sign"><div class="line">Attending clinician and facility</div><div class="line">Date seen</div></div></div>
<div class="foot">Generated from the FXMed clinical workspace.</div><script>window.onload=()=>window.print()</script></body></html>`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/html' }))
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
