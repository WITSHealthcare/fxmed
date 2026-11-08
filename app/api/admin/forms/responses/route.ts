import { NextRequest, NextResponse } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'
import { formsErrorMessage } from '@/lib/forms-server'
import type { StoredFormResponse } from '@/lib/forms-types'
import { getTrainingDatabase as getFormsDatabase } from '@/lib/training'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Every response to one form, with a readable name for each respondent.
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const database = getFormsDatabase(); const formId = new URL(request.url).searchParams.get('formId') || ''
    if (getUserAdminRole(user) !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    if (!uuid.test(formId)) return NextResponse.json({ error: 'A valid form is required.' }, { status: 400 })
    const { data, error } = await database.from('form_responses').select('*').eq('form_id', formId).order('submitted_at', { ascending: false }).limit(5000)
    if (error) throw error
    const responses = (data || []) as StoredFormResponse[]

    const staffNames = new Map<string, string>()
    if (responses.some((response) => response.respondent_type === 'staff')) {
      const { data: listed, error: listError } = await database.auth.admin.listUsers({ perPage: 1000 })
      if (listError) console.error('Form responses: could not list staff:', listError.message)
      for (const member of listed?.users || []) staffNames.set(member.id, member.user_metadata?.full_name || member.email || 'Staff member')
    }
    const patientIds = Array.from(new Set(responses.map((response) => response.patient_id).filter((id): id is string => !!id)))
    const patientNames = new Map<string, string>()
    if (patientIds.length) {
      const { data: patients } = await database.from('emr_patients').select('id,first_name,last_name,mrn').in('id', patientIds)
      for (const patient of patients || []) patientNames.set(patient.id, [patient.first_name, patient.last_name].filter(Boolean).join(' ') + (patient.mrn ? ` (${patient.mrn})` : ''))
    }

    return NextResponse.json({ responses: responses.map((response) => ({
      ...response,
      respondent: response.respondent_type === 'staff' ? staffNames.get(response.user_id || '') || 'Former staff member'
        : response.respondent_type === 'patient' ? patientNames.get(response.patient_id || '') || 'Patient'
        : response.contact_name || response.contact_email || response.contact_phone || 'Anonymous',
    })) })
  } catch (error) { console.error('Error loading form responses:', error); return NextResponse.json({ error: formsErrorMessage(error, 'Failed to load responses.') }, { status: 500 }) }
}
