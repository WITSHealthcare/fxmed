'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardTextIcon, EyeIcon, PhoneCallIcon, PlusCircleIcon, XIcon } from '@phosphor-icons/react'

interface HealthAnalysisSubmission {
  id: string
  patientName: string
  email: string
  phone: string
  age: string
  gender: string
  primaryConcern: string
  symptoms: string[]
  duration: string
  severity: string
  submittedAt: string
  // Sections 3 to 5 of the public form. Every field is optional because the
  // form only enforces personal details and health concerns.
  lifestyle: { diet: string; exercise: string; sleep: string; stress: string }
  medicalHistory: { medications: string; supplements: string; conditions: string; surgeries: string }
  goals: { primaryGoal: string; timeline: string; expectations: string }
  // How far the visitor got after submitting. Absent on rows written before
  // progress tracking existed.
  progress: Record<string, string> | null
  testRecommendations: {
    category: string
    tests: {
      name: string
      description: string
      whyImportant: string
    }[]
  }[]
  status: 'new' | 'reviewed' | 'contacted' | 'completed'
}

// The steps a visitor moves through after submitting the form, in order.
const FUNNEL_STEPS: Array<{ key: string; label: string }> = [
  { key: 'form_submitted_at', label: 'Completed the form' },
  { key: 'investigations_viewed_at', label: 'Viewed recommended investigations' },
  { key: 'request_downloaded_at', label: 'Downloaded the investigation request' },
  { key: 'payment_started_at', label: 'Opened the payment page' },
]


