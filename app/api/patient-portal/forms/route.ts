import { NextRequest, NextResponse } from 'next/server'
import { formsErrorMessage, getPatientEmail, patientCanFill, publicForm } from '@/lib/forms-server'
import type { FormRecord } from '@/lib/forms-types'
import { getRequestPatient } from '@/lib/patient-portal'

// The published patient forms shared with the signed-in patient, with their latest response to each.
export async function GET(request: NextRequest) {
  try {
    const context = await getRequestPatient(request)
    if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
    const { database, patientId, user } = context
    const { data, error } = await database.from('forms').select('*').eq('audience', 'patients').eq('status', 'published').order('updated_at', { ascending: false })
    if (error) throw error
    const email = await getPatientEmail(database, patientId, user)
    const forms = ((data || []) as FormRecord[]).filter((form) => patientCanFill(form, email))
    const { data: responses, error: responsesError } = forms.length
      ? await database.from('form_responses').select('form_id,answers,score,passed,submitted_at').eq('patient_id', patientId).in('form_id', forms.map((form) => form.id)).order('submitted_at', { ascending: false })
      : { data: [], error: null }
    if (responsesError) throw responsesError
    return NextResponse.json({ forms: forms.map((form) => ({ ...publicForm(form), my_response: (responses || []).find((response) => response.form_id === form.id) || null })) })
  } catch (error) {
    console.error('Error loading patient forms:', error)
    return NextResponse.json({ error: formsErrorMessage(error, 'Your forms could not be loaded.') }, { status: 500 })
  }
}
