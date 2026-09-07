'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIcon, AddressBookIcon, ArrowLeftIcon, CalendarCheckIcon, CaretLeftIcon, CaretRightIcon,
  CheckCircleIcon, ClipboardTextIcon, ClockIcon, FileArrowUpIcon, FileTextIcon, FirstAidKitIcon,
  FlaskIcon, HeartbeatIcon, MagnifyingGlassIcon, NotePencilIcon, PillIcon, PlusIcon, PulseIcon,
  PrinterIcon, ImageSquareIcon, ListChecksIcon, PencilSimpleIcon, StethoscopeIcon, UserCirclePlusIcon,
  UsersThreeIcon, WarningCircleIcon, XIcon,
} from '@phosphor-icons/react'
import FunctionalHealthAnalysis from '@/components/admin/FunctionalHealthAnalysis'
import AdminTools from '@/components/admin/AdminTools'
import { REPORT_ACCENT, REPORT_INK, REPORT_LEADING, printType, reportPrintCss } from '@/lib/reportTheme'

type EmrView = 'dashboard' | 'health_analysis' | 'patients' | 'appointments' | 'encounters' | 'records' | 'investigations' | 'medications' | 'care_plans' | 'documents'
type Patient = Record<string, any>
type Chart = Record<string, any>

const api = '/api/admin/emr'
const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const nav: Array<{ id: EmrView; label: string; Icon: typeof ActivityIcon }> = [
  { id: 'dashboard', label: 'EMR Dashboard', Icon: ActivityIcon },
  { id: 'health_analysis', label: 'Health Analysis', Icon: FirstAidKitIcon },
  { id: 'patients', label: 'Patients', Icon: UsersThreeIcon },
  { id: 'appointments', label: 'Appointments', Icon: CalendarCheckIcon },
  { id: 'encounters', label: 'Encounters', Icon: StethoscopeIcon },
  { id: 'records', label: 'Clinical Records', Icon: ClipboardTextIcon },
  { id: 'investigations', label: 'Investigations', Icon: FlaskIcon },
  { id: 'medications', label: 'Medications', Icon: PillIcon },
  { id: 'care_plans', label: 'Care Plans', Icon: HeartbeatIcon },
  { id: 'documents', label: 'Documents', Icon: FileTextIcon },
]

export default function EmrWorkspace() {
  const [view, setView] = useState<EmrView>('dashboard')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [error, setError] = useState('')

  const loadPatientOptions = useCallback(async () => {
    const response = await fetch(`${api}?resource=patients&pageSize=100`)
    if (response.ok) setPatients((await response.json()).patients || [])
  }, [])

  useEffect(() => { loadPatientOptions() }, [loadPatientOptions])

  function openPatient(id: string) { setSelectedPatientId(id); setView('patients') }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-green-deep p-6 text-white shadow-[0_18px_50px_rgba(26,61,46,0.16)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div><span className="inline-flex rounded-full bg-gold px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-green-deep">Healthcare / EMR</span><h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Clinical workspace</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Longitudinal patient records, encounters, clinical documentation, investigations and care delivery.</p></div>
          <button type="button" onClick={() => { setSelectedPatientId(null); setView('patients') }} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-green-deep transition hover:-translate-y-0.5"><UserCirclePlusIcon size={20} weight="fill" />Register patient</button>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-[20px] border border-green-deep/10 bg-white p-2 shadow-[0_8px_30px_rgba(26,61,46,0.05)]" aria-label="Healthcare navigation">
        {nav.map((item) => <button key={item.id} type="button" onClick={() => { setView(item.id); if (item.id !== 'patients') setSelectedPatientId(null) }} className={`flex shrink-0 items-center gap-2 rounded-[14px] px-4 py-3 text-sm font-bold transition ${view === item.id ? 'bg-green-deep text-white shadow-md' : 'text-text-mid hover:bg-green-deep/5 hover:text-green-deep'}`}><item.Icon size={20} weight={view === item.id ? 'fill' : 'duotone'} className={view === item.id ? 'text-gold' : 'text-green-mid'} />{item.label}</button>)}
      </nav>

      {error && <Alert tone="error">{error}</Alert>}
      {view === 'dashboard' && <Dashboard onNavigate={setView} onPatient={openPatient} />}
      {view === 'health_analysis' && <FunctionalHealthAnalysis />}
      {view === 'patients' && (selectedPatientId ? <PatientChart patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} onChanged={loadPatientOptions} /> : <PatientRegistry onPatient={openPatient} onChanged={loadPatientOptions} />)}
      {view === 'appointments' && <Appointments patients={patients} onPatient={openPatient} onError={setError} />}
      {view === 'encounters' && <ResourceWorkspace title="Encounters" description="Active and completed clinical consultations." resource="encounters" patients={patients} createType="encounter" onPatient={openPatient} />}
      {view === 'records' && <ClinicalRecords patients={patients} onPatient={openPatient} />}
      {view === 'investigations' && <div className="space-y-6"><AdminTools scope="investigations" /><div className="grid gap-6 xl:grid-cols-2"><ResourceWorkspace title="Investigation orders" description="Laboratory and diagnostic orders, collection progress and results." resource="investigations" patients={patients} createType="investigation" onPatient={openPatient} /><ResourceWorkspace title="Imaging records" description="Imaging requests, performed studies and clinical reports." resource="imaging" patients={patients} createType="imaging" onPatient={openPatient} /><div className="xl:col-span-2"><LegacyReports patients={patients} onPatient={openPatient} /></div></div></div>}
      {view === 'medications' && <ResourceWorkspace title="Medications & prescriptions" description="Current and historical medication records." resource="medications" patients={patients} createType="medication" onPatient={openPatient} />}
      {view === 'care_plans' && <ResourceWorkspace title="Care plans" description="Goals and coordinated follow-up plans." resource="care_plans" patients={patients} createType="care_plan" onPatient={openPatient} />}
      {view === 'documents' && <DocumentsWorkspace patients={patients} onPatient={openPatient} />}
    </div>
  )
}

function Dashboard({ onNavigate, onPatient }: { onNavigate: (view: EmrView) => void; onPatient: (id: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  useEffect(() => { fetch(`${api}?resource=dashboard`).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result) }).catch(error => setError(error.message)) }, [])
  if (error) return <Alert tone="error">{error}</Alert>
  if (!data) return <Loading />
  const metrics = [
    ['Appointments today', data.metrics.appointmentsToday, CalendarCheckIcon, 'bg-[#EAF2FE] text-[#3374A8]'],
    ['Patients scheduled', data.metrics.patientsScheduled, UsersThreeIcon, 'bg-[#E5E4FF] text-[#76508C]'],
    ['Active encounters', data.metrics.activeEncounters, PulseIcon, 'bg-[#FFEAE3] text-[#C7654C]'],
    ['Completed today', data.metrics.completedEncounters, CheckCircleIcon, 'bg-[#EAF7EE] text-[#2D6A4F]'],
    ['Waiting patients', data.metrics.waitingPatients, ClockIcon, 'bg-[#FFF4D6] text-[#A36A00]'],
  ]
  const tasks = [
    ['Pending investigations', data.metrics.pendingResults, 'investigations' as EmrView],
    ['Results requiring review', data.metrics.resultsToReview, 'investigations' as EmrView],
    ['Incomplete clinical notes', data.metrics.incompleteNotes, 'records' as EmrView],
    ['Follow-ups due', data.metrics.followUpsDue, 'care_plans' as EmrView],
    ['Pending clinical tasks', data.metrics.pendingTasks, 'care_plans' as EmrView],
  ]
  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, Icon, tone]: any) => <StatCard key={label} label={label} value={value} Icon={Icon} tone={tone} />)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel title="Today's clinical activity" subtitle="Appointments and encounter flow for today."><div className="mt-5 space-y-3">{data.appointments.length ? data.appointments.map((item: any) => <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-[15px] border border-green-deep/10 bg-[#FCFFF0] p-4"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-green-deep text-gold"><CalendarCheckIcon size={21} weight="fill" /></span><div className="min-w-0 flex-1"><p className="font-bold">{item.first_name} {item.last_name}</p><p className="mt-1 text-xs text-text-mid">{formatTime(item.preferred_time)} · {label(item.consultation_type)}</p></div><Status value={item.status} /></div>) : <Empty text="No appointments scheduled today." />}</div></Panel>
      <Panel title="Clinical tasks" subtitle="Items needing team attention."><div className="mt-5 space-y-2">{tasks.map(([title, count, target]) => <button key={title} onClick={() => onNavigate(target)} className="flex w-full items-center justify-between rounded-[14px] border border-green-deep/10 px-4 py-3 text-left transition hover:bg-[#FCFFF0]"><span className="text-sm font-semibold text-text-mid">{title}</span><span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-gold px-2 text-xs font-bold">{count}</span></button>)}</div></Panel>
    </section>
    <section className="grid gap-6 xl:grid-cols-3"><PatientActivity title="New patients" items={data.newPatients} onPatient={onPatient} field="created_at" /><PatientActivity title="Recently seen" items={data.recentlySeen.map((item: any) => ({ ...item.patient, seen_at: item.created_at })).filter((item: any) => item?.id)} onPatient={onPatient} field="seen_at" /><PatientActivity title="Recently updated" items={data.recentPatients} onPatient={onPatient} field="updated_at" /></section>
    <Panel title="Quick actions" subtitle="Start common clinical workflows."><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => onNavigate('patients')} className="primary"><UserCirclePlusIcon />Register or find patient</button><button onClick={() => onNavigate('encounters')} className="secondary"><StethoscopeIcon />Start encounter</button><button onClick={() => onNavigate('records')} className="secondary"><PulseIcon />Vitals or note</button><button onClick={() => onNavigate('investigations')} className="secondary"><FlaskIcon />Order investigation</button><button onClick={() => onNavigate('medications')} className="secondary"><PillIcon />Create prescription</button></div></Panel>
  </div>
}

function PatientRegistry({ onPatient, onChanged }: { onPatient: (id: string) => void; onChanged: () => void }) {
  const [section, setSection] = useState<'registry' | 'requests'>('registry')
  const [patients, setPatients] = useState<Patient[]>([]), [search, setSearch] = useState(''), [status, setStatus] = useState('active'), [sort, setSort] = useState('updated_at'), [direction, setDirection] = useState('desc')
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [showForm, setShowForm] = useState(false), [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); const params = new URLSearchParams({ resource: 'patients', page: String(page), pageSize: '20', status, sort, direction }); if (search.trim()) params.set('search', search.trim()); const response = await fetch(`${api}?${params}`); const result = await response.json(); if (response.ok) { setPatients(result.patients); setTotal(result.total) } else setError(result.error); setLoading(false) }, [page, search, status, sort, direction])
  useEffect(() => { const timer = setTimeout(load, search ? 300 : 0); return () => clearTimeout(timer) }, [load, search])
  return <div className="space-y-5"><div className="flex gap-2 rounded-[18px] border border-green-deep/10 bg-white p-2"><button onClick={() => setSection('registry')} className={`rounded-[12px] px-4 py-2.5 text-sm font-bold ${section === 'registry' ? 'bg-green-deep text-white' : 'text-text-mid'}`}>Patient registry</button><button onClick={() => setSection('requests')} className={`rounded-[12px] px-4 py-2.5 text-sm font-bold ${section === 'requests' ? 'bg-green-deep text-white' : 'text-text-mid'}`}>Registration requests</button></div>
  {section === 'requests' ? <RegistrationRequests onPatient={onPatient} onChanged={() => { load(); onChanged() }} /> : <Panel title="Patient registry" subtitle="Search and manage canonical clinical patient records." action={<button onClick={() => setShowForm(true)} className="primary"><PlusIcon size={18} weight="bold" />Register patient</button>}>
    <div className="mt-6 flex flex-wrap gap-3"><div className="relative min-w-64 flex-1"><MagnifyingGlassIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-mid" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search MRN, name, email or phone…" className="input pl-11" /></div><select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input w-auto"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="deceased">Deceased</option></select><select value={sort} onChange={e => setSort(e.target.value)} className="input w-auto"><option value="updated_at">Recently updated</option><option value="created_at">Recently registered</option><option value="last_name">Last name</option><option value="mrn">MRN</option><option value="date_of_birth">Date of birth</option></select><button onClick={() => setDirection(value => value === 'asc' ? 'desc' : 'asc')} className="secondary">{direction === 'asc' ? 'Ascending' : 'Descending'}</button></div>
    {error && <Alert tone="error">{error}</Alert>}
    {loading ? <Loading /> : <div className="mt-6 overflow-x-auto rounded-[16px] border border-green-deep/10"><table className="w-full min-w-[940px] text-left text-sm"><thead><tr className="bg-[#FCFFF0] text-[11px] uppercase tracking-wide text-green-deep/55"><th className="p-4">MRN</th><th className="p-4">Patient</th><th className="p-4">Date of birth</th><th className="p-4">Sex</th><th className="p-4">Contact</th><th className="p-4">Last encounter</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead><tbody>{patients.map(patient => <tr key={patient.id} onClick={() => onPatient(patient.id)} className="cursor-pointer border-t border-green-deep/[0.07] hover:bg-green-50/30"><td className="p-4 font-bold text-green-mid">{patient.mrn}</td><td className="p-4 font-bold">{fullName(patient)}</td><td className="p-4 text-text-mid">{date.format(new Date(`${patient.date_of_birth}T00:00:00`))}<span className="ml-1 text-xs">({formatPatientAge(patient.date_of_birth)})</span></td><td className="p-4 text-text-mid">{label(patient.sex)}</td><td className="p-4"><p>{patient.phone || '—'}</p><p className="text-xs text-text-mid">{patient.email || '—'}</p></td><td className="p-4 text-text-mid">{patient.encounters?.length ? date.format(new Date([...patient.encounters].sort((a:any,b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at)) : '—'}</td><td className="p-4"><Status value={patient.status} /></td><td className="p-4 text-right"><button onClick={e => { e.stopPropagation(); onPatient(patient.id) }} className="secondary">Open chart</button></td></tr>)}</tbody></table>{!patients.length && <Empty text="No patients match your search." />}</div>}
    <div className="mt-5 flex items-center justify-between text-sm text-text-mid"><span>{total} patient{total === 1 ? '' : 's'}</span><div className="flex gap-2"><button className="icon-button" disabled={page === 1} onClick={() => setPage(p => p - 1)}><CaretLeftIcon /></button><span className="flex items-center px-3 font-bold">Page {page}</span><button className="icon-button" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}><CaretRightIcon /></button></div></div>
    {showForm && <ClinicalModal type="patient" patients={[]} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); onChanged() }} />}
  </Panel>}</div>
}