// The public form leaves any of these blank, and a blank answer is itself worth
// seeing, so empty fields are shown as "Not provided" rather than hidden.
function DetailSection({ title, fields }: { title: string; fields: Array<[string, string]> }) {
  return (
    <div className="mb-8">
      <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-4">{title}</h3>
      <div className="bg-cream rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(([label, value]) => (
          <div key={label}>
            <p className="text-sm text-text-mid font-dm-sans">{label}</p>
            <p className={`font-dm-sans whitespace-pre-wrap ${value ? 'font-medium text-gray-900' : 'text-gray-400 italic'}`}>
              {value || 'Not provided'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

type EmrPatient = { id: string; mrn: string; first_name: string; last_name: string; email?: string | null; phone?: string | null; date_of_birth?: string | null }

// The form offers male/female/other/prefer-not-to-say; the chart records a
// clinical sex. Anything not clearly male or female becomes 'unknown' for a
// clinician to correct, rather than being guessed at.
const sexFromGender = (gender: string) => {
  const value = gender.trim().toLowerCase()
  if (value === 'male' || value === 'female') return value
  if (value === 'intersex') return 'intersex'
  return 'unknown'
}

// Digits only, so "+234 803 123 4567" and "08031234567" compare equal.
const phoneKey = (value?: string | null) => (value || '').replace(/\D/g, '').slice(-10)

function LinkPatientModal({ submission, onClose, onLinked }: {
  submission: HealthAnalysisSubmission
  onClose: () => void
  onLinked: (patient: EmrPatient) => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<EmrPatient[]>([])
  const [matches, setMatches] = useState<EmrPatient[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: submission.patientName.split(' ')[0] || '',
    last_name: submission.patientName.split(' ').slice(1).join(' ') || '',
    email: submission.email,
    phone: submission.phone,
    date_of_birth: '',
    sex: sexFromGender(submission.gender),
  })

  const lookup = useCallback(async (term: string) => {
    if (!term.trim()) return [] as EmrPatient[]
    const response = await fetch(`/api/admin/emr?resource=patients&pageSize=20&search=${encodeURIComponent(term.trim())}`)
    if (!response.ok) return [] as EmrPatient[]
    const result = await response.json()
    return (result.patients || []) as EmrPatient[]
  }, [])

  // Surface likely existing records up front, so the same person is not
  // registered twice by someone who did not think to search first.
  useEffect(() => {
    let cancelled = false
    Promise.all([lookup(submission.email), lookup(submission.phone)]).then(([byEmail, byPhone]) => {
      if (cancelled) return
      const wanted = phoneKey(submission.phone)
      const likely = [...byEmail, ...byPhone].filter(patient =>
        (submission.email && patient.email?.toLowerCase() === submission.email.toLowerCase()) ||
        (wanted.length >= 7 && phoneKey(patient.phone) === wanted))
      setMatches(Array.from(new Map(likely.map(patient => [patient.id, patient])).values()))
    })
    return () => { cancelled = true }
  }, [lookup, submission.email, submission.phone])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => { lookup(search).then(found => { if (!cancelled) setResults(found) }) }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search, lookup])

  const link = async (patient: EmrPatient) => {
    setBusy(true); setError('')
    const response = await fetch('/api/admin/emr', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'assessments', id: submission.id, patient_id: patient.id }),
    })
    setBusy(false)
    if (!response.ok) return setError('Could not link this submission to the patient.')
    onLinked(patient)
  }

  const createAndLink = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return setError('First and last name are required.')
    if (!form.date_of_birth) return setError('Date of birth is required to add someone to the patient registry.')

    setBusy(true); setError('')
    // The route reads `resource` from the body, not the query string.
    const response = await fetch('/api/admin/emr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'patients', ...form }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setBusy(false); return setError(result.error || 'Could not create the patient.') }
    setBusy(false)
    await link(result.record as EmrPatient)
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm focus:border-green-deep focus:outline-none'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[20px] bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-green-deep/10 bg-white px-6 py-5">
          <div>
            <h3 className="font-dm-sans text-xl font-bold text-green-deep">Link to a patient</h3>
            <p className="mt-1 font-dm-sans text-sm text-text-mid">
              {submission.patientName} · {submission.email || 'no email'} · {submission.phone || 'no phone'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><XIcon size={22} /></button>
        </div>

        <div className="p-6">
          {matches.length > 0 && mode === 'existing' && (
            <div className="mb-5 rounded-lg border border-gold/40 bg-gold/10 p-4">
              <p className="font-dm-sans text-xs font-bold uppercase tracking-wide text-green-deep">
                Already in the registry
              </p>
              <p className="mt-1 font-dm-sans text-xs text-text-mid">
                Matched on the email or phone number given on this submission.
              </p>
              <div className="mt-3 space-y-2">
                {matches.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3">
                    <div className="min-w-0">
                      <p className="font-dm-sans text-sm font-semibold text-green-deep">{patient.first_name} {patient.last_name}</p>
                      <p className="font-dm-sans text-xs text-text-mid">{patient.mrn} · {patient.email || patient.phone || 'no contact'}</p>
                    </div>
                    <button disabled={busy} onClick={() => void link(patient)} className="rounded-lg bg-green-deep px-3 py-2 font-dm-sans text-xs font-semibold text-white disabled:opacity-50">
                      Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5 flex gap-2">
            <button onClick={() => { setMode('existing'); setError('') }} className={`rounded-full px-4 py-2 font-dm-sans text-sm font-medium ${mode === 'existing' ? 'bg-green-deep text-white' : 'bg-gray-100 text-gray-700'}`}>
              Existing patient
            </button>
            <button onClick={() => { setMode('new'); setError('') }} className={`rounded-full px-4 py-2 font-dm-sans text-sm font-medium ${mode === 'new' ? 'bg-green-deep text-white' : 'bg-gray-100 text-gray-700'}`}>
              Add to patient registry
            </button>
          </div>

          {mode === 'existing' ? (
            <div>
              <label className="block font-dm-sans text-sm font-semibold text-green-deep">
                Search the registry
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, MRN, email or phone" className={inputClass} />
              </label>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {results.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between gap-3 rounded-lg border border-green-deep/10 p-3">
                    <div className="min-w-0">
                      <p className="font-dm-sans text-sm font-semibold text-green-deep">{patient.first_name} {patient.last_name}</p>
                      <p className="font-dm-sans text-xs text-text-mid">{patient.mrn} · {patient.email || patient.phone || 'no contact'}</p>
                    </div>
                    <button disabled={busy} onClick={() => void link(patient)} className="rounded-lg bg-green-deep px-3 py-2 font-dm-sans text-xs font-semibold text-white disabled:opacity-50">
                      Link
                    </button>
                  </div>
                ))}
                {search.trim() && !results.length && (
                  <p className="py-3 font-dm-sans text-sm text-text-mid">
                    No patient matches that. Use &ldquo;Add to patient registry&rdquo; to create one from this submission.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-4 font-dm-sans text-sm text-text-mid">
                Prefilled from the submission. Date of birth is not collected by the public form, so it must be confirmed
                with the patient before they are added to the registry.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block font-dm-sans text-sm font-semibold text-green-deep">First name
                  <input value={form.first_name} onChange={event => setForm({ ...form, first_name: event.target.value })} className={inputClass} />
                </label>
                <label className="block font-dm-sans text-sm font-semibold text-green-deep">Last name
                  <input value={form.last_name} onChange={event => setForm({ ...form, last_name: event.target.value })} className={inputClass} />
                </label>
                <label className="block font-dm-sans text-sm font-semibold text-green-deep">Email
                  <input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className={inputClass} />
                </label>
                <label className="block font-dm-sans text-sm font-semibold text-green-deep">Phone
                  <input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} className={inputClass} />
                </label>
                <label className="block font-dm-sans text-sm font-semibold text-green-deep">
                  Date of birth <span className="text-red-600">*</span>
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={event => setForm({ ...form, date_of_birth: event.target.value })} className={inputClass} />
                  {submission.age && (
                    <span className="mt-1 block font-dm-sans text-xs font-normal text-text-mid">
                      Gave their age as {submission.age} on the form.
                    </span>
                  )}
                </label>
                <label className="block font-dm-sans text-sm font-semibold text-green-deep">Sex
                  <select value={form.sex} onChange={event => setForm({ ...form, sex: event.target.value })} className={inputClass}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="intersex">Intersex</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  {submission.gender && (
                    <span className="mt-1 block font-dm-sans text-xs font-normal text-text-mid">
                      Gave their gender as &ldquo;{submission.gender}&rdquo;.
                    </span>
                  )}
                </label>
              </div>
              <button disabled={busy} onClick={() => void createAndLink()} className="mt-5 w-full rounded-lg bg-gold px-6 py-3 font-dm-sans font-bold text-green-deep disabled:opacity-50">
                {busy ? 'Adding…' : 'Add patient and link submission'}
              </button>
            </div>
          )}

          {error && <p role="alert" className="mt-4 font-dm-sans text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}

interface FunctionalHealthAnalysisProps {
  submissions?: HealthAnalysisSubmission[]
}

export default function FunctionalHealthAnalysis({ submissions = [] }: FunctionalHealthAnalysisProps) {
  const [submissionsList, setSubmissionsList] = useState<HealthAnalysisSubmission[]>(submissions)
  const [selectedSubmission, setSelectedSubmission] = useState<HealthAnalysisSubmission | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'reviewed' | 'contacted' | 'completed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  // Which submission the link-patient modal is open for, and the patients that
  // have been linked in this session, so the card can show it immediately.
  const [linking, setLinking] = useState<HealthAnalysisSubmission | null>(null)
  const [linked, setLinked] = useState<Record<string, EmrPatient>>({})

  useEffect(() => {
    fetch('/api/admin/emr?resource=assessments').then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setSubmissionsList((result.records || []).map((record: any) => {
        const details = record.assessment_data || {}
        const personal = details.personalInfo || {}
        const concerns = details.healthConcerns || {}
        const lifestyle = details.lifestyle || {}
        const history = details.medicalHistory || {}
        const goals = details.goals || {}
        return {
          id: record.id,
          patientName: [personal.firstName, personal.lastName].filter(Boolean).join(' ') || 'Unknown patient',
          email: personal.email || '', phone: personal.phone || '', age: personal.age || '', gender: personal.gender || '',
          primaryConcern: concerns.primaryConcern || 'Not provided', symptoms: concerns.symptoms || [], duration: concerns.duration || '', severity: concerns.severity || '',
          lifestyle: {
            diet: lifestyle.diet || '', exercise: lifestyle.exercise || '',
            sleep: lifestyle.sleep || '', stress: lifestyle.stress || '',
          },
          medicalHistory: {
            medications: history.medications || '', supplements: history.supplements || '',
            conditions: history.conditions || '', surgeries: history.surgeries || '',
          },
          goals: {
            primaryGoal: goals.primaryGoal || '', timeline: goals.timeline || '', expectations: goals.expectations || '',
          },
          // The form submission itself is the first step, so it is always set.
          progress: { form_submitted_at: record.submitted_at, ...(record.progress || {}) },
          submittedAt: record.submitted_at, testRecommendations: record.recommendations || [], status: record.status,
        }
      }))
    }).catch(error => console.error('Unable to load health analysis submissions:', error))
  }, [])

  // Filter submissions based on status and search term
  const filteredSubmissions = submissionsList.filter(submission => {
    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus
    const matchesSearch = searchTerm === '' || 
      submission.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.primaryConcern.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-green-100 text-green-deep'
      case 'reviewed':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const updateSubmissionStatus = async (id: string, newStatus: HealthAnalysisSubmission['status']) => {
    const response = await fetch('/api/admin/emr', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'assessments', id, status: newStatus }) })
    if (response.ok) setSubmissionsList(prev => prev.map(sub => sub.id === id ? { ...sub, status: newStatus } : sub))
  }


  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-deep/8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-mid font-dm-sans">Total Submissions</p>
              <p className="text-2xl font-bold text-green-deep font-dm-sans">{submissionsList.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-deep/10 rounded-lg flex items-center justify-center">
              <ClipboardTextIcon size={24} weight="duotone" className="text-green-deep" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-green-deep/8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-mid font-dm-sans">New</p>
              <p className="text-2xl font-bold text-green-deep font-dm-sans">
                {submissionsList.filter(s => s.status === 'new').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <PlusCircleIcon size={24} weight="duotone" className="text-green-mid" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-green-deep/8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-mid font-dm-sans">Reviewed</p>
              <p className="text-2xl font-bold text-green-deep font-dm-sans">
                {submissionsList.filter(s => s.status === 'reviewed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <EyeIcon size={24} weight="duotone" className="text-blue-700" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-green-deep/8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-mid font-dm-sans">Contacted</p>
              <p className="text-2xl font-bold text-green-deep font-dm-sans">
                {submissionsList.filter(s => s.status === 'contacted').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <PhoneCallIcon size={24} weight="duotone" className="text-amber-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg p-4 border border-green-deep/8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or concern..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-green-deep/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-mid focus:border-transparent font-dm-sans"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'new', 'reviewed', 'contacted', 'completed'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-dm-sans text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-green-deep text-white'
                    : 'bg-gray-100 text-text-mid hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg border border-green-deep/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-deep/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-deep uppercase tracking-wider font-dm-sans">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-deep uppercase tracking-wider font-dm-sans">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-deep uppercase tracking-wider font-dm-sans">
                  Primary Concern
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-deep uppercase tracking-wider font-dm-sans">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-deep uppercase tracking-wider font-dm-sans">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-deep uppercase tracking-wider font-dm-sans">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 font-dm-sans">
                        {submission.patientName}
                      </div>
                      <div className="text-sm text-gray-500 font-dm-sans">
                        {submission.age} • {submission.gender}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-dm-sans">{submission.email}</div>
                    <div className="text-sm text-gray-500 font-dm-sans">{submission.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-dm-sans max-w-xs truncate">
                      {submission.primaryConcern}
                    </div>
                    <div className="text-xs text-gray-500 font-dm-sans">
                      {submission.symptoms.length} symptoms
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-dm-sans">
                    {formatDate(submission.submittedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-dm-sans ${getStatusColor(submission.status)}`}>
                      {submission.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedSubmission(submission)}
                      className="text-green-mid hover:text-green-deep font-dm-sans mr-3"
                    >
                      View Details
                    </button>
                    <select
                      value={submission.status}
                      onChange={(e) => updateSubmissionStatus(submission.id, e.target.value as HealthAnalysisSubmission['status'])}
                      className="text-sm border border-gray-300 rounded px-2 py-1 font-dm-sans"
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="contacted">Contacted</option>
                      <option value="completed">Completed</option>
                    </select>
                    <div className="mt-2">
                      {linked[submission.id] ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-deep/10 px-3 py-1 text-xs font-semibold text-green-deep">
                          Linked to {linked[submission.id].first_name} {linked[submission.id].last_name} · {linked[submission.id].mrn}
                        </span>
                      ) : (
                        <button onClick={() => setLinking(submission)} className="rounded bg-green-deep px-3 py-1.5 text-xs font-semibold text-white">
                          Link patient…
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {linking && (
        <LinkPatientModal
          submission={linking}
          onClose={() => setLinking(null)}
          onLinked={patient => {
            setLinked(current => ({ ...current, [linking.id]: patient }))
            setLinking(null)
          }}
        />
      )}

      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Close Button */}
            <button
              onClick={() => setSelectedSubmission(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <XIcon size={24} weight="bold" />
            </button>

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-deep to-green-mid p-8 rounded-t-[24px]">
              <h2 className="font-dm-sans font-bold text-white text-2xl mb-2">
                Functional Health Analysis Details
              </h2>
              <p className="font-dm-sans text-cream/90">
                Submission ID: {selectedSubmission.id}
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              {/* Patient Information */}
              <div className="mb-8">
                <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-4">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-cream rounded-lg p-4">
                  <div>
                    <p className="text-sm text-text-mid font-dm-sans">Name</p>
                    <p className="font-medium text-gray-900 font-dm-sans">{selectedSubmission.patientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-mid font-dm-sans">Age/Gender</p>
                    <p className="font-medium text-gray-900 font-dm-sans">{selectedSubmission.age} • {selectedSubmission.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-mid font-dm-sans">Email</p>
                    <p className="font-medium text-gray-900 font-dm-sans">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-mid font-dm-sans">Phone</p>
                    <p className="font-medium text-gray-900 font-dm-sans">{selectedSubmission.phone}</p>
                  </div>
                </div>
              </div>

              {/* Health Concerns */}
              <div className="mb-8">
                <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-4">Health Concerns</h3>
                <div className="bg-cream rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-text-mid font-dm-sans">Primary Concern</p>
                    <p className="font-medium text-gray-900 font-dm-sans">{selectedSubmission.primaryConcern}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-mid font-dm-sans">Symptoms</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedSubmission.symptoms.map((symptom, index) => (
                        <span key={index} className="bg-white px-3 py-1 rounded-full text-sm font-dm-sans border border-green-deep/20">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-mid font-dm-sans">Duration</p>
                      <p className="font-medium text-gray-900 font-dm-sans">{selectedSubmission.duration}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-mid font-dm-sans">Severity</p>
                      <p className="font-medium text-gray-900 font-dm-sans">{selectedSubmission.severity}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifestyle */}
              <DetailSection
                title="Lifestyle"
                fields={[
                  ['Diet', selectedSubmission.lifestyle.diet],
                  ['Exercise', selectedSubmission.lifestyle.exercise],
                  ['Sleep', selectedSubmission.lifestyle.sleep],
                  ['Stress', selectedSubmission.lifestyle.stress],
                ]}
              />

              {/* Medical History */}
              <DetailSection
                title="Medical History"
                fields={[
                  ['Current medications', selectedSubmission.medicalHistory.medications],
                  ['Supplements', selectedSubmission.medicalHistory.supplements],
                  ['Existing conditions', selectedSubmission.medicalHistory.conditions],
                  ['Past surgeries', selectedSubmission.medicalHistory.surgeries],
                ]}
              />

              {/* Health Goals */}
              <DetailSection
                title="Health Goals"
                fields={[
                  ['Primary goal', selectedSubmission.goals.primaryGoal],
                  ['Timeline', selectedSubmission.goals.timeline],
                  ['Expectations', selectedSubmission.goals.expectations],
                ]}
              />

              {/* Progress through the funnel */}
              <div className="mb-8">
                <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-4">Progress</h3>
                <div className="space-y-2">
                  {FUNNEL_STEPS.map(step => {
                    const at = selectedSubmission.progress?.[step.key]
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          at ? 'border-green-deep/20 bg-cream' : 'border-dashed border-gray-200 bg-white'
                        }`}
                      >
                        <span className={`font-dm-sans text-sm ${at ? 'font-semibold text-green-deep' : 'text-gray-400'}`}>
                          {at ? '✓' : '○'} {step.label}
                        </span>
                        <span className="font-dm-sans text-xs text-text-mid">
                          {at ? formatDate(at) : 'Not reached'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 font-dm-sans text-xs leading-5 text-text-mid">
                  Payment is taken on an external Paystack page, so opening it is the last step that can be recorded here.
                  It does not confirm that payment was made.
                </p>
              </div>

              {/* Test Recommendations */}
              <div className="mb-8">
                <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-4">Test Recommendations</h3>
                <div className="space-y-4">
                  {selectedSubmission.testRecommendations.map((category, index) => (
                    <div key={index} className="bg-cream rounded-lg p-4">
                      <h4 className="font-semibold text-green-deep mb-3 font-dm-sans">{category.category}</h4>
                      <div className="space-y-3">
                        {category.tests.map((test, testIndex) => (
                          <div key={testIndex} className="bg-white rounded-lg p-3 border border-green-deep/10">
                            <h5 className="font-medium text-gray-900 font-dm-sans mb-1">{test.name}</h5>
                            <p className="text-sm text-gray-600 font-dm-sans mb-2">{test.description}</p>
                            <p className="text-sm text-text-mid font-dm-sans italic">Why important: {test.whyImportant}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    updateSubmissionStatus(selectedSubmission.id, 'contacted')
                    setSelectedSubmission(null)
                  }}
                  className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block text-center flex-1"
                >
                  Mark as Contacted
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="font-dm-sans bg-transparent text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] border border-green-deep/40 transition-all hover:border-green-deep hover:bg-green-deep/8 inline-block text-center flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
