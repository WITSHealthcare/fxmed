import { NextRequest, NextResponse } from 'next/server'
import {
  calculateBmi,
  cleanDate,
  cleanNumber,
  cleanText,
  emrErrorMessage,
  getEmrContext,
  isUuid,
  type EmrPermission,
  writeEmrAudit,
} from '@/lib/emr'

export const runtime = 'nodejs'

const resources = {
  encounters: { table: 'emr_encounters', permission: 'create_encounters', patientField: 'patient_id', orderField: 'created_at' },
  notes: { table: 'emr_clinical_notes', permission: 'create_notes', patientField: 'patient_id', orderField: 'created_at' },
  vitals: { table: 'emr_vitals', permission: 'record_vitals', patientField: 'patient_id', orderField: 'recorded_at' },
  diagnoses: { table: 'emr_diagnoses', permission: 'manage_diagnoses', patientField: 'patient_id', orderField: 'diagnosed_at' },
  allergies: { table: 'emr_allergies', permission: 'manage_allergies', patientField: 'patient_id', orderField: 'created_at' },
  medications: { table: 'emr_medications', permission: 'prescribe_medication', patientField: 'patient_id', orderField: 'created_at' },
  investigations: { table: 'emr_investigation_orders', permission: 'order_investigations', patientField: 'patient_id', orderField: 'ordered_at' },
  results: { table: 'emr_investigation_results', permission: 'record_results', patientField: 'patient_id', orderField: 'result_date' },
  imaging: { table: 'emr_imaging_records', permission: 'order_investigations', patientField: 'patient_id', orderField: 'created_at' },
  care_plans: { table: 'emr_care_plans', permission: 'manage_care_plans', patientField: 'patient_id', orderField: 'created_at' },
  care_plan_items: { table: 'emr_care_plan_items', permission: 'manage_care_plans', patientField: null, orderField: 'created_at' },
  tasks: { table: 'emr_clinical_tasks', permission: 'edit_encounters', patientField: 'patient_id', orderField: 'created_at' },
  assessments: { table: 'emr_health_assessments', permission: 'view_clinical_records', patientField: 'patient_id', orderField: 'submitted_at' },
  financial_records: { table: 'emr_financial_records', permission: 'manage_financial_records', patientField: 'patient_id', orderField: 'service_date' },
  financial_payments: { table: 'emr_financial_payments', permission: 'manage_financial_records', patientField: 'patient_id', orderField: 'payment_date' },
} as const

type ResourceName = keyof typeof resources

const patientFields = [
  'first_name','middle_name','last_name','date_of_birth','sex','gender_identity','phone','email','address','city','state','country',
  'marital_status','blood_group','genotype','occupation','emergency_contact_name','emergency_contact_phone','emergency_contact_relationship',
] as const

// NOT NULL columns on emr_patients. Blanking one is never valid, so an empty value is
// ignored on update rather than sent as a null the constraint would reject.
const requiredPatientFields = new Set<string>(['first_name','last_name','date_of_birth','sex','country'])

const enumValues: Record<string, string[]> = {
  sex: ['female','male','intersex','unknown'],
  patient_status: ['active','inactive','deceased'],
  encounter_status: ['planned','waiting','in_progress','completed','cancelled'],
  note_type: ['consultation','progress','nursing','nutrition','procedure','discharge','follow_up'],
  note_status: ['draft','final','amended'],
  diagnosis_status: ['active','resolved','historical'],
  allergy_severity: ['mild','moderate','severe','unknown'],
  allergy_status: ['active','inactive','entered_in_error'],
  medication_status: ['active','completed','discontinued'],
  investigation_priority: ['routine','urgent','stat'],
  investigation_status: ['ordered','collected','in_progress','completed','cancelled'],
  abnormal_flag: ['normal','low','high','critical','abnormal'],
  care_plan_status: ['draft','active','completed','cancelled'],
  care_item_status: ['pending','in_progress','completed','cancelled'],
  task_status: ['pending','in_progress','completed','cancelled'],
  assessment_status: ['new','reviewed','contacted','completed'],
  financial_status: ['pending','partial','paid','overdue','waived','refunded'],
  financial_currency: ['NGN','USD'],
  payment_method: ['cash','card','bank_transfer','paystack','insurance','other'],
}

function enumValue(value: unknown, group: string, fallback: string) {
  return typeof value === 'string' && enumValues[group]?.includes(value) ? value : fallback
}

function responseError(error: unknown, fallbackStatus = 500) {
  console.error('EMR API error:', error)
  return NextResponse.json({ error: emrErrorMessage(error) }, { status: fallbackStatus })
}