function RegistrationRequests({ onPatient, onChanged }: { onPatient: (id: string) => void; onChanged: () => void }) {
  const [status, setStatus] = useState('pending')
  const [registrations, setRegistrations] = useState<any[]>([])
  const [links, setLinks] = useState<Record<string,string>>({})
  const [notes, setNotes] = useState<Record<string,string>>({})
  const [demographics, setDemographics] = useState<Record<string,{ date_of_birth: string; sex: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); setError(''); const response = await fetch(`${api}/registration-requests?status=${status}`); const result = await response.json().catch(() => ({})); if (response.ok) setRegistrations(result.registrations || []); else setError(result.error || 'Unable to load registration requests.'); setLoading(false) }, [status])
  useEffect(() => { load() }, [load])

  async function review(registration: any, action: 'approve' | 'link' | 'reject' | 'request_correction') {
    if (action === 'approve' && registration.duplicateCandidates?.length && !window.confirm('Possible existing patient records were found. Create a separate patient anyway?')) return
    if (action === 'link' && !links[registration.id]) { setError('Select an existing patient before linking.'); return }
    if ((action === 'reject' || action === 'request_correction') && !notes[registration.id]?.trim()) { setError('Add a review note before rejecting or requesting a correction.'); return }
    setSaving(registration.id); setError('')
    const response = await fetch(`${api}/registration-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: registration.id, action, patient_id: links[registration.id], review_notes: notes[registration.id] }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.error || 'Unable to review registration.')
    else { await load(); onChanged(); if (result.patientId && (action === 'approve' || action === 'link')) onPatient(result.patientId) }
    setSaving(null)
  }

  async function completeDemographics(registration: any) {
    const values = demographics[registration.id] || { date_of_birth: registration.date_of_birth || '', sex: registration.sex || '' }
    if (!values.date_of_birth || !values.sex) { setError('Enter the patient’s date of birth and sex before saving.'); return }
    setSaving(registration.id); setError('')
    const response = await fetch(`${api}/registration-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: registration.id, action: 'update_demographics', ...values }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.error || 'Unable to update demographics.')
    else await load()
    setSaving(null)
  }

  return <Panel title="Patient registration requests" subtitle="Review public submissions before creating or linking an official EMR patient record." action={<select className="input w-auto" value={status} onChange={event => setStatus(event.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="linked">Linked</option><option value="correction_requested">Correction requested</option><option value="rejected">Rejected</option></select>}>
    {error && <Alert tone="error">{error}</Alert>}
    {loading ? <Loading /> : <div className="mt-6 space-y-4">{registrations.map(registration => {
      const active = ['pending','correction_requested'].includes(registration.status)
      const incomplete = !registration.date_of_birth || !registration.sex
      const demographicValues = demographics[registration.id] || { date_of_birth: registration.date_of_birth || '', sex: registration.sex || '' }
      return <article key={registration.id} className="rounded-[18px] border border-green-deep/10 bg-[#FCFFF0] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{registration.source === 'appointment_booking' ? 'Appointment booking' : 'Registration form'} · Submitted {dateTime.format(new Date(registration.submitted_at))}</p><h4 className="mt-2 text-xl font-bold">{registration.first_name} {registration.middle_name || ''} {registration.last_name}</h4><p className="mt-1 text-sm text-text-mid">{registration.date_of_birth ? date.format(new Date(`${registration.date_of_birth}T00:00:00`)) : 'Date of birth missing'} · {registration.sex ? label(registration.sex) : 'Sex missing'} · {registration.phone}{registration.email ? ` · ${registration.email}` : ''}</p></div><Status value={registration.status} /></div><dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Address" value={[registration.address,registration.city,registration.state,registration.country].filter(Boolean).join(', ')} /><Detail label="Occupation" value={registration.occupation} /><Detail label="Marital status" value={registration.marital_status && label(registration.marital_status)} /><Detail label="Emergency contact" value={[registration.emergency_contact_name,registration.emergency_contact_phone,registration.emergency_contact_relationship].filter(Boolean).join(' · ')} /></dl>
        {active && incomplete && <div className="mt-5 rounded-[14px] border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">Complete missing demographics</p><p className="mt-1 text-xs text-amber-700">This historical booking cannot be approved into the EMR until these required details are confirmed.</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input className="input" type="date" aria-label="Date of birth" max={toDateInput(new Date())} value={demographicValues.date_of_birth} onChange={event => setDemographics(current => ({ ...current, [registration.id]: { ...demographicValues, date_of_birth: event.target.value } }))} /><select className="input" aria-label="Sex" value={demographicValues.sex} onChange={event => setDemographics(current => ({ ...current, [registration.id]: { ...demographicValues, sex: event.target.value } }))}><option value="">Select sex…</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option><option value="unknown">Unknown</option></select><button type="button" disabled={saving === registration.id} onClick={() => completeDemographics(registration)} className="secondary">Save details</button></div></div>}
        {registration.duplicateCandidates?.length ? <div className="mt-5 rounded-[14px] border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">Possible existing patient found</p><div className="mt-3 flex flex-wrap gap-2">{registration.duplicateCandidates.map((patient: any) => <button key={patient.id} onClick={() => onPatient(patient.id)} className="secondary">{patient.mrn} · {patient.first_name} {patient.last_name}</button>)}</div>{active && <div className="mt-3 flex gap-2"><select className="input max-w-md" value={links[registration.id] || ''} onChange={event => setLinks(current => ({ ...current, [registration.id]: event.target.value }))}><option value="">Select matching patient…</option>{registration.duplicateCandidates.map((patient: any) => <option key={patient.id} value={patient.id}>{patient.mrn} · {patient.first_name} {patient.last_name}</option>)}</select><button disabled={saving === registration.id} onClick={() => review(registration, 'link')} className="secondary">Link existing patient</button></div>}</div> : null}
        {registration.review_notes && <div className="mt-4 rounded-[14px] bg-white p-4 text-sm text-text-mid"><span className="font-bold text-green-deep">Review note:</span> {registration.review_notes}</div>}
        {active && <><textarea className="input mt-5 min-h-20" value={notes[registration.id] || ''} onChange={event => setNotes(current => ({ ...current, [registration.id]: event.target.value }))} placeholder="Review note (required for rejection or correction request)" /><div className="mt-4 flex flex-wrap gap-2"><button disabled={saving === registration.id || incomplete} title={incomplete ? 'Complete missing demographics first' : undefined} onClick={() => review(registration, 'approve')} className="primary disabled:opacity-40">{saving === registration.id ? 'Saving…' : 'Approve and create EMR patient'}</button><button disabled={saving === registration.id} onClick={() => review(registration, 'request_correction')} className="secondary">Request correction</button><button disabled={saving === registration.id} onClick={() => review(registration, 'reject')} className="secondary text-red-700">Reject</button></div></>}
      </article>
    })}{!registrations.length && <Empty text={`No ${label(status).toLowerCase()} registration requests.`} />}</div>}
  </Panel>
}

function PatientChart({ patientId, onBack, onChanged }: { patientId: string; onBack: () => void; onChanged: () => void }) {
  const [chart, setChart] = useState<Chart | null>(null), [tab, setTab] = useState('overview'), [modal, setModal] = useState<string | null>(null), [error, setError] = useState('')
  const load = useCallback(async () => { const response = await fetch(`${api}?resource=patient&patientId=${patientId}`); const result = await response.json(); if (response.ok) setChart(result); else setError(result.error) }, [patientId])
  useEffect(() => { load() }, [load])
  if (error) return <Alert tone="error">{error}</Alert>
  if (!chart) return <Loading />
  const patient = chart.patient
  const tabs = ['overview','timeline','encounters','notes','diagnoses','medications','investigations','financial','documents','care_plans']
  const actions = [
    ['encounter','Start encounter',StethoscopeIcon], ['vitals','Record vitals',PulseIcon], ['note','Clinical note',NotePencilIcon], ['diagnosis','Diagnosis',FirstAidKitIcon],
    ['patient','Edit demographics',PencilSimpleIcon], ['allergy','Allergy',WarningCircleIcon], ['medication','Prescription',PillIcon], ['investigation','Order test',FlaskIcon], ['imaging','Imaging',ImageSquareIcon],
    ['care_plan','Care plan',HeartbeatIcon], ['task','Follow-up task',ListChecksIcon], ['financial_record','Bill',FileTextIcon], ['document','Document',FileArrowUpIcon],
  ] as const
  return <div className="space-y-6">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-green-mid hover:text-green-deep"><ArrowLeftIcon size={18} />Back to patient registry</button>
    <section className="overflow-hidden rounded-[26px] border border-green-deep/10 bg-white shadow-[0_10px_40px_rgba(26,61,46,0.07)]">
      <div className="bg-green-deep p-6 text-white sm:p-8"><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">{patient.mrn}</p><h2 className="mt-2 text-3xl font-bold">{fullName(patient)}</h2><p className="mt-2 text-sm text-white/65">{formatPatientAge(patient.date_of_birth)} · {label(patient.sex)} · {patient.phone || 'No phone'}</p></div><div className="flex flex-col items-end gap-3"><Status value={patient.status} /><div className="flex flex-wrap justify-end gap-2"><button onClick={() => setModal('financial_report')} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"><FileTextIcon size={18} weight="duotone" />Financial report</button><button onClick={() => setModal('report')} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-green-deep transition-colors hover:bg-gold-light"><FileTextIcon size={18} weight="duotone" />Generate patient report</button></div></div></div></div>
      <div className="grid gap-4 p-5 md:grid-cols-3 sm:p-7"><SummaryAlert title="Allergies" warning items={chart.allergies.filter((x: any) => x.status === 'active').map((x: any) => `${x.allergen}${x.reaction ? ` — ${x.reaction}` : ''}`)} empty="No known allergies" /><SummaryAlert title="Active conditions" items={chart.diagnoses.filter((x: any) => x.status === 'active').map((x: any) => x.diagnosis_name)} empty="No active diagnoses" /><SummaryAlert title="Current medications" items={chart.medications.filter((x: any) => x.status === 'active').map((x: any) => `${x.medication_name} ${x.strength || ''}`.trim())} empty="No active medications" /></div>
    </section>
    <section className="flex gap-2 overflow-x-auto rounded-[18px] border border-green-deep/10 bg-white p-2">{tabs.map(item => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-[12px] px-4 py-2.5 text-sm font-bold ${tab === item ? 'bg-green-deep text-white' : 'text-text-mid hover:bg-green-deep/5'}`}>{label(item)}</button>)}</section>
    <section className="flex gap-2 overflow-x-auto pb-1">{actions.map(([type,title,Icon]) => <button key={type} onClick={() => setModal(type)} className="secondary shrink-0"><Icon size={18} weight="duotone" />{title}</button>)}</section>
    {tab === 'overview' && <PatientOverview chart={chart} />}
    {tab === 'timeline' && <Timeline chart={chart} />}
    {tab === 'encounters' && <RecordList records={chart.encounters} kind="encounter" patient={patient} chart={chart} onUpdate={load} />}
    {tab === 'notes' && <div className="space-y-6"><RecordList records={chart.encounters} kind="encounter" patient={patient} chart={chart} onUpdate={load} /><RecordList records={chart.notes} kind="note" patient={patient} chart={chart} onUpdate={load} /></div>}
    {tab === 'diagnoses' && <div className="grid gap-6 xl:grid-cols-2"><RecordList records={chart.diagnoses} kind="diagnosis" onUpdate={load} /><RecordList records={chart.allergies} kind="allergy" onUpdate={load} /></div>}
    {tab === 'medications' && <RecordList records={chart.medications} kind="medication" patient={patient} chart={chart} prescriptions={chart.prescriptions} onUpdate={load} />}
    {tab === 'investigations' && <div className="space-y-6"><AdminTools scope="investigations" patientContext={patient} /><div className="grid gap-6 xl:grid-cols-2"><RecordList records={chart.investigations} kind="investigation" onUpdate={load} onCreateResult={record => setModal(`result:${record.id}`)} /><RecordList records={chart.results} kind="result" onUpdate={load} /><RecordList records={chart.imaging} kind="imaging" onUpdate={load} /><div className="xl:col-span-2"><InvestigationAttachments chart={chart} /></div></div></div>}
    {tab === 'financial' && <FinancialRecords chart={chart} onUpdate={load} onAdd={() => setModal('financial_record')} />}
    {tab === 'documents' && <PatientDocuments chart={chart} onChanged={load} />}
    {tab === 'care_plans' && <div className="grid gap-6 xl:grid-cols-2"><CarePlanList chart={chart} patient={patient} onUpdate={load} /><RecordList records={chart.tasks} kind="task" onUpdate={load} /></div>}
    {modal === 'report' && <PatientReportModal patient={patient} mode="clinical" onClose={() => setModal(null)} />}
    {modal === 'financial_report' && <PatientReportModal patient={patient} mode="financial" onClose={() => setModal(null)} />}
    {modal && !['report','financial_report'].includes(modal) && <ClinicalModal type={modal.split(':')[0]} patient={patient} chart={chart} fixed={{ order_id: modal.split(':')[1] }} patients={[patient]} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); onChanged() }} />}
  </div>
}

function PatientOverview({ chart }: { chart: Chart }) {
  const p = chart.patient, latestVitals = chart.vitals[0]
  return <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
    <Panel title="Demographics" subtitle="Core patient and emergency-contact details."><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Detail label="MRN" value={p.mrn} /><Detail label="Date of birth" value={`${date.format(new Date(`${p.date_of_birth}T00:00:00`))} (${formatPatientAge(p.date_of_birth)})`} /><Detail label="Sex" value={label(p.sex)} /><Detail label="Marital status" value={p.marital_status && label(p.marital_status)} /><Detail label="Blood group" value={p.blood_group} /><Detail label="Genotype" value={p.genotype} /><Detail label="Occupation" value={p.occupation} /><Detail label="Record status" value={label(p.status)} /><Detail label="Phone" value={p.phone} /><Detail label="Email" value={p.email} /><Detail label="Address" value={[p.address,p.city,p.state,p.country].filter(Boolean).join(', ')} /><Detail label="Emergency contact" value={[p.emergency_contact_name,p.emergency_contact_phone,p.emergency_contact_relationship && `(${label(p.emergency_contact_relationship)})`].filter(Boolean).join(' · ')} /><Detail label="Registered" value={p.created_at && date.format(new Date(p.created_at))} /><Detail label="Last updated" value={p.updated_at && date.format(new Date(p.updated_at))} /></dl></Panel>
    <Panel title="Recent clinical activity" subtitle="Latest observations and longitudinal records."><div className="mt-5 grid gap-4 sm:grid-cols-3"><MiniStat label="Last BP" value={latestVitals?.systolic_bp ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}` : '—'} /><MiniStat label="Weight" value={latestVitals?.weight_kg ? `${latestVitals.weight_kg} kg` : '—'} /><MiniStat label="BMI" value={latestVitals?.bmi || '—'} /></div><div className="mt-5 grid gap-3 md:grid-cols-2"><OverviewRow title="Recent encounter" value={chart.encounters[0] ? `${label(chart.encounters[0].encounter_type)} · ${date.format(new Date(chart.encounters[0].created_at))}` : 'No encounters'} /><OverviewRow title="Latest investigation" value={chart.investigations[0]?.test_name || 'No investigations'} /><OverviewRow title="Upcoming appointment" value={chart.appointments.find((x: any) => x.preferred_date >= new Date().toISOString().slice(0,10)) ? date.format(new Date(chart.appointments.find((x: any) => x.preferred_date >= new Date().toISOString().slice(0,10)).preferred_date)) : 'No upcoming appointment'} /><OverviewRow title="Active care plan" value={chart.carePlans.find((x: any) => x.status === 'active')?.title || 'No active care plan'} /></div></Panel>
  </div>
}

function Timeline({ chart }: { chart: Chart }) {
  const events = useMemo(() => [
    ...chart.encounters.map((x: any) => ({ at: x.created_at, type: 'Encounter', title: x.chief_complaint || label(x.encounter_type), detail: x.clinical_assessment })),
    ...chart.notes.map((x: any) => ({ at: x.created_at, type: 'Clinical note', title: label(x.note_type), detail: x.content })),
    ...chart.vitals.map((x: any) => ({ at: x.recorded_at, type: 'Vitals', title: x.systolic_bp ? `BP ${x.systolic_bp}/${x.diastolic_bp}` : 'Clinical observations recorded', detail: x.notes })),
    ...chart.diagnoses.map((x: any) => ({ at: x.diagnosed_at, type: 'Diagnosis', title: x.diagnosis_name, detail: x.icd10_code })),
    ...chart.medications.map((x: any) => ({ at: x.created_at, type: 'Medication', title: `${x.medication_name} ${x.strength || ''}`, detail: [x.dose,x.route,x.frequency].filter(Boolean).join(' · ') })),
    ...chart.investigations.map((x: any) => ({ at: x.ordered_at, type: 'Investigation', title: `${x.test_name} ordered`, detail: label(x.status) })),
    ...chart.results.map((x: any) => ({ at: x.result_date, type: 'Result', title: `${x.test_name}: ${x.result}${x.unit ? ` ${x.unit}` : ''}`, detail: x.abnormal_flag ? label(x.abnormal_flag) : '' })),
    ...chart.legacyReports.map((x: any) => ({ at: x.created_at, type: 'Investigation report', title: x.report_meta?.reportTitle || x.original_name, detail: `${x.results?.length || 0} reported result${x.results?.length === 1 ? '' : 's'}` })),
    ...chart.imaging.map((x: any) => ({ at: x.performed_at || x.created_at, type: 'Imaging', title: `${x.modality}${x.body_region ? ` · ${x.body_region}` : ''}`, detail: x.report || x.indication })),
    ...chart.assessments.map((x: any) => ({ at: x.submitted_at, type: 'Health assessment', title: label(x.source), detail: label(x.status) })),
    ...chart.appointments.map((x: any) => ({ at: `${x.preferred_date}T${x.preferred_time || '00:00'}`, type: 'Appointment', title: label(x.consultation_type), detail: label(x.status) })),
    ...(chart.financialPayments || []).map((payment: any) => { const bill = (chart.financialRecords || []).find((record: any) => record.id === payment.financial_record_id); return { at: `${payment.payment_date}T00:00:00`, type: 'Payment installment', title: bill?.description || 'Patient bill', detail: `${formatMoney(payment.amount, bill?.currency)} · ${payment.payment_method ? label(payment.payment_method) : 'Method not recorded'}${payment.payment_reference ? ` · ${payment.payment_reference}` : ''}` } }),
  ].sort((a,b) => new Date(b.at).getTime() - new Date(a.at).getTime()), [chart])
  return <Panel title="Clinical timeline" subtitle="Persisted patient activity in chronological order."><div className="mt-6 space-y-0">{events.length ? events.map((event,index) => <div key={`${event.type}-${event.at}-${index}`} className="relative flex gap-5 pb-7 before:absolute before:left-[17px] before:top-9 before:h-[calc(100%-1rem)] before:w-px before:bg-green-deep/10 last:before:hidden"><span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-deep text-gold"><PulseIcon size={18} weight="fill" /></span><div className="min-w-0 pt-0.5"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-mid">{event.type} · {dateTime.format(new Date(event.at))}</p><p className="mt-1 font-bold">{event.title}</p>{event.detail && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-text-mid">{event.detail}</p>}</div></div>) : <Empty text="No clinical activity yet." />}</div></Panel>
}

function ClinicalRecords({ patients, onPatient }: { patients: Patient[]; onPatient: (id: string) => void }) {
  const [notes, setNotes] = useState<any[]>([]), [diagnoses, setDiagnoses] = useState<any[]>([]), [vitals, setVitals] = useState<any[]>([])
  useEffect(() => { Promise.all(['notes','diagnoses','vitals'].map(resource => fetch(`${api}?resource=${resource}`).then(r => r.json()))).then(([a,b,c]) => { setNotes(a.records || []); setDiagnoses(b.records || []); setVitals(c.records || []) }) }, [])
  return <div className="grid gap-6 xl:grid-cols-3"><GlobalList title="Recent clinical notes" records={notes} patients={patients} onPatient={onPatient} primary="content" /><GlobalList title="Diagnoses" records={diagnoses} patients={patients} onPatient={onPatient} primary="diagnosis_name" /><GlobalList title="Recent vitals" records={vitals} patients={patients} onPatient={onPatient} primary="recorded_at" /></div>
}

function ResourceWorkspace({ title, description, resource, patients, createType, onPatient }: { title: string; description: string; resource: string; patients: Patient[]; createType: string; onPatient: (id: string) => void }) {
  const [records, setRecords] = useState<any[]>([]), [modal, setModal] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); const response = await fetch(`${api}?resource=${resource}`); const result = await response.json(); if (response.ok) setRecords(result.records || []); else setError(result.error); setLoading(false) }, [resource])
  useEffect(() => { load() }, [load])
  return <Panel title={title} subtitle={description} action={<button onClick={() => setModal(true)} className="primary"><PlusIcon />Add {createType.replace('_',' ')}</button>}>
    {error && <Alert tone="error">{error}</Alert>}{loading ? <Loading /> : <div className="mt-6 space-y-3">{records.length ? records.map(record => <button key={record.id} onClick={() => record.patient_id && onPatient(record.patient_id)} className="flex w-full flex-wrap items-center gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left hover:border-green-mid"><span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-green-deep text-gold"><ClipboardTextIcon size={21} weight="fill" /></span><div className="min-w-0 flex-1"><p className="font-bold">{recordTitle(record, resource)}</p><p className="mt-1 text-xs text-text-mid">{patientName(patients, record.patient_id)} · {dateTime.format(new Date(record.created_at || record.ordered_at))}</p></div>{record.status && <Status value={record.status} />}</button>) : <Empty text={`No ${title.toLowerCase()} yet.`} />}</div>}
    {modal && <ClinicalModal type={createType} patients={patients} onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />}
  </Panel>
}

function Appointments({ patients, onPatient, onError }: { patients: Patient[]; onPatient: (id: string) => void; onError: (value: string) => void }) {
  const [items, setItems] = useState<any[]>([]), [links, setLinks] = useState<Record<string,string>>({}), [loading, setLoading] = useState(true)
  const load = useCallback(async () => { setLoading(true); const response = await fetch(`${api}?resource=appointments`); const result = await response.json(); if (response.ok) setItems(result.appointments || []); else onError(result.error); setLoading(false) }, [onError])
  useEffect(() => { load() }, [load])
  async function linkAppointment(item: any) { const patientId = links[item.id]; if (!patientId) return; const response = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'appointments', id: item.id, patient_id: patientId }) }); const result = await response.json(); if (!response.ok) onError(result.error); else load() }
  async function start(item: any) { if (!item.patient_id) return onError('Link this appointment to a clinical patient first.'); const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'encounters', patient_id: item.patient_id, appointment_id: item.id, encounter_type: item.consultation_type, chief_complaint: item.symptoms }) }); const result = await response.json(); if (!response.ok) onError(result.error); else { load(); onPatient(item.patient_id) } }
  return <Panel title="Clinical appointments" subtitle="Existing appointment requests linked into the patient and encounter workflow.">{loading ? <Loading /> : <div className="mt-6 space-y-3">{items.map(item => <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-green-deep/10 bg-white p-4"><span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#EAF2FE] text-[#3374A8]"><CalendarCheckIcon size={22} weight="fill" /></span><div className="min-w-48 flex-1"><p className="font-bold">{item.first_name} {item.last_name}</p><p className="mt-1 text-xs text-text-mid">{date.format(new Date(item.preferred_date))} · {formatTime(item.preferred_time)} · {label(item.consultation_type)}</p></div>{item.patient ? <button onClick={() => onPatient(item.patient.id)} className="secondary">{item.patient.mrn} · Open patient</button> : <div className="flex min-w-72 gap-2"><select className="input py-2" value={links[item.id] || ''} onChange={e => setLinks(current => ({ ...current, [item.id]: e.target.value }))}><option value="">Link to patient…</option>{patients.map(p => <option key={p.id} value={p.id}>{p.mrn} · {fullName(p)}</option>)}</select><button onClick={() => linkAppointment(item)} className="secondary">Link</button></div>}<button disabled={!item.patient_id || Boolean(item.encounter_id)} onClick={() => start(item)} className="primary disabled:opacity-40">{item.encounter_id ? 'Encounter started' : 'Start encounter'}</button></div>)}</div>}</Panel>
}

