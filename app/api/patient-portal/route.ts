import { NextRequest, NextResponse } from 'next/server'
import { isUuid, writeEmrAudit } from '@/lib/emr'
import { getRequestPatient, portalDocumentColumns, portalErrorMessage, portalPatientColumns } from '@/lib/patient-portal'

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestPatient(request)
    if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
    const { database, patientId, account } = context

    const [patient, carePlans, documents, messages, notifications] = await Promise.all([
      database.from('emr_patients').select(portalPatientColumns).eq('id', patientId).single(),
      database.from('emr_care_plans')
        .select('id,title,description,goals,status,start_date,target_date,shared_at,created_at,items:emr_care_plan_items(id,title,instructions,due_date,status,position,completed_at,completed_by_patient)')
        .eq('patient_id', patientId).eq('shared_with_patient', true).neq('status', 'draft')
        .order('created_at', { ascending: false }),
      database.from('emr_documents').select(portalDocumentColumns)
        .eq('patient_id', patientId).or('shared_with_patient.eq.true,source.eq.patient')
        .order('created_at', { ascending: false }),
      database.from('patient_portal_messages').select('id,sender,sender_name,body,status,created_at')
        .eq('patient_id', patientId).order('created_at', { ascending: true }).limit(200),
      database.from('patient_portal_notifications').select('id,kind,title,detail,section,read_at,created_at')
        .eq('patient_id', patientId).order('created_at', { ascending: false }).limit(50),
    ])
    const error = patient.error || carePlans.error || documents.error || messages.error || notifications.error
    if (error) throw error

    await database.from('patient_portal_accounts').update({ last_seen_at: new Date().toISOString() }).eq('id', account.id)
    return NextResponse.json({
      account: { status: account.status, activated_at: account.activated_at },
      patient: patient.data,
      carePlans: (carePlans.data || []).map((plan: any) => ({
        ...plan,
        items: [...(plan.items || [])].filter((item: any) => item.status !== 'cancelled').sort((a: any, b: any) => a.position - b.position),
      })),
      documents: documents.data || [],
      messages: messages.data || [],
      notifications: notifications.data || [],
    })
  } catch (error) {
    console.error('Error loading patient portal:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestPatient(request)
    if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
    const { database, patientId, account, user } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const now = new Date().toISOString()

    switch (body?.action) {
      case 'activate': {
        if (account.status !== 'active') {
          const { error } = await database.from('patient_portal_accounts').update({ status: 'active', activated_at: account.activated_at || now }).eq('id', account.id)
          if (error) throw error
          await writeEmrAudit(database, user, { action: 'activate_patient_portal', entityType: 'patient_portal_account', entityId: account.id, patientId })
        }
        return NextResponse.json({ ok: true })
      }
      case 'read_notifications': {
        const { error } = await database.from('patient_portal_notifications').update({ read_at: now }).eq('patient_id', patientId).is('read_at', null)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'read_messages': {
        const { error } = await database.from('patient_portal_messages').update({ status: 'read', read_at: now })
          .eq('patient_id', patientId).eq('sender', 'clinic').eq('status', 'unread')
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'care_item': {
        if (!isUuid(body.id)) return NextResponse.json({ error: 'A valid care plan step is required.' }, { status: 400 })
        // The step must sit in a plan this patient has been given.
        const { data: item, error: itemError } = await database.from('emr_care_plan_items')
          .select('id,status,care_plan:emr_care_plans!inner(patient_id,shared_with_patient,status)')
          .eq('id', body.id).single()
        const plan = (item as any)?.care_plan
        if (itemError || !plan || plan.patient_id !== patientId || !plan.shared_with_patient || plan.status === 'draft') {
          return NextResponse.json({ error: 'Care plan step not found.' }, { status: 404 })
        }
        if (item!.status === 'cancelled') return NextResponse.json({ error: 'This step was cancelled by your care team.' }, { status: 409 })
        const done = body.done === true
        const { data, error } = await database.from('emr_care_plan_items')
          .update(done
            ? { status: 'completed', completed_at: now, completed_by_patient: true }
            : { status: 'pending', completed_at: null, completed_by_patient: false })
          .eq('id', item!.id).select('id,status,completed_at,completed_by_patient').single()
        if (error) throw error
        await writeEmrAudit(database, user, { action: done ? 'patient_completed_care_step' : 'patient_reopened_care_step', entityType: 'emr_care_plan_items', entityId: item!.id, patientId })
        return NextResponse.json({ item: data })
      }
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating patient portal:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}