async function patientExists(database: any, patientId: unknown) {
  if (!isUuid(patientId)) return false
  const { data } = await database.from('emr_patients').select('id').eq('id', patientId).maybeSingle()
  return Boolean(data)
}

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_patients')
  if (!context) return NextResponse.json({ error: 'Clinical access required.' }, { status: 403 })
  const { database, user } = context
  const params = new URL(request.url).searchParams
  const resource = params.get('resource') || 'dashboard'
  const patientId = params.get('patientId')

  try {
    if (resource === 'dashboard') {
      const today = new Date().toISOString().slice(0, 10)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const [appointments, encounters, patients, newPatients, recentlySeen, orders, results, notes, tasks] = await Promise.all([
        database.from('appointments').select('id,patient_id,first_name,last_name,preferred_date,preferred_time,status,consultation_type').eq('preferred_date', today).order('preferred_time'),
        database.from('emr_encounters').select('id,patient_id,status,started_at,completed_at,created_at,patient:emr_patients(id,mrn,first_name,last_name)').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59.999`),
        database.from('emr_patients').select('id,mrn,first_name,last_name,created_at,updated_at,status').order('updated_at', { ascending: false }).limit(8),
        database.from('emr_patients').select('id,mrn,first_name,last_name,created_at').gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }).limit(8),
        database.from('emr_encounters').select('id,patient_id,created_at,patient:emr_patients(id,mrn,first_name,last_name)').order('created_at', { ascending: false }).limit(8),
        database.from('emr_investigation_orders').select('id,status').in('status', ['ordered','collected','in_progress']),
        database.from('emr_investigation_results').select('id,reviewed_at').is('reviewed_at', null),
        database.from('emr_clinical_notes').select('id,status').eq('status', 'draft'),
        database.from('emr_clinical_tasks').select('id,status,due_at').in('status', ['pending','in_progress']),
      ])
      const error = appointments.error || encounters.error || patients.error || newPatients.error || recentlySeen.error || orders.error || results.error || notes.error || tasks.error
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'view', entityType: 'emr_dashboard' })
      return NextResponse.json({
        appointments: appointments.data || [], encounters: encounters.data || [], recentPatients: patients.data || [], newPatients: newPatients.data || [], recentlySeen: recentlySeen.data || [],
        metrics: {
          appointmentsToday: appointments.data?.length || 0,
          patientsScheduled: new Set((appointments.data || []).map((item: any) => item.patient_id || `${item.first_name}-${item.last_name}`)).size,
          activeEncounters: (encounters.data || []).filter((item: any) => item.status === 'in_progress').length,
          completedEncounters: (encounters.data || []).filter((item: any) => item.status === 'completed').length,
          waitingPatients: (encounters.data || []).filter((item: any) => item.status === 'waiting').length,
          pendingResults: orders.data?.length || 0,
          resultsToReview: results.data?.length || 0,
          incompleteNotes: notes.data?.length || 0,
          followUpsDue: (tasks.data || []).filter((item: any) => item.due_at && item.due_at.slice(0, 10) <= today).length,
          pendingTasks: tasks.data?.length || 0,
        },
      })
    }

    if (resource === 'patients') {
      const page = Math.max(1, Number(params.get('page')) || 1)
      const pageSize = Math.min(100, Math.max(10, Number(params.get('pageSize')) || 20))
      const search = cleanText(params.get('search'), 120)?.replace(/[%_,().]/g, ' ')
      const status = params.get('status')
      const sort = ['updated_at','created_at','last_name','mrn','date_of_birth'].includes(params.get('sort') || '') ? params.get('sort')! : 'updated_at'
      const ascending = params.get('direction') === 'asc'
      let query = database.from('emr_patients').select('*,encounters:emr_encounters(created_at)', { count: 'exact' })
      if (search) query = query.or(`mrn.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      if (status && enumValues.patient_status.includes(status)) query = query.eq('status', status)
      const { data, error, count } = await query.order(sort, { ascending }).range((page - 1) * pageSize, page * pageSize - 1)
      if (error) throw error
      return NextResponse.json({ patients: data || [], total: count || 0, page, pageSize })
    }

    if (resource === 'patient') {
      if (!isUuid(patientId)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
      const [patient, encounters, notes, vitals, diagnoses, allergies, medications, prescriptions, orders, results, legacyReports, imaging, documents, carePlans, tasks, appointments, assessments, financialRecords, financialPayments, audit] = await Promise.all([
        database.from('emr_patients').select('*').eq('id', patientId).single(),
        database.from('emr_encounters').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_clinical_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }),
        database.from('emr_diagnoses').select('*').eq('patient_id', patientId).order('diagnosed_at', { ascending: false }),
        database.from('emr_allergies').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_medications').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_prescriptions').select('*,medication:emr_medications(*)').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_investigation_orders').select('*').eq('patient_id', patientId).order('ordered_at', { ascending: false }),
        database.from('emr_investigation_results').select('*').eq('patient_id', patientId).order('result_date', { ascending: false }),
        database.from('investigation_results').select('id,original_name,download_name,patient,report_meta,results,created_at,created_by_email').eq('emr_patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_imaging_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_documents').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_care_plans').select('*,items:emr_care_plan_items(*)').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('emr_clinical_tasks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        database.from('appointments').select('*').eq('patient_id', patientId).order('preferred_date', { ascending: false }),
        database.from('emr_health_assessments').select('*').eq('patient_id', patientId).order('submitted_at', { ascending: false }),
        database.from('emr_financial_records').select('*').eq('patient_id', patientId).order('service_date', { ascending: false }).order('created_at', { ascending: false }),
        database.from('emr_financial_payments').select('*').eq('patient_id', patientId).order('payment_date', { ascending: false }).order('created_at', { ascending: false }),
        database.from('emr_audit_logs').select('id,action,entity_type,entity_id,user_email,created_at').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(100),
      ])
      const error = patient.error || encounters.error || notes.error || vitals.error || diagnoses.error || allergies.error || medications.error || prescriptions.error || orders.error || results.error || legacyReports.error || imaging.error || documents.error || carePlans.error || tasks.error || appointments.error || assessments.error || financialRecords.error || financialPayments.error || audit.error
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'view_patient_chart', entityType: 'emr_patient', entityId: patientId, patientId })
      return NextResponse.json({ patient: patient.data, encounters: encounters.data || [], notes: notes.data || [], vitals: vitals.data || [], diagnoses: diagnoses.data || [], allergies: allergies.data || [], medications: medications.data || [], prescriptions: prescriptions.data || [], investigations: orders.data || [], results: results.data || [], legacyReports: legacyReports.data || [], imaging: imaging.data || [], documents: documents.data || [], carePlans: carePlans.data || [], tasks: tasks.data || [], appointments: appointments.data || [], assessments: assessments.data || [], financialRecords: financialRecords.data || [], financialPayments: financialPayments.data || [], audit: audit.data || [] })
    }

    if (resource === 'appointments') {
      let query = database.from('appointments').select('*,patient:emr_patients(id,mrn,first_name,last_name)').order('preferred_date', { ascending: false }).order('preferred_time')
      if (patientId) query = query.eq('patient_id', patientId)
      const { data, error } = await query.limit(250)
      if (error) throw error
      return NextResponse.json({ appointments: data || [] })
    }

    if (resource === 'legacy_reports') {
      const { data, error } = await database.from('investigation_results').select('id,original_name,download_name,patient,report_meta,results,emr_patient_id,emr_order_id,created_at').order('created_at', { ascending: false }).limit(250)
      if (error) throw error
      return NextResponse.json({ records: data || [] })
    }

    if (resource === 'document_url') {
      const id = params.get('id')
      if (!isUuid(id)) return NextResponse.json({ error: 'A valid document is required.' }, { status: 400 })
      const { data: document, error } = await database.from('emr_documents').select('*').eq('id', id).single()
      if (error) throw error
      const { data, error: signedError } = await database.storage.from('emr-documents').createSignedUrl(document.storage_path, 120)
      if (signedError) throw signedError
      await writeEmrAudit(database, user, { action: 'download_document', entityType: 'emr_document', entityId: id, patientId: document.patient_id })
      return NextResponse.json({ url: data.signedUrl })
    }

    if (resource in resources) {
      const config = resources[resource as ResourceName]
      let query = database.from(config.table).select('*').order(config.orderField, { ascending: false }).limit(250)
      if (patientId && config.patientField) query = query.eq(config.patientField, patientId)
      const { data, error } = await query
      if (error) throw error
      return NextResponse.json({ records: data || [] })
    }

    return NextResponse.json({ error: 'Unknown clinical resource.' }, { status: 400 })
  } catch (error) {
    return responseError(error)
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) return uploadDocument(request)

  const body = await request.json().catch(() => null) as Record<string, any> | null
  const resource = body?.resource as string
  if (!body || !resource) return NextResponse.json({ error: 'A clinical resource is required.' }, { status: 400 })
  const permission: EmrPermission = resource === 'patients' ? 'create_patients' : resource in resources ? resources[resource as ResourceName].permission : 'view_clinical_records'
  const context = await getEmrContext(request, permission)
  if (!context) return NextResponse.json({ error: 'Clinical access required.' }, { status: 403 })
  const { database, user } = context

  try {
    if (resource === 'patients') {
      const record: Record<string, unknown> = { created_by: user.id }
      // Omit blank fields rather than inserting null, so NOT NULL columns that carry a
      // database default (country) fall back to it instead of failing the constraint.
      for (const field of patientFields) {
        const value = field === 'date_of_birth' ? cleanDate(body[field]) : cleanText(body[field], field === 'address' ? 1000 : 180)
        if (value !== null) record[field] = value
      }
      record.sex = enumValue(body.sex, 'sex', 'unknown')
      if (!record.first_name || !record.last_name || !record.date_of_birth) return NextResponse.json({ error: 'First name, last name and date of birth are required.' }, { status: 400 })
      record.crm_patient_id = cleanText(body.crm_patient_id, 80)
      record.contact_id = isUuid(body.contact_id) ? body.contact_id : null
      const { data, error } = await database.from('emr_patients').insert(record).select('*').single()
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'create', entityType: 'emr_patient', entityId: data.id, patientId: data.id })
      return NextResponse.json({ record: data }, { status: 201 })
    }

    if (!(resource in resources)) return NextResponse.json({ error: 'Unknown clinical resource.' }, { status: 400 })
    if (resource === 'assessments') return NextResponse.json({ error: 'Assessments are submitted through the health analysis workflow.' }, { status: 400 })
    if (resource === 'notes' && body.status === 'final' && !await getEmrContext(request, 'finalize_notes')) return NextResponse.json({ error: 'Note finalization access required.' }, { status: 403 })
    const patientId = body.patient_id
    if (resources[resource as ResourceName].patientField && !await patientExists(database, patientId)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
    if (resource === 'financial_payments') {
      if (!isUuid(body.financial_record_id)) return NextResponse.json({ error: 'A valid bill is required.' }, { status: 400 })
      const { data: bill, error: billError } = await database.from('emr_financial_records').select('id,patient_id,amount_due,amount_paid').eq('id', body.financial_record_id).maybeSingle()
      if (billError || !bill || bill.patient_id !== patientId) return NextResponse.json({ error: 'The selected bill does not belong to this patient.' }, { status: 400 })
      const amount = cleanNumber(body.amount)
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Payment amount must be greater than zero.' }, { status: 400 })
      if (amount > Number(bill.amount_due) - Number(bill.amount_paid)) return NextResponse.json({ error: 'Payment amount cannot exceed the outstanding balance.' }, { status: 400 })
    }
    const record = buildRecord(resource as ResourceName, body, user.id)
    if (!record) return NextResponse.json({ error: 'This clinical resource cannot be created directly.' }, { status: 400 })
    const validationError = validateRecord(resource as ResourceName, record)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    const config = resources[resource as ResourceName]
    // The table is selected dynamically after the resource/permission check;
    // give Supabase the common JSON payload shape instead of inferring one
    // member of the resource union for every possible table.
    const { data, error } = await database.from(config.table).insert(record as Record<string, any>).select('*').single()
    if (error) throw error

    if (resource === 'encounters' && body.appointment_id && isUuid(body.appointment_id)) await database.from('appointments').update({ patient_id: patientId, encounter_id: data.id, status: 'confirmed' }).eq('id', body.appointment_id)
    if (resource === 'results' && body.order_id) await database.from('emr_investigation_orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', body.order_id)
    if (resource === 'medications' && body.sign_prescription !== false) {
      const { error: prescriptionError } = await database.from('emr_prescriptions').insert({ patient_id: patientId, encounter_id: record.encounter_id, medication_id: data.id, prescriber_id: user.id, status: 'signed', signed_at: new Date().toISOString() })
      if (prescriptionError) throw prescriptionError
    }
    await writeEmrAudit(database, user, { action: `create_${resource}`, entityType: config.table, entityId: data.id, patientId: patientId || null })
    return NextResponse.json({ record: data }, { status: 201 })
  } catch (error) {
    return responseError(error)
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, any> | null
  const resource = body?.resource as string
  const id = body?.id
  if (!body || !resource || !isUuid(id)) return NextResponse.json({ error: 'A valid clinical record is required.' }, { status: 400 })
  const permission: EmrPermission = resource === 'patients' ? 'edit_patients' : resource === 'appointments' ? 'edit_encounters' : resource === 'legacy_reports' ? 'record_results' : resource in resources ? resources[resource as ResourceName].permission : 'view_clinical_records'
  const context = await getEmrContext(request, permission)
  if (!context) return NextResponse.json({ error: 'Clinical access required.' }, { status: 403 })
  const { database, user } = context

  try {
    if (resource === 'patients') {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const field of patientFields) {
        if (!(field in body)) continue
        const value = field === 'date_of_birth' ? cleanDate(body[field]) : cleanText(body[field], field === 'address' ? 1000 : 180)
        if (value === null && requiredPatientFields.has(field)) continue
        updates[field] = value
      }
      if ('status' in body) updates.status = enumValue(body.status, 'patient_status', 'active')
      const { data, error } = await database.from('emr_patients').update(updates).eq('id', id).select('*').single()
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'update', entityType: 'emr_patient', entityId: id, patientId: id })
      return NextResponse.json({ record: data })
    }

    if (resource === 'appointments') {
      const updates: Record<string, unknown> = {}
      if ('patient_id' in body) updates.patient_id = isUuid(body.patient_id) ? body.patient_id : null
      if ('status' in body && ['pending','confirmed','completed','cancelled'].includes(body.status)) updates.status = body.status
      const { data, error } = await database.from('appointments').update(updates).eq('id', id).select('*').single()
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'link_appointment', entityType: 'appointment', entityId: id, patientId: data.patient_id })
      return NextResponse.json({ record: data })
    }

    if (resource === 'legacy_reports') {
      if (body.patient_id && !await patientExists(database, body.patient_id)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
      const { data, error } = await database.from('investigation_results').update({ emr_patient_id: body.patient_id || null, emr_order_id: isUuid(body.order_id) ? body.order_id : null }).eq('id', id).select('id,emr_patient_id,emr_order_id').single()
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'link_legacy_investigation_report', entityType: 'investigation_result', entityId: id, patientId: data.emr_patient_id })
      return NextResponse.json({ record: data })
    }

    if (!(resource in resources)) return NextResponse.json({ error: 'Unknown clinical resource.' }, { status: 400 })
    const config = resources[resource as ResourceName]
    if (resource === 'assessments' && 'patient_id' in body) {
      if (body.patient_id && !await patientExists(database, body.patient_id)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
      const { data, error } = await database.from('emr_health_assessments').update({ patient_id: body.patient_id || null, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'link_health_assessment', entityType: 'emr_health_assessment', entityId: id, patientId: data.patient_id })
      return NextResponse.json({ record: data })
    }
    const updates = buildUpdate(resource as ResourceName, body, user.id)
    // Finalized notes are part of the clinical record. Editing is allowed, but
    // the previous version is written to the audit log first so the history of
    // what the note said stays reconstructable.
    if (resource === 'notes' && 'content' in body) {
      const { data: previous } = await database.from('emr_clinical_notes').select('content,note_type,status,patient_id').eq('id', id).maybeSingle()
      if (previous && previous.content !== updates.content) {
        await writeEmrAudit(database, user, {
          action: 'revise_note',
          entityType: 'emr_clinical_notes',
          entityId: id,
          patientId: previous.patient_id,
          metadata: { previous_content: previous.content, previous_note_type: previous.note_type, previous_status: previous.status },
        })
      }
    }
    if (resource === 'encounters' && body.status === 'completed') {
      const finalize = await getEmrContext(request, 'finalize_encounters')
      if (!finalize) return NextResponse.json({ error: 'Encounter finalization access required.' }, { status: 403 })
      updates.completed_at = new Date().toISOString()
    }
    if (resource === 'notes' && body.status === 'final') {
      const finalize = await getEmrContext(request, 'finalize_notes')
      if (!finalize) return NextResponse.json({ error: 'Note finalization access required.' }, { status: 403 })
      updates.finalized_at = new Date().toISOString()
    }
    if (resource === 'results' && body.review === true) {
      const reviewer = await getEmrContext(request, 'review_results')
      if (!reviewer) return NextResponse.json({ error: 'Result review access required.' }, { status: 403 })
      updates.reviewed_by = user.id
      updates.reviewed_at = new Date().toISOString()
    }
    const { data, error } = await database.from(config.table).update(updates).eq('id', id).select('*').single()
    if (error) throw error
    if (resource === 'financial_records') {
      const { error: reconcileError } = await database.rpc('reconcile_emr_financial_record', { record_id: id })
      if (reconcileError) throw reconcileError
    }
    await writeEmrAudit(database, user, { action: `update_${resource}`, entityType: config.table, entityId: id, patientId: data.patient_id || null, metadata: { status: data.status } })
    return NextResponse.json({ record: data })
  } catch (error) {
    return responseError(error)
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getEmrContext(request, 'manage_financial_records')
  if (!context) return NextResponse.json({ error: 'Clinical access required.' }, { status: 403 })
  const { database, user } = context
  const params = new URL(request.url).searchParams
  const resource = params.get('resource')
  const id = params.get('id')
  if (!['financial_payments','financial_records'].includes(resource || '') || !isUuid(id)) return NextResponse.json({ error: 'A valid financial record is required.' }, { status: 400 })

  try {
    if (resource === 'financial_records') {
      const { data: bill, error: findError } = await database.from('emr_financial_records').select('id,patient_id,description,amount_due,amount_paid,currency').eq('id', id).maybeSingle()
      if (findError || !bill) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 })
      // Payment installments are removed by the bill foreign key's CASCADE.
      const { error } = await database.from('emr_financial_records').delete().eq('id', id)
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'delete_financial_bill', entityType: 'emr_financial_records', entityId: id, patientId: bill.patient_id, metadata: { description: bill.description, amountDue: bill.amount_due, amountPaid: bill.amount_paid, currency: bill.currency } })
      return NextResponse.json({ success: true })
    }

    const { data: payment, error: findError } = await database.from('emr_financial_payments').select('id,patient_id,financial_record_id,amount,payment_date').eq('id', id).maybeSingle()
    if (findError || !payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    const { error } = await database.from('emr_financial_payments').delete().eq('id', id)
    if (error) throw error
    await writeEmrAudit(database, user, { action: 'delete_financial_payment', entityType: 'emr_financial_payments', entityId: id, patientId: payment.patient_id, metadata: { financialRecordId: payment.financial_record_id, amount: payment.amount, paymentDate: payment.payment_date } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return responseError(error)
  }
}

// Clinical records are often entered after the fact. An explicit record_date
// overrides the database default so historical entries carry the date care was
// given, not the date they were typed in.
function backdate(body: Record<string, any>) {
  if (typeof body.record_date !== 'string' || !body.record_date) return null
  const parsed = new Date(body.record_date)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function buildRecord(resource: ResourceName, body: Record<string, any>, userId: string) {
  const now = new Date().toISOString()
  const dated = backdate(body)
  switch (resource) {
    case 'encounters': return { patient_id: body.patient_id, appointment_id: isUuid(body.appointment_id) ? body.appointment_id : null, provider_id: userId, encounter_type: cleanText(body.encounter_type, 80) || 'consultation', status: enumValue(body.status, 'encounter_status', 'in_progress'), chief_complaint: cleanText(body.chief_complaint), history_presenting_illness: cleanText(body.history_presenting_illness, 12000), past_medical_history: cleanText(body.past_medical_history, 12000), surgical_history: cleanText(body.surgical_history, 12000), family_history: cleanText(body.family_history, 12000), social_history: cleanText(body.social_history, 12000), review_of_systems: cleanText(body.review_of_systems, 12000), examination: cleanText(body.examination, 12000), clinical_assessment: cleanText(body.clinical_assessment, 12000), treatment_plan: cleanText(body.treatment_plan, 12000), follow_up_plan: cleanText(body.follow_up_plan, 4000), started_at: dated || now, ...(dated ? { created_at: dated } : {}) }
    case 'notes': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, author_id: userId, note_type: enumValue(body.note_type, 'note_type', 'progress'), content: cleanText(body.content, 50000), status: enumValue(body.status, 'note_status', 'draft'), finalized_at: body.status === 'final' ? (dated || now) : null, parent_note_id: isUuid(body.parent_note_id) ? body.parent_note_id : null, ...(dated ? { created_at: dated } : {}) }
    case 'vitals': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, systolic_bp: cleanNumber(body.systolic_bp), diastolic_bp: cleanNumber(body.diastolic_bp), heart_rate: cleanNumber(body.heart_rate), respiratory_rate: cleanNumber(body.respiratory_rate), temperature_c: cleanNumber(body.temperature_c), spo2: cleanNumber(body.spo2), weight_kg: cleanNumber(body.weight_kg), height_cm: cleanNumber(body.height_cm), bmi: calculateBmi(body.weight_kg, body.height_cm), blood_glucose: cleanNumber(body.blood_glucose), pain_score: cleanNumber(body.pain_score), notes: cleanText(body.notes), recorded_by: userId, ...(dated ? { recorded_at: dated } : {}) }
    case 'diagnoses': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, provider_id: userId, diagnosis_name: cleanText(body.diagnosis_name, 240), icd10_code: cleanText(body.icd10_code, 30), status: enumValue(body.status, 'diagnosis_status', 'active'), notes: cleanText(body.notes), ...(dated ? { diagnosed_at: dated, created_at: dated } : {}) }
    case 'allergies': return { patient_id: body.patient_id, allergen: cleanText(body.allergen, 240), reaction: cleanText(body.reaction, 500), severity: enumValue(body.severity, 'allergy_severity', 'unknown'), status: enumValue(body.status, 'allergy_status', 'active'), identified_at: cleanDate(body.identified_at), notes: cleanText(body.notes), recorded_by: userId }
    case 'medications': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, prescriber_id: userId, medication_name: cleanText(body.medication_name, 240), generic_name: cleanText(body.generic_name, 240), strength: cleanText(body.strength, 100), dose: cleanText(body.dose, 100), route: cleanText(body.route, 100), frequency: cleanText(body.frequency, 120), duration: cleanText(body.duration, 120), quantity: cleanText(body.quantity, 100), instructions: cleanText(body.instructions, 2000), start_date: cleanDate(body.start_date), end_date: cleanDate(body.end_date), status: enumValue(body.status, 'medication_status', 'active'), ...(dated ? { created_at: dated } : {}) }
    case 'investigations': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, ordering_provider_id: userId, test_name: cleanText(body.test_name, 240), category: cleanText(body.category, 120), clinical_indication: cleanText(body.clinical_indication, 2000), priority: enumValue(body.priority, 'investigation_priority', 'routine'), status: enumValue(body.status, 'investigation_status', 'ordered'), ...(dated ? { ordered_at: dated, created_at: dated } : {}) }
    case 'results': return { order_id: body.order_id, patient_id: body.patient_id, test_name: cleanText(body.test_name, 240), result: cleanText(body.result, 2000), unit: cleanText(body.unit, 80), reference_range: cleanText(body.reference_range, 160), abnormal_flag: body.abnormal_flag ? enumValue(body.abnormal_flag, 'abnormal_flag', 'normal') : null, performing_facility: cleanText(body.performing_facility, 240), result_date: body.result_date || now, notes: cleanText(body.notes, 2000) }
    case 'imaging': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, ordering_provider_id: userId, modality: cleanText(body.modality, 120), body_region: cleanText(body.body_region, 160), indication: cleanText(body.indication, 2000), performed_at: body.performed_at || dated || null, report: cleanText(body.report, 12000), ...(dated ? { created_at: dated } : {}) }
    case 'care_plans': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, title: cleanText(body.title, 240), description: cleanText(body.description, 8000), goals: cleanText(body.goals, 8000), status: enumValue(body.status, 'care_plan_status', 'active'), start_date: cleanDate(body.start_date), target_date: cleanDate(body.target_date), owner_id: userId, ...(dated ? { created_at: dated } : {}) }
    case 'care_plan_items': return { care_plan_id: body.care_plan_id, title: cleanText(body.title, 240), instructions: cleanText(body.instructions, 2000), due_date: cleanDate(body.due_date), status: enumValue(body.status, 'care_item_status', 'pending'), position: cleanNumber(body.position) || 0 }
    case 'tasks': return { patient_id: isUuid(body.patient_id) ? body.patient_id : null, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, title: cleanText(body.title, 240), task_type: cleanText(body.task_type, 80) || 'follow_up', priority: enumValue(body.priority, 'investigation_priority', 'routine'), status: enumValue(body.status, 'task_status', 'pending'), assigned_to: isUuid(body.assigned_to) ? body.assigned_to : userId, due_at: body.due_at || null, created_by: userId }
    case 'financial_records': return { patient_id: body.patient_id, encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null, description: cleanText(body.description, 500), amount_due: cleanNumber(body.amount_due), amount_paid: 0, currency: enumValue(body.currency, 'financial_currency', 'NGN'), status: 'pending', payment_method: null, payment_reference: null, service_date: new Date().toISOString().slice(0, 10), due_date: null, paid_at: null, notes: cleanText(body.notes, 4000), created_by: userId }
    case 'financial_payments': return { financial_record_id: body.financial_record_id, patient_id: body.patient_id, amount: cleanNumber(body.amount), payment_date: cleanDate(body.payment_date), payment_method: body.payment_method ? enumValue(body.payment_method, 'payment_method', 'other') : null, payment_reference: cleanText(body.payment_reference, 240), notes: cleanText(body.notes, 2000), created_by: userId }
  }
}