function DocumentsWorkspace({ patients }: { patients: Patient[]; onPatient: (id: string) => void }) {
  const [patientId, setPatientId] = useState(''), [chart, setChart] = useState<Chart | null>(null), [show, setShow] = useState(false)
  useEffect(() => { if (!patientId) return setChart(null); fetch(`${api}?resource=patient&patientId=${patientId}`).then(r => r.json()).then(setChart) }, [patientId])
  return <Panel title="Clinical documents" subtitle="Secure patient-linked records stored in a private clinical bucket." action={<button disabled={!patientId} onClick={() => setShow(true)} className="primary disabled:opacity-40"><FileArrowUpIcon />Upload document</button>}><select className="input mt-6 max-w-lg" value={patientId} onChange={e => setPatientId(e.target.value)}><option value="">Select patient…</option>{patients.map(p => <option key={p.id} value={p.id}>{p.mrn} · {fullName(p)}</option>)}</select>{chart ? <PatientDocuments chart={chart} onChanged={() => fetch(`${api}?resource=patient&patientId=${patientId}`).then(r => r.json()).then(setChart)} /> : <Empty text="Select a patient to view clinical documents." />}{show && chart && <ClinicalModal type="document" patient={chart.patient} chart={chart} patients={[chart.patient]} onClose={() => setShow(false)} onSaved={() => { setShow(false); fetch(`${api}?resource=patient&patientId=${patientId}`).then(r => r.json()).then(setChart) }} />}</Panel>
}

