'use client'

import { useState, useEffect } from 'react'
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

interface FunctionalHealthAnalysisProps {
  submissions?: HealthAnalysisSubmission[]
}

export default function FunctionalHealthAnalysis({ submissions = [] }: FunctionalHealthAnalysisProps) {
  const [submissionsList, setSubmissionsList] = useState<HealthAnalysisSubmission[]>(submissions)
  const [selectedSubmission, setSelectedSubmission] = useState<HealthAnalysisSubmission | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'reviewed' | 'contacted' | 'completed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Array<{ id: string; mrn: string; first_name: string; last_name: string }>>([])
  const [patientLinks, setPatientLinks] = useState<Record<string,string>>({})

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

  useEffect(() => { fetch('/api/admin/emr?resource=patients&pageSize=100').then(response => response.json()).then(result => setPatients(result.patients || [])).catch(() => {}) }, [])

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

  const linkPatient = async (id: string) => {
    const patientId = patientLinks[id]
    if (!patientId) return
    await fetch('/api/admin/emr', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'assessments', id, patient_id: patientId }) })
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
                    <div className="mt-2 flex gap-1"><select value={patientLinks[submission.id] || ''} onChange={(e) => setPatientLinks(current => ({ ...current, [submission.id]: e.target.value }))} className="max-w-44 rounded border border-gray-300 px-2 py-1 text-xs"><option value="">Link patient…</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.mrn} · {patient.first_name} {patient.last_name}</option>)}</select><button onClick={() => linkPatient(submission.id)} className="rounded bg-green-deep px-2 py-1 text-xs text-white">Link</button></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
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