function validateRecord(resource: ResourceName, record: Record<string, any>) {
  const required: Partial<Record<ResourceName, string[]>> = {
    encounters: ['patient_id','chief_complaint'], notes: ['patient_id','content','note_type'], diagnoses: ['patient_id','diagnosis_name'],
    allergies: ['patient_id','allergen'], medications: ['patient_id','medication_name','strength','dose','route','frequency','duration','quantity'],
    investigations: ['patient_id','test_name','clinical_indication'], results: ['patient_id','order_id','test_name','result'], imaging: ['patient_id','modality','indication'],
    care_plans: ['patient_id','title','goals'], care_plan_items: ['care_plan_id','title'], tasks: ['title'], financial_records: ['patient_id','description'], financial_payments: ['financial_record_id','patient_id','amount','payment_date'],
  }
  const missing = required[resource]?.find(field => !record[field])
  if (missing) return `${missing.replace(/_/g, ' ')} is required.`
  if (resource === 'results' && !isUuid(record.order_id)) return 'A valid investigation order is required.'
  if (resource === 'financial_records' && (record.amount_due === null || record.amount_due <= 0 || record.amount_paid < 0)) return 'Amount billed must be greater than zero.'
  if (resource === 'financial_records' && record.amount_paid > record.amount_due) return 'Amount paid cannot exceed the amount billed.'
  if (resource === 'financial_payments' && (!record.amount || record.amount <= 0)) return 'Payment amount must be greater than zero.'
  return null
}