function LegacyReports({ patients, onPatient }: { patients: Patient[]; onPatient: (id: string) => void }) {
  const [records, setRecords] = useState<any[]>([]), [links, setLinks] = useState<Record<string,string>>({}), [error, setError] = useState('')
  const load = useCallback(async () => { const response = await fetch(`${api}?resource=legacy_reports`); const result = await response.json(); if (response.ok) setRecords(result.records || []); else setError(result.error) }, [])
  useEffect(() => { load() }, [load])
  async function linkReport(record: any) { const patientId = links[record.id]; if (!patientId) return; const response = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'legacy_reports', id: record.id, patient_id: patientId }) }); if (response.ok) load(); else setError((await response.json()).error) }
  return <Panel title="Existing investigation reports" subtitle="Explicitly attach reports created in Admin Tools to the correct clinical patient.">{error && <Alert tone="error">{error}</Alert>}<div className="mt-5 space-y-3">{records.map(record => <div key={record.id} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4"><FlaskIcon size={22} weight="duotone" className="text-green-mid" /><div className="min-w-52 flex-1"><p className="font-bold">{record.report_meta?.reportTitle || record.original_name}</p><p className="mt-1 text-xs text-text-mid">{record.patient?.fullName || 'Unidentified patient'} · {date.format(new Date(record.created_at))}</p></div>{record.emr_patient_id ? <button onClick={() => onPatient(record.emr_patient_id)} className="secondary">Open linked patient</button> : <div className="flex min-w-72 gap-2"><select className="input py-2" value={links[record.id] || ''} onChange={event => setLinks(current => ({ ...current, [record.id]: event.target.value }))}><option value="">Select patient…</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.mrn} · {fullName(patient)}</option>)}</select><button onClick={() => linkReport(record)} className="secondary">Link</button></div>}</div>)}{!records.length && <Empty text="No existing investigation reports." />}</div></Panel>
}

function PatientDocuments({ chart }: { chart: Chart; onChanged: () => void }) {
  async function open(id: string) { const response = await fetch(`${api}?resource=document_url&id=${id}`); const result = await response.json(); if (response.ok) window.open(result.url, '_blank', 'noopener,noreferrer') }
  return <div className="mt-6 grid gap-3 md:grid-cols-2">{chart.documents.length ? chart.documents.map((item: any) => <button key={item.id} onClick={() => open(item.id)} className="flex items-center gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left hover:border-green-mid"><FileTextIcon size={25} weight="duotone" className="text-green-mid" /><div><p className="font-bold">{item.title}</p><p className="mt-1 text-xs text-text-mid">{label(item.category)} · {date.format(new Date(item.created_at))}</p></div></button>) : <Empty text="No clinical documents uploaded." />}</div>
}

function RecordList({ records, kind, patient, chart, prescriptions = [], onUpdate, onCreateResult }: { records: any[]; kind: string; patient?: Patient; chart?: Chart; prescriptions?: any[]; onUpdate: () => void; onCreateResult?: (record: any) => void }) {
  const [amending, setAmending] = useState<any>(null)
  const [attaching, setAttaching] = useState<any>(null)
  const [openDetail, setOpenDetail] = useState<string | null>(null)
  const [editing, setEditing] = useState<any>(null)
  const [error, setError] = useState('')
  // Failures used to be swallowed, so a rejected update looked identical to
  // nothing happening. Surface the server's reason instead.
  // Amendments are stored as notes carrying parent_note_id. They belong under
  // the note they amend, not as separate entries in the list.
  const visible = kind === 'note' ? records.filter((item: any) => !item.parent_note_id) : records
  async function update(record: any, status: string, extra: Record<string,unknown> = {}) {
    setError('')
    const response = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: resourceForKind(kind), id: record.id, status, ...extra }) })
    if (response.ok) { onUpdate(); return }
    const result = await response.json().catch(() => ({}))
    setError(result.error || `Update failed (${response.status}).`)
  }
  return <><Panel title={kind === 'allergy' ? 'Allergies' : label(`${kind}s`)} subtitle={`${visible.length} record${visible.length === 1 ? '' : 's'}`}><div className="mt-5 space-y-3">{error && <Alert tone="error">{error}</Alert>}{visible.length ? visible.map(record => <div key={record.id} className="rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold">{recordTitle(record, resourceForKind(kind))}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-mid">{recordDetail(record, kind)}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-green-mid/70">{dateTime.format(new Date(record.created_at || record.ordered_at || record.recorded_at || record.result_date))}</p></div>{record.status && <Status value={record.status} />}</div><div className="mt-3 flex flex-wrap gap-2">{kind === 'encounter' && <button onClick={() => setOpenDetail(openDetail === record.id ? null : record.id)} aria-expanded={openDetail === record.id} aria-controls={`encounter-detail-${record.id}`} className="secondary">{openDetail === record.id ? 'Hide details' : 'View details'}</button>}{kind === 'encounter' && record.status !== 'completed' && <button onClick={() => update(record, 'completed')} className="secondary">Complete encounter</button>}{(kind === 'note' || kind === 'encounter') && patient && <button onClick={() => setEditing(record)} className="secondary"><PencilSimpleIcon size={18} weight="duotone" />{kind === 'encounter' ? 'Edit encounter' : 'Edit note'}</button>}{kind === 'note' && record.status === 'draft' && <button onClick={() => update(record, 'final')} className="secondary">Finalize note</button>}{kind === 'note' && (record.status === 'final' || record.status === 'amended') && patient && <button onClick={() => setAmending(record)} className="secondary">Add amendment</button>}{(kind === 'note' || kind === 'encounter') && patient && <button onClick={() => setAttaching(record)} className="secondary"><FileArrowUpIcon size={18} weight="duotone" />Attach file</button>}{kind === 'diagnosis' && record.status === 'active' && <button onClick={() => update(record, 'resolved', { resolved_at: new Date().toISOString() })} className="secondary">Mark resolved</button>}{kind === 'medication' && record.status === 'active' && <button onClick={() => update(record, 'completed', { end_date: new Date().toISOString().slice(0,10) })} className="secondary">Complete medication</button>}{kind === 'medication' && patient && <button onClick={() => printPrescription(patient, record, prescriptions.find(item => item.medication_id === record.id))} className="secondary"><PrinterIcon />Print prescription</button>}{kind === 'investigation' && record.status !== 'completed' && record.status !== 'cancelled' && onCreateResult && <button onClick={() => onCreateResult(record)} className="secondary">Add result</button>}{kind === 'result' && !record.reviewed_at && <button onClick={() => update(record, '', { review: true })} className="secondary">Mark reviewed</button>}{kind === 'task' && record.status !== 'completed' && <button onClick={() => update(record, 'completed', { completed_at: new Date().toISOString() })} className="secondary">Complete task</button>}</div>{kind === 'encounter' && openDetail === record.id && <EncounterDetail record={record} chart={chart} patient={patient} onUpdate={onUpdate} />}{kind === 'note' && <NoteAmendments amendments={records.filter((item: any) => item.parent_note_id === record.id)} />}{kind === 'note' && <Attachments files={noteFiles(chart, record.id)} />}</div>) : <Empty text={`No ${kind.replace('_',' ')} records.`} />}</div></Panel>{amending && patient && <ClinicalModal type="amendment" patient={patient} chart={chart} fixed={{ parent_note_id: amending.id, encounter_id: amending.encounter_id, note_type: amending.note_type }} patients={[patient]} onClose={() => setAmending(null)} onSaved={() => { setAmending(null); onUpdate() }} />}{editing && patient && <ClinicalModal type={kind === 'encounter' ? 'encounter_edit' : 'note_edit'} editingRecord={editing} patient={patient} chart={chart} patients={[patient]} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onUpdate() }} />}{attaching && patient && <ClinicalModal type={kind === 'encounter' ? 'encounter_document' : 'note_document'} patient={patient} chart={chart} fixed={kind === 'encounter' ? { encounter_id: attaching.id } : { note_id: attaching.id, encounter_id: attaching.encounter_id }} patients={[patient]} onClose={() => setAttaching(null)} onSaved={() => { setAttaching(null); onUpdate() }} />}</>
}

// Documents have no "investigation" category; laboratory and imaging are the
// diagnostic ones, so those are what surface alongside orders and results.
const investigationCategories = ['laboratory', 'imaging']

function InvestigationAttachments({ chart }: { chart: Chart }) {
  const files = (chart.documents || []).filter((item: any) => investigationCategories.includes(item.category))
  return <Panel title="Investigation attachments" subtitle={`${files.length} laboratory or imaging document${files.length === 1 ? '' : 's'}`}>
    {files.length ? <Attachments files={files} showHeading={false} /> : <div className="mt-5"><Empty text="No laboratory or imaging documents uploaded." /></div>}
  </Panel>
}

