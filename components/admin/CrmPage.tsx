'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import CrmDashboard, { type Patient, type Risk } from '@/components/admin/CrmDashboard'
import { useAdminRole } from '@/components/admin/shell/AdminShell'
import { Alert, Spinner, useFeedback } from '@/components/admin/ui'
import { adminRolePermissions, type CrmAccess } from '@/lib/admin-auth'

const blankLead = { name: '', phone: '', email: '', source: 'Website Lead', specifySource: '', program: 'Cardiometabolic Care', owner: 'Tola', risk: 'Medium' as Risk, consent: false }
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

// The CRM route: loads the lead list and switches between the clinical and
// financial views, which are kept in the URL (?view=financial).
export default function CrmPage() {
  const role = useAdminRole()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useFeedback()
  const views = adminRolePermissions[role].crmViews
  const requested = searchParams.get('view') as CrmAccess | null
  const crmView = requested && views.includes(requested) ? requested : views[0]

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadForm, setLeadForm] = useState(blankLead)

  const loadPatients = useCallback(async () => {
    try {
      const response = await fetch('/api/crm')
      if (!response.ok) throw new Error('Failed to fetch patients')
      const { patients: data } = await response.json()
      setPatients(data || [])
      setError('')
    } catch (problem) {
      console.error('Error fetching patients:', problem)
      setError('The CRM list could not be loaded. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadPatients() }, [loadPatients])

  const createLead = async () => {
    if (!leadForm.name.trim()) return
    const specificSource = leadForm.specifySource.trim()
    try {
      const response = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name,
          phone: leadForm.phone || null,
          email: leadForm.email || null,
          source: leadForm.source,
          specify_source: leadForm.specifySource || null,
          program: leadForm.program,
          owner: leadForm.owner,
          risk: leadForm.risk,
          stage: 'Outreach',
          last_touch: new Date().toISOString(),
          next_step: 'Initial outreach and qualification',
          // First outreach is due the day the lead comes in.
          next_date: shortDate.format(new Date()),
          progress: 10,
          tags: ['New lead', ...(specificSource ? [`Specific Source: ${specificSource}`] : [])],
          preferred: leadForm.phone ? 'Phone' : 'Email',
          appointment: 'Not scheduled',
          consent_status: leadForm.consent ? 'Sent' : 'Pending',
          document_count: 0,
          reminder_status: 'Queued',
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create lead')
      }
      await loadPatients()
      setShowLeadModal(false)
      setLeadForm(blankLead)
      toast('Lead created.')
    } catch (problem) {
      console.error('Error creating lead:', problem)
      toast('The lead could not be created. Please try again.', 'error')
    }
  }

  const setView = (view: CrmAccess) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {views.length > 1 && (
        <div role="tablist" aria-label="CRM view" className="inline-flex items-center rounded-full border border-green-deep/10 bg-white p-1">
          {views.map((view) => (
            <button key={view} role="tab" aria-selected={crmView === view} onClick={() => setView(view)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${crmView === view ? 'bg-green-deep text-white shadow-sm' : 'text-gray-700 hover:text-green-deep'}`}>
              {view === 'clinical' ? 'Clinical CRM' : 'Financial CRM'}
            </button>
          ))}
        </div>
      )}
      <Alert>{error}</Alert>
      {loading ? <Spinner /> : (
        <CrmDashboard
          patients={patients}
          setPatients={setPatients}
          crmView={crmView}
          showLeadModal={showLeadModal}
          setShowLeadModal={setShowLeadModal}
          leadForm={leadForm}
          setLeadForm={setLeadForm}
          createLead={createLead}
        />
      )}
    </div>
  )
}
