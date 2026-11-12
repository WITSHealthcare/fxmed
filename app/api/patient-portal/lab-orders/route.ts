import { NextRequest, NextResponse } from 'next/server'
import { isUuid, writeEmrAudit } from '@/lib/emr'
import { getRequestPatient, portalErrorMessage } from '@/lib/patient-portal'

// The investigation request form for a test the care team ordered for the
// signed-in patient, to take to the lab. Only the patient's own orders.
export async function GET(request: NextRequest) {
  try {
    const context = await getRequestPatient(request)
    if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
    const { database, patientId, user } = context
    const id = request.nextUrl.searchParams.get('id')
    if (!isUuid(id)) return NextResponse.json({ error: 'A valid request form is required.' }, { status: 400 })

    const { data, error } = await database.from('investigation_forms')
      .select('id,emr_patient_id,status,download_name,document_base64').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data || data.emr_patient_id !== patientId || data.status === 'cancelled' || !data.document_base64) {
      return NextResponse.json({ error: 'This request form is not available. Please message your care team.' }, { status: 404 })
    }
    await writeEmrAudit(database, user, { action: 'patient_downloaded_request_form', entityType: 'investigation_forms', entityId: id, patientId })
    return NextResponse.json({ documentBase64: data.document_base64, downloadName: data.download_name || 'fxmed-investigation-request-form.pdf' })
  } catch (error) {
    console.error('Error downloading a patient request form:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}