function NoteAmendments({ amendments }: { amendments: any[] }) {
  if (!amendments.length) return null
  const ordered = [...amendments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return <div className="mt-3 border-t border-green-deep/10 pt-3">
    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">{ordered.length} amendment{ordered.length === 1 ? '' : 's'}</p>
    <div className="mt-2 space-y-2">{ordered.map((item: any, index: number) => <div key={item.id} className="rounded-[12px] border border-green-deep/10 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-mid/70">Amendment {index + 1} · {dateTime.format(new Date(item.created_at))}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-dark">{item.content}</p>
    </div>)}</div>
  </div>
}

function Attachments({ files, showHeading = true }: { files: any[]; showHeading?: boolean }) {
  async function open(id: string) {
    const response = await fetch(`${api}?resource=document_url&id=${id}`)
    const result = await response.json()
    if (response.ok) window.open(result.url, '_blank', 'noopener,noreferrer')
  }
  if (!files.length) return null
  return <div className={showHeading ? 'mt-3 border-t border-green-deep/10 pt-3' : 'mt-5'}>
    {showHeading && <p className="text-[10px] font-bold uppercase tracking-wide text-green-mid">{files.length} attachment{files.length === 1 ? '' : 's'}</p>}
    <div className="mt-2 grid gap-2 sm:grid-cols-2">{files.map((item: any) => <button key={item.id} onClick={() => open(item.id)} className="flex items-center gap-3 rounded-[12px] border border-green-deep/10 bg-white p-3 text-left hover:border-green-mid">
      <FileTextIcon size={20} weight="duotone" className="shrink-0 text-green-mid" />
      <span className="min-w-0"><span className="block truncate text-sm font-bold">{item.title}</span><span className="block text-[11px] text-text-mid">{label(item.category)} · {formatBytes(item.file_size)}</span></span>
    </button>)}</div>
  </div>
}

// Files attached directly to a note.
function noteFiles(chart: Chart | undefined, noteId: string) {
  return (chart?.documents || []).filter((item: any) => item.note_id === noteId)
}

// Files attached to the encounter itself. Documents attached to a note within
// the encounter also carry its encounter_id, so they are excluded here to avoid
// showing the same file in two places.
function encounterFiles(chart: Chart | undefined, encounterId: string) {
  return (chart?.documents || []).filter((item: any) => item.encounter_id === encounterId && !item.note_id)
}

function formatBytes(size?: number | null) {
  if (!size) return 'Unknown size'
  const units = ['B', 'KB', 'MB']
  let value = size, unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++ }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

// The encounter form captures eleven narrative fields; the list row only ever
// showed the chief complaint, so the rest of the documentation was stored but
// unreadable. This renders every section that has content.
const encounterSections: Array<[string, string]> = [
  ['chief_complaint', 'Chief complaint'],
  ['history_presenting_illness', 'History of presenting illness'],
  ['past_medical_history', 'Past medical history'],
  ['surgical_history', 'Surgical history'],
  ['family_history', 'Family history'],
  ['social_history', 'Social history'],
  ['review_of_systems', 'Review of systems'],
  ['examination', 'Examination'],
  ['clinical_assessment', 'Assessment'],
  ['treatment_plan', 'Plan'],
  ['follow_up_plan', 'Follow-up'],
]

// Units live next to the reading so a number is never shown bare.
const vitalReadings: Array<[string, string, (record: any) => any]> = [
  ['Blood pressure', 'mmHg', (v) => v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : null],
  ['Heart rate', 'bpm', (v) => v.heart_rate],
  ['Respiratory rate', '/min', (v) => v.respiratory_rate],
  ['Temperature', '°C', (v) => v.temperature_c],
  ['SpO₂', '%', (v) => v.spo2],
  ['Weight', 'kg', (v) => v.weight_kg],
  ['Height', 'cm', (v) => v.height_cm],
  ['BMI', '', (v) => v.bmi],
  ['Blood glucose', '', (v) => v.blood_glucose],
  ['Pain score', '/10', (v) => v.pain_score],
]

function EncounterDetail({ record, chart, patient, onUpdate }: { record: any; chart?: Chart; patient?: Patient; onUpdate?: () => void }) {
  const [editingVitals, setEditingVitals] = useState<any>(null)
  const sections = encounterSections.filter(([key]) => record[key])
  // Vitals are recorded separately and linked by encounter_id, so pull the
  // readings taken during this encounter rather than the patient's latest.
  const vitals = (chart?.vitals || []).filter((item: any) => item.encounter_id === record.id)
  return <div id={`encounter-detail-${record.id}`} className="mt-4 rounded-[14px] border border-green-deep/10 bg-white p-5">
    <dl className="grid gap-4 sm:grid-cols-3">
      <Detail label="Encounter" value={record.encounter_number} />
      <Detail label="Type" value={label(record.encounter_type)} />
      <Detail label="Status" value={label(record.status)} />
      <Detail label="Started" value={record.started_at && dateTime.format(new Date(record.started_at))} />
      <Detail label="Completed" value={record.completed_at && dateTime.format(new Date(record.completed_at))} />
      <Detail label="Recorded" value={record.created_at && dateTime.format(new Date(record.created_at))} />
    </dl>
    {vitals.length > 0 && <div className="mt-5 border-t border-green-deep/10 pt-5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-green-mid">Vital signs</p>
      {vitals.map((observation: any) => {
        const readings = vitalReadings.map(([title, unit, read]) => [title, read(observation), unit] as const).filter(([, value]) => value !== null && value !== undefined && value !== '')
        return <div key={observation.id} className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-text-mid">{dateTime.format(new Date(observation.recorded_at))}</p>
            {patient && <button onClick={() => setEditingVitals(observation)} className="text-xs font-bold text-green-mid hover:underline">Correct</button>}
          </div>
          {readings.length ? <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{readings.map(([title, value, unit]) => <MiniStat key={title} label={title} value={`${value}${unit ? ` ${unit}` : ''}`} />)}</div> : <p className="mt-1 text-sm text-text-mid">No observations recorded.</p>}
          {observation.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-mid">{observation.notes}</p>}
        </div>
      })}
    </div>}
    {editingVitals && patient && <ClinicalModal type="vitals_edit" editingRecord={editingVitals} patient={patient} chart={chart} patients={[patient]} onClose={() => setEditingVitals(null)} onSaved={() => { setEditingVitals(null); onUpdate?.() }} />}
    <Attachments files={encounterFiles(chart, record.id)} />
    {sections.length ? <div className="mt-5 space-y-4 border-t border-green-deep/10 pt-5">{sections.map(([key, title]) => <div key={key}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-green-mid">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-dark">{record[key]}</p>
    </div>)}</div> : <p className="mt-5 border-t border-green-deep/10 pt-5 text-sm text-text-mid">No clinical documentation was recorded for this encounter.</p>}
  </div>
}

function CarePlanList({ chart, patient, onUpdate }: { chart: Chart; patient: Patient; onUpdate: () => void }) {
  const [plan, setPlan] = useState<any>(null)
  async function complete(item: any) { await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'care_plan_items', id: item.id, status: 'completed', completed_at: new Date().toISOString() }) }); onUpdate() }
  return <><Panel title="Care plans" subtitle={`${chart.carePlans.length} coordinated plan${chart.carePlans.length === 1 ? '' : 's'}`}><div className="mt-5 space-y-4">{chart.carePlans.length ? chart.carePlans.map((item: any) => <div key={item.id} className="rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-text-mid">{item.goals || item.description}</p></div><Status value={item.status} /></div><div className="mt-4 space-y-2">{item.items?.map((step: any) => <div key={step.id} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm"><CheckCircleIcon className={step.status === 'completed' ? 'text-green-mid' : 'text-text-mid/35'} weight={step.status === 'completed' ? 'fill' : 'regular'} /><span className="flex-1 font-semibold">{step.title}</span>{step.status !== 'completed' && <button onClick={() => complete(step)} className="text-xs font-bold text-green-mid">Complete</button>}</div>)}</div><button onClick={() => setPlan(item)} className="secondary mt-4"><PlusIcon />Add plan item</button></div>) : <Empty text="No care plans yet." />}</div></Panel>{plan && <ClinicalModal type="care_plan_item" patient={patient} chart={chart} fixed={{ care_plan_id: plan.id }} patients={[patient]} onClose={() => setPlan(null)} onSaved={() => { setPlan(null); onUpdate() }} />}</>
}

function FinancialRecords({ chart, onUpdate, onAdd }: { chart: Chart; onUpdate: () => void; onAdd: () => void }) {
  const records = useMemo(() => chart.financialRecords || [], [chart.financialRecords])
  const payments = useMemo(() => chart.financialPayments || [], [chart.financialPayments])
  const [editing, setEditing] = useState<any>(null)
  const [paying, setPaying] = useState<any>(null)
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [error, setError] = useState('')
  const totals = useMemo(() => Array.from(new Set(records.map((record: any) => record.currency || 'NGN'))).map(currency => {
    const rows = records.filter((record: any) => (record.currency || 'NGN') === currency)
    const billed = rows.reduce((sum: number, record: any) => sum + Number(record.amount_due || 0), 0)
    const paid = rows.reduce((sum: number, record: any) => sum + Number(record.amount_paid || 0), 0)
    return { currency: String(currency), billed, paid, balance: billed - paid }
  }), [records])

  async function removePayment(payment: any) {
    if (!window.confirm(`Remove the ${formatMoney(payment.amount, records.find((record: any) => record.id === payment.financial_record_id)?.currency)} installment dated ${date.format(new Date(`${payment.payment_date}T00:00:00`))}?`)) return
    setError('')
    const response = await fetch(`${api}?resource=financial_payments&id=${encodeURIComponent(payment.id)}`, { method: 'DELETE' })
    if (response.ok) onUpdate()
    else setError((await response.json().catch(() => ({}))).error || 'Unable to remove payment.')
  }

  async function removeBill(record: any) {
    const installmentCount = payments.filter((payment: any) => payment.financial_record_id === record.id).length
    const detail = installmentCount ? ` and its ${installmentCount} payment installment${installmentCount === 1 ? '' : 's'}` : ''
    if (!window.confirm(`Delete the bill “${record.description}”${detail}? This cannot be undone.`)) return
    setError('')
    const response = await fetch(`${api}?resource=financial_records&id=${encodeURIComponent(record.id)}`, { method: 'DELETE' })
    if (response.ok) onUpdate()
    else setError((await response.json().catch(() => ({}))).error || 'Unable to delete bill.')
  }

  return <>
    <Panel title="Patient finances" subtitle="Bills, payment installments and outstanding balances linked directly to this patient." action={<button onClick={onAdd} className="primary"><PlusIcon size={18} />Add bill</button>}>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {totals.map(total => <div key={total.currency} className="contents"><MiniStat label={`Billed (${total.currency})`} value={formatMoney(total.billed, total.currency)} /><MiniStat label={`Paid (${total.currency})`} value={formatMoney(total.paid, total.currency)} /><MiniStat label={`Balance (${total.currency})`} value={formatMoney(total.balance, total.currency)} /></div>)}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {records.length ? <div className="mt-6 space-y-4">{records.map((record: any) => {
        const installments = payments.filter((payment: any) => payment.financial_record_id === record.id)
        const balance = Number(record.amount_due || 0) - Number(record.amount_paid || 0)
        return <article key={record.id} className="overflow-hidden rounded-[18px] border border-green-deep/10">
          <div className="bg-[#FCFFF0] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-lg font-bold">{record.description}</p>{record.notes && <p className="mt-1 text-sm text-text-mid">{record.notes}</p>}</div><Status value={record.status} /></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><MiniStat label="Billed" value={formatMoney(record.amount_due, record.currency)} /><MiniStat label="Paid" value={formatMoney(record.amount_paid, record.currency)} /><MiniStat label="Balance" value={formatMoney(balance, record.currency)} /></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setEditing(record)} className="secondary"><PencilSimpleIcon size={16} />Edit bill</button>{balance > 0 && <button onClick={() => setPaying(record)} className="primary"><PlusIcon size={16} />Add installment</button>}<button onClick={() => removeBill(record)} className="secondary text-red-700">Delete bill</button></div></div>
          <div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-mid">Payment installments</p>{installments.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="text-[11px] uppercase tracking-wide text-green-deep/55"><th className="pb-3">Payment date</th><th className="pb-3">Amount</th><th className="pb-3">Method</th><th className="pb-3">Reference</th><th className="pb-3"></th></tr></thead><tbody>{installments.map((payment: any) => <tr key={payment.id} className="border-t border-green-deep/[0.07]"><td className="py-3">{date.format(new Date(`${payment.payment_date}T00:00:00`))}</td><td className="py-3 font-bold text-emerald-700">{formatMoney(payment.amount, record.currency)}</td><td className="py-3 text-text-mid">{payment.payment_method ? label(payment.payment_method) : '—'}</td><td className="py-3 text-text-mid">{payment.payment_reference || '—'}</td><td className="py-3"><div className="flex justify-end gap-2"><button onClick={() => setEditingPayment(payment)} className="secondary">Edit</button><button onClick={() => removePayment(payment)} className="secondary text-red-700">Remove</button></div></td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-text-mid">No payments recorded for this bill.</p>}</div>
        </article>
      })}</div> : <Empty text="No financial records have been added for this patient." />}
    </Panel>
    {editing && <ClinicalModal type="financial_record_edit" editingRecord={editing} patient={chart.patient} chart={chart} patients={[chart.patient]} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onUpdate() }} />}
    {paying && <ClinicalModal type="financial_payment" patient={chart.patient} chart={chart} fixed={{ financial_record_id: paying.id }} patients={[chart.patient]} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); onUpdate() }} />}
    {editingPayment && <ClinicalModal type="financial_payment_edit" editingRecord={editingPayment} patient={chart.patient} chart={chart} patients={[chart.patient]} onClose={() => setEditingPayment(null)} onSaved={() => { setEditingPayment(null); onUpdate() }} />}
  </>
}