function buildUpdate(resource: ResourceName, body: Record<string, any>, userId: string) {
  const fields: Record<ResourceName, string[]> = {
    encounters: ['status','encounter_type','chief_complaint','history_presenting_illness','past_medical_history','surgical_history','family_history','social_history','review_of_systems','examination','clinical_assessment','treatment_plan','follow_up_plan'],
    notes: ['content','status'], vitals: ['systolic_bp','diastolic_bp','heart_rate','respiratory_rate','temperature_c','spo2','weight_kg','height_cm','blood_glucose','pain_score','notes'], diagnoses: ['status','notes','resolved_at'], allergies: ['status','notes','reaction','severity'],
    medications: ['status','end_date','discontinued_reason','instructions'], investigations: ['status','priority','clinical_indication','completed_at'],
    results: ['notes','abnormal_flag'], care_plans: ['status','description','goals','target_date','completed_at'],
    care_plan_items: ['status','title','instructions','due_date','position','completed_at'], tasks: ['status','priority','due_at','assigned_to'],
    imaging: ['modality','body_region','indication','performed_at','report'], assessments: ['status','reviewed_at','reviewed_by'],
    financial_records: ['description','amount_due','currency','notes'],
    financial_payments: ['amount','payment_date','payment_method','payment_reference','notes'],
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of fields[resource]) if (field in body) updates[field] = typeof body[field] === 'string' ? cleanText(body[field], 12000) : body[field]
  // Let the recorded date be corrected after the fact, for entries captured
  // late. Each resource keeps its own notion of when the care happened.
  const dated = backdate(body)
  if (dated && resource === 'encounters') { updates.created_at = dated; updates.started_at = dated }
  if (dated && resource === 'notes') updates.created_at = dated
  if (resource === 'vitals') {
    // Vitals arrive from the form as strings; store them as numbers and keep
    // BMI consistent with whatever weight and height end up being.
    for (const field of ['systolic_bp','diastolic_bp','heart_rate','respiratory_rate','temperature_c','spo2','weight_kg','height_cm','blood_glucose','pain_score']) {
      if (field in body) updates[field] = cleanNumber(body[field])
    }
    if ('weight_kg' in body || 'height_cm' in body) updates.bmi = calculateBmi(body.weight_kg, body.height_cm)
    if (dated) updates.recorded_at = dated
  }
  if (resource === 'diagnoses' && body.status) updates.status = enumValue(body.status, 'diagnosis_status', 'active')
  if (resource === 'allergies' && body.status) updates.status = enumValue(body.status, 'allergy_status', 'active')
  if (resource === 'medications' && body.status) updates.status = enumValue(body.status, 'medication_status', 'active')
  if (resource === 'investigations' && body.status) updates.status = enumValue(body.status, 'investigation_status', 'ordered')
  if (resource === 'care_plans' && body.status) updates.status = enumValue(body.status, 'care_plan_status', 'active')
  if (resource === 'care_plan_items' && body.status) updates.status = enumValue(body.status, 'care_item_status', 'pending')
  if (resource === 'tasks' && body.status) updates.status = enumValue(body.status, 'task_status', 'pending')
  if (resource === 'assessments' && body.status) {
    updates.status = enumValue(body.status, 'assessment_status', 'new')
    if (body.status === 'reviewed') { updates.reviewed_by = userId; updates.reviewed_at = new Date().toISOString() }
  }
  if (resource === 'financial_records') {
    if ('amount_due' in body) updates.amount_due = cleanNumber(body.amount_due)
    if ('amount_paid' in body) updates.amount_paid = cleanNumber(body.amount_paid) || 0
    if (body.status) updates.status = enumValue(body.status, 'financial_status', 'pending')
    if (body.currency) updates.currency = enumValue(body.currency, 'financial_currency', 'NGN')
    if (body.payment_method) updates.payment_method = enumValue(body.payment_method, 'payment_method', 'other')
    if ('service_date' in body) updates.service_date = cleanDate(body.service_date)
    if ('due_date' in body) updates.due_date = cleanDate(body.due_date)
    if ('paid_at' in body) updates.paid_at = cleanDate(body.paid_at)
  }
  if (resource === 'financial_payments') {
    if ('amount' in body) updates.amount = cleanNumber(body.amount)
    if ('payment_date' in body) updates.payment_date = cleanDate(body.payment_date)
    if (body.payment_method) updates.payment_method = enumValue(body.payment_method, 'payment_method', 'other')
  }
  if (resource === 'notes' && body.status) updates.status = enumValue(body.status, 'note_status', 'draft')
  if (resource === 'encounters' && body.status) updates.status = enumValue(body.status, 'encounter_status', 'in_progress')
  if (resource === 'results' && body.review) { updates.reviewed_by = userId; updates.reviewed_at = new Date().toISOString() }
  return updates
}

