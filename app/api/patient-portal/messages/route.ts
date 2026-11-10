import { NextRequest, NextResponse } from 'next/server'
import { cleanText, writeEmrAudit } from '@/lib/emr'
import { getRequestPatient, portalErrorMessage } from '@/lib/patient-portal'
import { checkRateLimit } from '@/lib/request-security'

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestPatient(request)
    if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
    const limit = checkRateLimit(request, 'patient-portal-message', 20, 10 * 60 * 1000)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many messages. Please wait a few minutes.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

    const { database, patientId, user } = context
    const body = await request.json().catch(() => null) as { body?: unknown } | null
    const text = cleanText(body?.body, 4000)
    if (!text) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 })

    const { data: patient } = await database.from('emr_patients').select('first_name,last_name').eq('id', patientId).single()
    const { data, error } = await database.from('patient_portal_messages').insert({
      patient_id: patientId,
      sender: 'patient',
      sender_user_id: user.id,
      sender_name: patient ? `${patient.first_name} ${patient.last_name}` : null,
      body: text,
    }).select('id,sender,sender_name,body,status,created_at').single()
    if (error) throw error
    await writeEmrAudit(database, user, { action: 'patient_sent_message', entityType: 'patient_portal_messages', entityId: data.id, patientId })
    return NextResponse.json({ message: data }, { status: 201 })
  } catch (error) {
    console.error('Error sending patient portal message:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}