function PatientReportModal({ patient, mode, onClose }: { patient: Patient; mode: 'clinical' | 'financial'; onClose: () => void }) {
  // Computed once on mount rather than every render, and in local time so the
  // default range does not shift a day either side of UTC midnight.
  const [today] = useState(() => toDateInput(new Date()))
  const [from, setFrom] = useState(() => { const now = new Date(); return toDateInput(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())) })
  const [to, setTo] = useState(() => toDateInput(new Date()))
  const [report, setReport] = useState('')
  const [meta, setMeta] = useState<{ provider?: string; documentsRead?: number; skipped?: string[] }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // The prompt forbids second person, but a model can slip; flag it for the clinician to fix.
  const secondPerson = mode === 'clinical' && /\b(you|your|yours|you're|you've)\b/i.test(report)

  async function generate() {
    setLoading(true); setError(''); setReport('')
    const response = await fetch(`${api}/report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id, from, to, reportType: mode }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.error || 'Report generation failed.')
    else { setReport(result.report); setMeta({ provider: result.provider, documentsRead: result.documentsRead, skipped: result.skipped }) }
    setLoading(false)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[26px] bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-green-deep/10 bg-white px-6 py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-mid">{mode === 'financial' ? 'Financial report' : 'Patient report'}</p>
          <h3 className="mt-1 text-2xl font-bold">{mode === 'financial' ? 'Patient financial statement' : 'Comprehensive care summary'}</h3>
          <p className="mt-1 text-sm text-text-mid">{patient.mrn} · {fullName(patient)}</p>
        </div>
        <button onClick={onClose} className="icon-button"><XIcon /></button>
      </div>

      <div className="p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="From"><input type="date" className="input" value={from} max={to} onChange={e => setFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" className="input" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} /></Field>
          <div className="flex items-end">
            <button onClick={generate} disabled={loading} className="primary w-full disabled:opacity-50">{loading ? 'Generating…' : report ? 'Regenerate' : 'Generate report'}</button>
          </div>
        </div>

        {loading && <p className="mt-5 text-sm text-text-mid">{mode === 'financial' ? 'Preparing the patient ledger for the selected period.' : 'Reading the record, financial ledger and any uploaded documents. This can take a minute.'}</p>}
        {error && <Alert tone="error">{error}</Alert>}

        {report && <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-mid">
              Generated from {meta.provider}{mode === 'clinical' ? ` · ${meta.documentsRead || 0} document${meta.documentsRead === 1 ? '' : 's'} read` : ''}
              {meta.skipped?.length ? ` · ${meta.skipped.length} skipped` : ''}
            </p>
            <button onClick={() => printPatientReport(patient, report, from, to, mode)} className="secondary"><PrinterIcon />Download PDF</button>
          </div>
          {meta.skipped?.length ? <div className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Not read</p>
            <ul className="mt-1 space-y-0.5">{meta.skipped.map(item => <li key={item} className="text-xs text-amber-800">{item}</li>)}</ul>
          </div> : null}
          <Alert tone="info">{mode === 'financial' ? 'This statement is generated directly from the patient ledger. Confirm all entries and payment references before sharing.' : 'Written in the third person so the patient can pass it on to another health worker. The financial section is included from the patient ledger. Review and edit before sharing. AI-drafted clinical summaries must be checked by a clinician.'}</Alert>
          {secondPerson && <Alert tone="error">This draft still addresses the patient directly (&ldquo;you&rdquo; / &ldquo;your&rdquo;). Regenerate, or edit those sentences into the third person before sharing.</Alert>}
          <textarea value={report} onChange={e => setReport(e.target.value)} rows={26} className="input mt-4 font-mono text-[13px] leading-6" />
        </>}
      </div>
    </div>
  </div>
}

// Renders the report as an official FXMed clinical document. Letterhead,
// palette and type all come from lib/reportTheme, so this prints at the same
// size as the investigation PDFs even though it goes out through the browser's
// print dialog rather than being rasterised.

// Emoji and decorative symbols are stripped defensively: the prompt forbids
// them, but a model can still slip one in and they look wrong in a formal
// clinical document. Ranges are explicit because the TypeScript target predates
// unicode property escapes.
function stripDecorations(value: string) {
  return value
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[←-⇿⌀-⏿①-⓿■-➿⬀-⯿️‍]/g, '')
    .trim()
}

function inline(value: string) {
  const clean = escapeHtml(stripDecorations(value))
  return clean.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function splitRow(line: string) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(cell => cell.trim())
}

// Minimal Markdown -> styled HTML. Handles headings, bullet and numbered lists,
// and tables, which the model is instructed to use for any tabular data.
function reportBodyHtml(markdown: string) {
  const lines = markdown.split('\n')
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null } }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // table: a header row followed by a --- separator row
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      closeList()
      const headers = splitRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++ }
      i--
      out.push(`<table style="width:100%;border-collapse:collapse;font-size:${printType('fine')};margin:14px 0"><thead><tr style="background:${REPORT_INK};color:#fff;text-align:left">${headers.map(h => `<th style="padding:9px 8px;font-weight:700">${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, index) => `<tr style="background:${index % 2 ? '#fafafa' : '#fff'}">${row.map(cell => `<td style="padding:9px 8px;border-bottom:1px solid #eef0ec;vertical-align:top">${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
      continue
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      if (list !== 'ul') { closeList(); out.push('<ul style="margin:8px 0 8px 20px;padding:0">'); list = 'ul' }
      out.push(`<li style="margin:4px 0;line-height:${REPORT_LEADING.footer}">${inline(bullet[1])}</li>`)
      continue
    }
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (numbered) {
      if (list !== 'ol') { closeList(); out.push('<ol style="margin:8px 0 8px 20px;padding:0">'); list = 'ol' }
      out.push(`<li style="margin:4px 0;line-height:${REPORT_LEADING.footer}">${inline(numbered[1])}</li>`)
      continue
    }

    closeList()
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const depth = heading[1].length
      if (depth <= 2) out.push(`<h2 style="font-size:${printType('section')};color:${REPORT_INK};border-bottom:2px solid #e5e7eb;padding-bottom:7px;margin:26px 0 12px">${inline(heading[2])}</h2>`)
      else out.push(`<h3 style="font-size:${printType('subsection')};color:${REPORT_INK};margin:18px 0 6px">${inline(heading[2])}</h3>`)
      continue
    }
    if (line.trim()) out.push(`<p style="margin:9px 0;font-size:${printType('body')};line-height:${REPORT_LEADING.body};color:#374151">${inline(line)}</p>`)
  }
  closeList()
  return out.join('')
}

function reportField(label: string, value: string) {
  return `<div><div style="font-size:${printType('label')};font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${escapeHtml(label)}</div><div style="font-size:${printType('value')};font-weight:600;color:${REPORT_INK}">${escapeHtml(value || '—')}</div></div>`
}

function printPatientReport(patient: Patient, markdown: string, from: string, to: string, mode: 'clinical' | 'financial' = 'clinical') {
  const origin = window.location.origin
  const reportTitle = mode === 'financial' ? 'Patient Financial Statement' : 'Comprehensive Care Summary'
  const documentType = mode === 'financial' ? 'Confidential Financial Document' : 'Confidential Medical Document'
  const content = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(fullName(patient))} — ${reportTitle}</title><style>
    ${reportPrintCss()}
    table{page-break-inside:auto}tr{page-break-inside:avoid}h2,h3{page-break-after:avoid}
  </style></head><body>
    <div style="text-align:center;margin-bottom:28px;padding-bottom:24px;border-bottom:2px solid ${REPORT_ACCENT}">
      <div style="display:inline-block;background:rgba(107,142,35,.1);color:#6b8e23;border-radius:20px;padding:7px 16px;font-size:${printType('badge')};font-weight:700;text-transform:uppercase;letter-spacing:.14em">${documentType}</div>
      <div style="margin:14px 0 6px"><img src="${origin}/FXMed_Logo_Black.png" style="height:52px;width:auto" /></div>
      <h1 style="font-size:${printType('title')};color:${REPORT_INK};margin:0 0 6px">${reportTitle}</h1>
      <div style="font-size:${printType('subtitle')};color:#666;font-weight:600">${escapeHtml(fullName(patient))}</div>
    </div>
    <section style="margin-bottom:25px">
      <h2 style="font-size:${printType('section')};color:${REPORT_INK};border-bottom:2px solid #e5e7eb;padding-bottom:7px;margin:0 0 14px">Patient Information</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px 24px">
        ${reportField('Full Name', fullName(patient))}
        ${reportField('MRN', patient.mrn)}
        ${reportField('Age / Sex', `${formatPatientAge(patient.date_of_birth)} / ${label(patient.sex)}`)}
        ${reportField('Reporting Period', `${date.format(new Date(from))} — ${date.format(new Date(to))}`)}
        ${reportField('Date Issued', date.format(new Date()))}
        ${reportField('Phone', patient.phone || '')}
      </div>
    </section>
    ${reportBodyHtml(markdown)}
    <footer style="margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:${printType('footer')};line-height:${REPORT_LEADING.footer};color:#6b7280">
      FXMed Functional Medicine · +234 907 703 1311 · +1 832 779 2347 · fxmed@wellnesswits.com<br>
      Treating the root cause — not just the symptoms<br>
      ${mode === 'financial' ? 'This statement reflects financial records held for the period shown. Please report any discrepancy to FXMed.' : 'This summary reflects the records held for the period shown and does not replace a consultation.'}
    </footer>
    <script>window.onload=()=>window.print()<\/script>
  </body></html>`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/html' }))
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function ClinicalModal({ type, patient, chart, fixed = {}, patients, editingRecord, onClose, onSaved }: { type: string; patient?: Patient; chart?: Chart; fixed?: Record<string,any>; patients: Patient[]; editingRecord?: any; onClose: () => void; onSaved: () => void }) {
  const config = formConfig(type), editingPatient = type === 'patient' ? patient : undefined
  // Editing applies to the patient record or to any clinical record passed in.
  const editing = editingPatient || editingRecord
  const [form, setForm] = useState<Record<string,any>>({ ...(config.defaultValues || {}), ...(editing || {}), patient_id: patient?.id || '', ...fixed, status: editing?.status || config.defaultStatus || '', ...(editingRecord?.created_at ? { record_date: toDateTimeInput(editingRecord.created_at) } : {}) }), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [transcript, setTranscript] = useState(''), [transcriptFile, setTranscriptFile] = useState<File | null>(null), [drafting, setDrafting] = useState(false), [replaceExisting, setReplaceExisting] = useState(false), [draftMessage, setDraftMessage] = useState('')
  const isEncounter = type === 'encounter' || type === 'encounter_edit'
  async function draftFromTranscript() {
    if (!transcript.trim() && !transcriptFile) { setError('Paste a transcript or choose a transcript file.'); return }
    setDrafting(true); setError(''); setDraftMessage('')
    const data = new FormData(); data.set('transcript', transcript); data.set('patient_id', form.patient_id || '')
    if (transcriptFile) data.set('file', transcriptFile)
    try {
      const response = await fetch('/api/admin/emr/encounter-transcript', { method: 'POST', body: data })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to draft encounter fields.')
      let applied = 0, preserved = 0
      const next = { ...form }
      Object.entries(result.draft || {}).forEach(([field, value]) => {
        if (!value) return
        if (!replaceExisting && String(form[field] || '').trim()) { preserved++; return }
        next[field] = value; applied++
      })
      setForm(next)
      setDraftMessage(`${applied} field${applied === 1 ? '' : 's'} drafted${preserved ? `; ${preserved} existing field${preserved === 1 ? ' was' : 's were'} preserved` : ''}. Review every field before saving.`)
    } catch (draftError) { setError(draftError instanceof Error ? draftError.message : 'Unable to draft encounter fields.') }
    finally { setDrafting(false) }
  }
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(''); if (type === 'document' || type === 'note_document' || type === 'encounter_document') return upload(); const response = await fetch(api, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: config.resource, ...(editing ? { id: editing.id } : {}), ...form }) }); const result = await response.json(); if (!response.ok) setError(result.error || 'Unable to save clinical record.'); else onSaved(); setSaving(false) }
  async function upload() { const file = form.file as File; if (!file) { setError('Choose a clinical document.'); setSaving(false); return } const data = new FormData(); Object.entries(form).forEach(([key,value]) => { if (value !== undefined && value !== null && value !== '') data.set(key, value as any) }); const response = await fetch(api, { method: 'POST', body: data }); const result = await response.json(); if (!response.ok) setError(result.error || 'Upload failed.'); else onSaved(); setSaving(false) }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[26px] bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-green-deep/10 bg-white px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-mid">Clinical record</p><h3 className="mt-1 text-2xl font-bold">{config.title}</h3>{patient && <p className="mt-1 text-sm text-text-mid">{patient.mrn} · {fullName(patient)}</p>}</div><button onClick={onClose} className="icon-button"><XIcon /></button></div><form onSubmit={submit} className="p-6">{isEncounter && <section className="mb-6 rounded-[18px] border border-green-deep/10 bg-[#FCFFF0] p-5"><div className="flex items-start gap-3"><FileArrowUpIcon size={24} weight="duotone" className="mt-0.5 shrink-0 text-green-mid" /><div><h4 className="font-bold">Draft from encounter transcript</h4><p className="mt-1 text-xs leading-5 text-text-mid">Paste text or upload a TXT, DOCX, or PDF transcript. AI will prepare editable field drafts; it will not save the transcript or encounter automatically.</p></div></div><textarea className="input mt-4 min-h-32" value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste the encounter transcript here…" aria-label="Encounter transcript" /><div className="mt-3 flex flex-wrap items-center gap-3"><input className="max-w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-green-deep file:px-4 file:py-2 file:font-bold file:text-white" type="file" accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => setTranscriptFile(e.target.files?.[0] || null)} /><button type="button" className="secondary" disabled={drafting} onClick={draftFromTranscript}>{drafting ? 'Drafting…' : 'Draft encounter fields'}</button></div><label className="mt-3 flex items-center gap-2 text-xs font-semibold text-text-mid"><input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} />Replace fields that already contain information</label>{draftMessage && <p className="mt-3 text-xs font-bold text-green-deep">{draftMessage}</p>}<p className="mt-3 text-[11px] leading-5 text-text-mid/80">Clinical review is required. Confirm accuracy, attribution, negations, assessment and plan before saving.</p></section>}<div className="grid gap-5 sm:grid-cols-2">{!patient && type !== 'patient' && <Field label="Patient" required><select className="input" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} required><option value="">Select patient…</option>{patients.map(p => <option key={p.id} value={p.id}>{p.mrn} · {fullName(p)}</option>)}</select></Field>}{config.fields.map(field => <FormField key={field.name} field={field} value={form[field.name] ?? ''} onChange={value => setForm({ ...form, [field.name]: value })} chart={chart} />)}</div>{error && <Alert tone="error">{error}</Alert>}<div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="secondary">Cancel</button><button disabled={saving} className="primary disabled:opacity-50">{saving ? 'Saving…' : config.submit}</button></div></form></div></div>
}

type FieldDef = { name: string; label: string; type?: string; required?: boolean; options?: string[]; wide?: boolean; placeholder?: string }
function formConfig(type: string): { title: string; resource: string; submit: string; defaultStatus?: string; defaultValues?: Record<string, unknown>; fields: FieldDef[] } {
  const configs: Record<string, any> = {
    patient: { title: 'Patient demographics', resource: 'patients', submit: 'Save patient record', fields: [{name:'first_name',label:'First name',required:true},{name:'middle_name',label:'Middle name'},{name:'last_name',label:'Last name',required:true},{name:'date_of_birth',label:'Date of birth',type:'date',required:true},{name:'sex',label:'Sex',type:'select',required:true,options:['female','male']},{name:'phone',label:'Phone'},{name:'email',label:'Email',type:'email'},{name:'address',label:'Address',wide:true},{name:'city',label:'City'},{name:'state',label:'State'},{name:'blood_group',label:'Blood group',options:['A+','A-','B+','B-','AB+','AB-','O+','O-'],type:'select'},{name:'genotype',label:'Genotype'},{name:'emergency_contact_name',label:'Emergency contact'},{name:'emergency_contact_phone',label:'Emergency phone'},{name:'status',label:'Record status',type:'select',options:['active','inactive','deceased']}] },
    encounter: { title: 'Start clinical encounter', resource: 'encounters', submit: 'Start encounter', defaultStatus:'in_progress', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_type',label:'Encounter type',type:'select',options:['consultation','follow_up','home_visit','telemedicine','procedure'],required:true},{name:'chief_complaint',label:'Chief complaint',wide:true,required:true},{name:'history_presenting_illness',label:'History of presenting illness',type:'textarea',wide:true},{name:'past_medical_history',label:'Past medical history',type:'textarea'},{name:'surgical_history',label:'Surgical history',type:'textarea'},{name:'family_history',label:'Family history',type:'textarea'},{name:'social_history',label:'Social history',type:'textarea'},{name:'review_of_systems',label:'Review of systems',type:'textarea',wide:true},{name:'examination',label:'Examination',type:'textarea',wide:true},{name:'clinical_assessment',label:'Assessment',type:'textarea',wide:true},{name:'treatment_plan',label:'Plan',type:'textarea',wide:true},{name:'follow_up_plan',label:'Follow-up',type:'textarea',wide:true}] },
    vitals: { title: 'Record vital signs', resource: 'vitals', submit: 'Save observations', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'systolic_bp',label:'Systolic BP',type:'number'},{name:'diastolic_bp',label:'Diastolic BP',type:'number'},{name:'heart_rate',label:'Heart rate',type:'number'},{name:'respiratory_rate',label:'Respiratory rate',type:'number'},{name:'temperature_c',label:'Temperature °C',type:'number'},{name:'spo2',label:'SpO₂ %',type:'number'},{name:'weight_kg',label:'Weight kg',type:'number'},{name:'height_cm',label:'Height cm',type:'number'},{name:'blood_glucose',label:'Blood glucose',type:'number'},{name:'pain_score',label:'Pain score (0–10)',type:'number'},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
    note: { title: 'Add clinical note', resource: 'notes', submit: 'Save clinical note', defaultStatus:'draft', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'note_type',label:'Note type',type:'select',options:['consultation','progress','nursing','nutrition','procedure','discharge','follow_up'],required:true},{name:'content',label:'Clinical documentation',type:'textarea',wide:true,required:true},{name:'status',label:'Status',type:'select',options:['draft','final'],required:true}] },
    vitals_edit: { title: 'Correct vital signs', resource: 'vitals', submit: 'Save corrections', fields: [{name:'record_date',label:'Date and time recorded',type:'datetime-local'},{name:'systolic_bp',label:'Systolic BP',type:'number'},{name:'diastolic_bp',label:'Diastolic BP',type:'number'},{name:'heart_rate',label:'Heart rate',type:'number'},{name:'respiratory_rate',label:'Respiratory rate',type:'number'},{name:'temperature_c',label:'Temperature °C',type:'number'},{name:'spo2',label:'SpO₂ %',type:'number'},{name:'weight_kg',label:'Weight kg',type:'number'},{name:'height_cm',label:'Height cm',type:'number'},{name:'blood_glucose',label:'Blood glucose',type:'number'},{name:'pain_score',label:'Pain score (0–10)',type:'number'},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
    note_edit: { title: 'Edit clinical note', resource: 'notes', submit: 'Save note', fields: [{name:'record_date',label:'Date and time of note',type:'datetime-local'},{name:'note_type',label:'Note type',type:'select',options:['consultation','progress','nursing','nutrition','procedure','discharge','follow_up'],required:true},{name:'content',label:'Clinical documentation',type:'textarea',wide:true,required:true},{name:'status',label:'Status',type:'select',options:['draft','final','amended'],required:true}] },
    encounter_edit: { title: 'Edit encounter', resource: 'encounters', submit: 'Save encounter', fields: [{name:'record_date',label:'Date and time of encounter',type:'datetime-local'},{name:'encounter_type',label:'Encounter type',type:'select',options:['consultation','follow_up','home_visit','telemedicine','procedure'],required:true},{name:'status',label:'Status',type:'select',options:['planned','waiting','in_progress','completed','cancelled'],required:true},{name:'chief_complaint',label:'Chief complaint',wide:true,required:true},{name:'history_presenting_illness',label:'History of presenting illness',type:'textarea',wide:true},{name:'past_medical_history',label:'Past medical history',type:'textarea'},{name:'surgical_history',label:'Surgical history',type:'textarea'},{name:'family_history',label:'Family history',type:'textarea'},{name:'social_history',label:'Social history',type:'textarea'},{name:'review_of_systems',label:'Review of systems',type:'textarea',wide:true},{name:'examination',label:'Examination',type:'textarea',wide:true},{name:'clinical_assessment',label:'Assessment',type:'textarea',wide:true},{name:'treatment_plan',label:'Plan',type:'textarea',wide:true},{name:'follow_up_plan',label:'Follow-up',type:'textarea',wide:true}] },
    amendment: { title: 'Add signed note amendment', resource: 'notes', submit: 'Sign amendment', defaultStatus:'amended', fields: [{name:'content',label:'Amendment',type:'textarea',wide:true,required:true}] },
    diagnosis: { title: 'Record diagnosis', resource: 'diagnoses', submit: 'Save diagnosis', defaultStatus:'active', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'diagnosis_name',label:'Diagnosis',required:true},{name:'icd10_code',label:'ICD-10 code'},{name:'status',label:'Status',type:'select',options:['active','resolved','historical']},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
    allergy: { title: 'Record allergy', resource: 'allergies', submit: 'Save allergy', defaultStatus:'active', fields: [{name:'allergen',label:'Allergen',required:true},{name:'reaction',label:'Reaction'},{name:'severity',label:'Severity',type:'select',options:['mild','moderate','severe','unknown']},{name:'identified_at',label:'Date identified',type:'date'},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
    medication: { title: 'Create prescription', resource: 'medications', submit: 'Sign prescription', defaultStatus:'active', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'medication_name',label:'Medication',required:true},{name:'generic_name',label:'Generic name'},{name:'strength',label:'Strength',required:true},{name:'dose',label:'Dose',required:true},{name:'route',label:'Route',type:'select',options:['oral','intravenous','intramuscular','subcutaneous','topical','inhaled','other'],required:true},{name:'frequency',label:'Frequency',required:true},{name:'duration',label:'Duration',required:true},{name:'quantity',label:'Quantity',required:true},{name:'start_date',label:'Start date',type:'date'},{name:'end_date',label:'End date',type:'date'},{name:'instructions',label:'Instructions',type:'textarea',wide:true}] },
    investigation: { title: 'Order investigation', resource: 'investigations', submit: 'Place order', defaultStatus:'ordered', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'test_name',label:'Test / investigation',required:true},{name:'category',label:'Category',type:'select',options:['laboratory','imaging','cardiology','pathology','other']},{name:'clinical_indication',label:'Clinical indication',type:'textarea',wide:true,required:true},{name:'priority',label:'Priority',type:'select',options:['routine','urgent','stat']}] },
    result: { title: 'Record investigation result', resource: 'results', submit: 'Save result', fields: [{name:'test_name',label:'Test name',required:true},{name:'result',label:'Result',required:true},{name:'unit',label:'Unit'},{name:'reference_range',label:'Reference range'},{name:'abnormal_flag',label:'Flag',type:'select',options:['normal','low','high','critical','abnormal']},{name:'performing_facility',label:'Performing facility'},{name:'result_date',label:'Result date',type:'datetime-local'},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
    imaging: { title: 'Record imaging study', resource: 'imaging', submit: 'Save imaging record', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'modality',label:'Modality',type:'select',options:['x_ray','ultrasound','ct','mri','mammography','other'],required:true},{name:'body_region',label:'Body region'},{name:'indication',label:'Clinical indication',type:'textarea',wide:true,required:true},{name:'performed_at',label:'Performed at',type:'datetime-local'},{name:'report',label:'Clinical report',type:'textarea',wide:true}] },
    care_plan: { title: 'Create care plan', resource: 'care_plans', submit: 'Create care plan', defaultStatus:'active', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'title',label:'Plan title',required:true},{name:'description',label:'Description',type:'textarea',wide:true},{name:'goals',label:'Clinical goals',type:'textarea',wide:true,required:true},{name:'start_date',label:'Start date',type:'date'},{name:'target_date',label:'Target date',type:'date'}] },
    care_plan_item: { title: 'Add care plan item', resource: 'care_plan_items', submit: 'Add plan item', defaultStatus:'pending', fields: [{name:'title',label:'Plan item',required:true},{name:'instructions',label:'Instructions',type:'textarea',wide:true},{name:'due_date',label:'Due date',type:'date'}] },
    task: { title: 'Create follow-up task', resource: 'tasks', submit: 'Create task', defaultStatus:'pending', fields: [{name:'title',label:'Task',required:true},{name:'task_type',label:'Task type',type:'select',options:['follow_up','call','review','investigation','care_plan']},{name:'priority',label:'Priority',type:'select',options:['routine','urgent','stat']},{name:'due_at',label:'Due date and time',type:'datetime-local'}] },
    financial_record: { title: 'Add bill', resource: 'financial_records', submit: 'Save bill', defaultValues:{currency:'NGN'}, fields: [{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'description',label:'Service or charge',required:true,wide:true},{name:'amount_due',label:'Amount billed',type:'number',required:true},{name:'currency',label:'Currency',type:'select',options:['NGN','USD'],required:true},{name:'notes',label:'Financial notes',type:'textarea',wide:true}] },
    financial_record_edit: { title: 'Edit bill', resource: 'financial_records', submit: 'Save bill', fields: [{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'description',label:'Service or charge',required:true,wide:true},{name:'amount_due',label:'Amount billed',type:'number',required:true},{name:'currency',label:'Currency',type:'select',options:['NGN','USD'],required:true},{name:'notes',label:'Financial notes',type:'textarea',wide:true}] },
    financial_payment: { title: 'Add payment installment', resource: 'financial_payments', submit: 'Add installment', defaultValues:{payment_date:toDateInput(new Date())}, fields: [{name:'amount',label:'Amount paid',type:'number',required:true},{name:'payment_date',label:'Date of payment',type:'date',required:true},{name:'payment_method',label:'Payment method',type:'select',options:['cash','card','bank_transfer','paystack','insurance','other']},{name:'payment_reference',label:'Payment reference'},{name:'notes',label:'Payment notes',type:'textarea',wide:true}] },
    financial_payment_edit: { title: 'Edit payment installment', resource: 'financial_payments', submit: 'Save installment', fields: [{name:'amount',label:'Amount paid',type:'number',required:true},{name:'payment_date',label:'Date of payment',type:'date',required:true},{name:'payment_method',label:'Payment method',type:'select',options:['cash','card','bank_transfer','paystack','insurance','other']},{name:'payment_reference',label:'Payment reference'},{name:'notes',label:'Payment notes',type:'textarea',wide:true}] },
    encounter_document: { title: 'Attach file to encounter', resource: 'documents', submit: 'Attach securely', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'category',label:'Category',type:'select',options:['laboratory','imaging','referral','discharge','external_record','consent','other'],required:true},{name:'title',label:'Document title',required:true},{name:'file',label:'File',type:'file',required:true},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
    note_document: { title: 'Attach file to note', resource: 'documents', submit: 'Attach securely', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'category',label:'Category',type:'select',options:['laboratory','imaging','referral','discharge','external_record','consent','other'],required:true},{name:'title',label:'Document title',required:true},{name:'file',label:'File',type:'file',required:true},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
    document: { title: 'Upload clinical document', resource: 'documents', submit: 'Upload securely', fields: [{name:'record_date',label:'Date and time of record',type:'datetime-local',placeholder:'Leave blank to use now'},{name:'encounter_id',label:'Encounter',type:'encounter'},{name:'category',label:'Category',type:'select',options:['laboratory','imaging','referral','discharge','external_record','consent','other'],required:true},{name:'title',label:'Document title',required:true},{name:'file',label:'File',type:'file',required:true},{name:'notes',label:'Notes',type:'textarea',wide:true}] },
  }
  return configs[type] || configs.note
}

function FormField({ field, value, onChange, chart }: { field: FieldDef; value: any; onChange: (value: any) => void; chart?: Chart }) {
  if (field.type === 'encounter') return <Field label={field.label} wide={field.wide}><select className="input" value={value} onChange={e => onChange(e.target.value)}><option value="">Not linked to an encounter</option>{(chart?.encounters || []).map((item: any) => <option key={item.id} value={item.id}>{item.encounter_number} · {date.format(new Date(item.created_at))}</option>)}</select></Field>
  if (field.type === 'select' || field.options) return <Field label={field.label} required={field.required} wide={field.wide}><select className="input" value={value} onChange={e => onChange(e.target.value)} required={field.required}><option value="">Select…</option>{field.options?.map(option => <option key={option} value={option}>{label(option)}</option>)}</select></Field>
  if (field.type === 'textarea') return <Field label={field.label} required={field.required} wide={field.wide}><textarea className="input min-h-28" value={value} onChange={e => onChange(e.target.value)} required={field.required} placeholder={field.placeholder} /></Field>
  if (field.type === 'file') return <Field label={field.label} required={field.required} wide={field.wide}><input className="input file:mr-4 file:rounded-full file:border-0 file:bg-green-deep file:px-4 file:py-2 file:text-sm file:font-bold file:text-white" type="file" required={field.required} onChange={e => onChange(e.target.files?.[0])} /></Field>
  return <Field label={field.label} required={field.required} wide={field.wide}><input className="input" type={field.type || 'text'} value={value} onChange={e => onChange(e.target.value)} required={field.required} step={field.type === 'number' ? 'any' : undefined} /></Field>
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-[24px] border border-green-deep/10 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,46,0.055)] sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-mid">Healthcare</p><h3 className="mt-2 text-2xl font-bold tracking-[-0.025em]">{title}</h3>{subtitle && <p className="mt-2 text-sm leading-6 text-text-mid">{subtitle}</p>}</div>{action}</div>{children}</section> }
function StatCard({ label: text, value, Icon, tone }: any) { return <article className="rounded-[20px] border border-green-deep/10 bg-white p-5 shadow-[0_8px_25px_rgba(26,61,46,0.05)]"><span className={`flex h-11 w-11 items-center justify-center rounded-[13px] ${tone}`}><Icon size={23} weight="fill" /></span><p className="mt-5 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-text-mid/70">{text}</p></article> }
function PatientActivity({ title, items, field, onPatient }: { title: string; items: any[]; field: string; onPatient: (id: string) => void }) { return <Panel title={title} subtitle={`${items.length} patient${items.length === 1 ? '' : 's'}`}><div className="mt-5 space-y-2">{items.slice(0,6).map(patient => <button key={patient.id} onClick={() => onPatient(patient.id)} className="flex w-full items-center justify-between rounded-[14px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left"><div><p className="text-xs font-bold text-green-mid">{patient.mrn}</p><p className="mt-1 font-bold">{patient.first_name} {patient.last_name}</p></div><span className="text-xs text-text-mid">{patient[field] ? date.format(new Date(patient[field])) : '—'}</span></button>)}{!items.length && <Empty text="No patient activity yet." />}</div></Panel> }
function Status({ value }: { value: string }) { const tone = value === 'active' || value === 'completed' || value === 'final' || value === 'paid' ? 'bg-emerald-50 text-emerald-700' : value === 'cancelled' || value === 'severe' || value === 'critical' ? 'bg-red-50 text-red-700' : value === 'in_progress' || value === 'reviewed' || value === 'confirmed' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'; return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>{label(value)}</span> }
function Alert({ children, tone }: { children: React.ReactNode; tone: 'error' | 'info' }) { return <div className={`mt-5 rounded-[14px] border px-4 py-3 text-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{children}</div> }
function Loading() { return <div className="flex min-h-48 items-center justify-center"><span className="h-9 w-9 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div> }
function Empty({ text }: { text: string }) { return <div className="col-span-full py-10 text-center text-sm text-text-mid"><AddressBookIcon size={32} weight="duotone" className="mx-auto mb-3 text-green-mid/60" />{text}</div> }
function Field({ label: text, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) { return <label className={`block text-sm font-bold ${wide ? 'sm:col-span-2' : ''}`}>{text}{required && <span className="text-red-500"> *</span>}<span className="mt-2 block">{children}</span></label> }
function Detail({ label: text, value }: { label: string; value?: any }) { return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-text-mid/55">{text}</dt><dd className="mt-1 break-words text-sm font-semibold">{value || 'Not recorded'}</dd></div> }
function MiniStat({ label: text, value }: { label: string; value: any }) { return <div className="rounded-[14px] bg-[#FCFFF0] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-text-mid/60">{text}</p><p className="mt-2 text-xl font-bold">{value}</p></div> }
function OverviewRow({ title, value }: { title: string; value: string }) { return <div className="rounded-[14px] border border-green-deep/10 p-4"><p className="text-xs font-bold text-green-mid">{title}</p><p className="mt-2 text-sm font-semibold">{value}</p></div> }
function SummaryAlert({ title, items, empty, warning }: { title: string; items: string[]; empty: string; warning?: boolean }) { return <div className={`rounded-[16px] border p-4 ${warning && items.length ? 'border-red-200 bg-red-50' : 'border-green-deep/10 bg-[#FCFFF0]'}`}><p className={`text-[10px] font-bold uppercase tracking-wide ${warning && items.length ? 'text-red-700' : 'text-green-mid'}`}>{title}</p><div className="mt-2 space-y-1">{items.length ? items.slice(0,3).map(item => <p key={item} className="text-sm font-bold">{item}</p>) : <p className="text-sm text-text-mid">{empty}</p>}</div></div> }
function GlobalList({ title, records, patients, onPatient, primary }: any) { return <Panel title={title} subtitle={`${records.length} record${records.length === 1 ? '' : 's'}`}><div className="mt-5 space-y-3">{records.slice(0,20).map((record: any) => <button key={record.id} onClick={() => onPatient(record.patient_id)} className="w-full rounded-[14px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left"><p className="line-clamp-2 font-bold">{primary === 'recorded_at' ? `BP ${record.systolic_bp || '—'}/${record.diastolic_bp || '—'}` : record[primary]}</p><p className="mt-1 text-xs text-text-mid">{patientName(patients, record.patient_id)}</p></button>)}{!records.length && <Empty text="No records yet." />}</div></Panel> }

function label(value?: string) { return (value || '—').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) }
function fullName(patient: Patient) { return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ') }
function patientName(patients: Patient[], id: string) { const p = patients.find(item => item.id === id); return p ? `${p.mrn} · ${fullName(p)}` : 'Patient record' }
function formatPatientAge(dob: string, today = new Date()) {
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || birth > today) return '—'

  let years = today.getFullYear() - birth.getFullYear()
  const birthdayPending = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  if (birthdayPending) years--
  if (years >= 1) return `${years} ${years === 1 ? 'year' : 'years'}`

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months--
  if (months >= 1) return `${months} ${months === 1 ? 'month' : 'months'}`

  const birthUtc = Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate())
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.floor((todayUtc - birthUtc) / 86_400_000)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}
function formatTime(value?: string) { if (!value) return 'Time not set'; const [h,m] = value.split(':').map(Number); return new Intl.DateTimeFormat('en-NG',{hour:'numeric',minute:'2-digit'}).format(new Date(2000,0,1,h,m)) }
function formatMoney(value: unknown, currency = 'NGN') { return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(Number(value || 0)) }
// Local-time YYYY-MM-DD, avoiding the UTC shift toISOString would introduce.
function toDateInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offset).toISOString().slice(0, 10)
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not an ISO
// string with a timezone, or the browser leaves the field blank.
function toDateTimeInput(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const offset = parsed.getTimezoneOffset() * 60000
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16)
}

function resourceForKind(kind: string) { return ({ encounter:'encounters',note:'notes',diagnosis:'diagnoses',allergy:'allergies',medication:'medications',investigation:'investigations',result:'results',imaging:'imaging',care_plan:'care_plans',task:'tasks' } as Record<string,string>)[kind] || kind }
function recordTitle(record: any, resource: string) { if (resource === 'encounters') return `${record.encounter_number || 'Encounter'} · ${label(record.encounter_type)}`; if (resource === 'notes') return label(record.note_type); if (resource === 'diagnoses') return record.diagnosis_name; if (resource === 'allergies') return record.allergen; if (resource === 'medications') return `${record.medication_name || 'Medication'} ${record.strength || ''}`.trim(); if (resource === 'investigations') return record.test_name; if (resource === 'results') return `${record.test_name}: ${record.result}`; if (resource === 'imaging') return `${label(record.modality)}${record.body_region ? ` · ${record.body_region}` : ''}`; if (resource === 'care_plans') return record.title; return record.title || 'Clinical record' }
function recordDetail(record: any, kind: string) { if (kind === 'encounter') return record.chief_complaint || record.clinical_assessment || 'Clinical encounter'; if (kind === 'note') return record.content; if (kind === 'diagnosis') return [record.icd10_code,record.notes].filter(Boolean).join(' · '); if (kind === 'allergy') return [record.reaction,label(record.severity)].filter(Boolean).join(' · '); if (kind === 'medication') return [record.dose,record.route,record.frequency,record.duration].filter(Boolean).join(' · '); if (kind === 'investigation') return [record.clinical_indication,label(record.priority)].filter(Boolean).join(' · '); if (kind === 'result') return [record.unit,record.reference_range,record.abnormal_flag && label(record.abnormal_flag)].filter(Boolean).join(' · '); if (kind === 'imaging') return record.report || record.indication; if (kind === 'care_plan') return record.goals || record.description; if (kind === 'task') return [label(record.task_type),record.due_at && `Due ${dateTime.format(new Date(record.due_at))}`].filter(Boolean).join(' · '); return record.notes || '' }

function escapeHtml(value: unknown) { return String(value || '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character] || character)) }
function printPrescription(patient: Patient, medication: any, prescription?: any) {
  const content = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(prescription?.prescription_number || 'FXMed prescription')}</title><style>${reportPrintCss()}body{color:#1a3d2e}.head{border-bottom:3px solid #c9e265;padding-bottom:20px;margin-bottom:30px}h1{margin:0;font-size:${printType('title')}}h2{font-size:${printType('section')}}.meta{color:#52665b;font-size:${printType('subtitle')}}.rx{font-size:${printType('glyph')};margin:28px 0 10px}.medicine{border:1px solid #d8e0db;border-radius:14px;padding:22px}.foot{margin-top:48px;border-top:1px solid #d8e0db;padding-top:18px;font-size:${printType('footer')};color:#52665b}</style></head><body><div class="head"><h1>FXMed Elite</h1><div class="meta">Confidential clinical prescription</div></div><p><strong>Patient:</strong> ${escapeHtml(fullName(patient))}<br><strong>MRN:</strong> ${escapeHtml(patient.mrn)}<br><strong>Date:</strong> ${escapeHtml(date.format(new Date(prescription?.signed_at || medication.created_at)))}</p><div class="rx">℞</div><div class="medicine"><h2>${escapeHtml(medication.medication_name)} ${escapeHtml(medication.strength)}</h2><p><strong>Dose:</strong> ${escapeHtml(medication.dose)} &nbsp; <strong>Route:</strong> ${escapeHtml(label(medication.route))}<br><strong>Frequency:</strong> ${escapeHtml(medication.frequency)} &nbsp; <strong>Duration:</strong> ${escapeHtml(medication.duration)}<br><strong>Quantity:</strong> ${escapeHtml(medication.quantity)}</p><p>${escapeHtml(medication.instructions)}</p></div><div class="foot">Prescription ${escapeHtml(prescription?.prescription_number || '')} · Electronically signed in the FXMed clinical workspace.</div><script>window.onload=()=>window.print()</script></body></html>`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/html' }))
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