async function uploadDocument(request: NextRequest) {
  const context = await getEmrContext(request, 'upload_documents')
  if (!context) return NextResponse.json({ error: 'Document upload access required.' }, { status: 403 })
  const { database, user } = context
  try {
    const form = await request.formData()
    const file = form.get('file')
    const patientId = form.get('patient_id')
    if (!(file instanceof File) || !await patientExists(database, patientId)) return NextResponse.json({ error: 'A file and valid patient are required.' }, { status: 400 })
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Clinical documents must be smaller than 15 MB.' }, { status: 400 })
    const allowed = ['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Unsupported clinical document type.' }, { status: 400 })
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${patientId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await database.storage.from('emr-documents').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { data, error } = await database.from('emr_documents').insert({ patient_id: patientId, encounter_id: isUuid(form.get('encounter_id')) ? form.get('encounter_id') : null, note_id: isUuid(form.get('note_id')) ? form.get('note_id') : null, category: cleanText(form.get('category'), 50) || 'other', title: cleanText(form.get('title'), 240) || file.name, storage_path: path, original_name: file.name, mime_type: file.type, file_size: file.size, notes: cleanText(form.get('notes'), 2000), uploaded_by: user.id, ...(backdate({ record_date: form.get('record_date') }) ? { created_at: backdate({ record_date: form.get('record_date') }) } : {}) }).select('*').single()
    if (error) { await database.storage.from('emr-documents').remove([path]); throw error }
    await writeEmrAudit(database, user, { action: 'upload_document', entityType: 'emr_document', entityId: data.id, patientId: String(patientId), metadata: { mimeType: file.type, size: file.size } })
    return NextResponse.json({ record: data }, { status: 201 })
  } catch (error) {
    return responseError(error)
  }
}
