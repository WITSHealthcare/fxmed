import { NextRequest, NextResponse } from 'next/server'
import { cleanHrEmail, cleanHrEnum, cleanHrOptionalText, cleanHrText, cleanHrTimestamp, cleanHrUuid, values } from '@/lib/hr'
import { dataRequestDueDays, dataRequestStatuses, dataRequestTypes } from '@/lib/hr-people'
import { bad, deny, failure, isAdmin, logHr, peopleContext } from '../shared'

// NDPA subject requests from employees and candidates, and the retention log
// (deletions and anonymisation, written by this area and by Recruiting).
// Restricted: admin only.

export async function GET(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const { database } = context
    const [requests, log, employees] = await Promise.all([
      database.from('hr_data_requests').select('*').order('received_at', { ascending: false }).limit(300),
      database.from('hr_retention_log').select('*').order('run_at', { ascending: false }).limit(300),
      database.from('hr_employees').select('id,legal_name,preferred_name').order('legal_name'),
    ])
    for (const result of [requests, log, employees]) if (result.error) throw result.error
    const candidateIds = Array.from(new Set((requests.data || []).map((row) => row.candidate_id).filter(Boolean)))
    const { data: candidates } = candidateIds.length ? await database.from('hr_candidates').select('id,email,anonymised_at').in('id', candidateIds) : { data: [] }
    await logHr(context, 'view_data_requests', 'Viewed NDPA requests and the retention log', { type: 'hr_data_requests', id: null })
    return NextResponse.json({ requests: requests.data, log: log.data, employees: employees.data, candidates: Object.fromEntries((candidates || []).map((c) => [c.id, c.anonymised_at ? '(anonymised)' : c.email])) })
  } catch (error) { return failure(error, 'load data requests') }
}

export async function POST(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const type = cleanHrEnum(body?.request_type, values(dataRequestTypes)); if (!body || !type) return bad('Choose the request type.')
    const employeeId = cleanHrUuid(body.employee_id); let candidateId: string | null = null; let subject = cleanHrText(body.subject_name, 160)
    if (employeeId) {
      const { data } = await context.database.from('hr_employees').select('legal_name').eq('id', employeeId).maybeSingle()
      if (!data) return bad('Employee not found.'); subject ||= data.legal_name
    }
    const email = cleanHrEmail(body.candidate_email)
    if (email) {
      const { data } = await context.database.from('hr_candidates').select('id,full_name').ilike('email', email.replace(/[\\%_]/g, '\\$&')).is('anonymised_at', null).maybeSingle()
      if (!data) return bad('No candidate with that email.'); candidateId = data.id; subject ||= data.full_name
    }
    if (!subject) return bad('Name the person making the request.')
    const received = cleanHrTimestamp(body.received_at) || new Date().toISOString()
    const due = cleanHrTimestamp(body.due_at) || new Date(Date.parse(received) + dataRequestDueDays * 86_400_000).toISOString()
    const { data, error } = await context.database.from('hr_data_requests').insert({ request_type: type, subject_name: subject, employee_id: employeeId, candidate_id: candidateId, received_at: received, due_at: due, handled_by: context.user.id, notes: cleanHrText(body.notes, 5000) }).select('*').single()
    if (error) throw error
    await logHr(context, 'create_data_request', `Logged NDPA ${type} request for ${subject}`, { type: 'hr_data_request', id: data.id })
    return NextResponse.json({ request: data }, { status: 201 })
  } catch (error) { return failure(error, 'log the request') }
}

export async function PATCH(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    // Mark a retention log entry as reviewed.
    if (body?.log_id) {
      const logId = Number(body.log_id); if (!Number.isInteger(logId)) return bad('A valid log entry is required.')
      const { data, error } = await context.database.from('hr_retention_log').update({ reviewed_by: context.user.id, reviewed_at: new Date().toISOString() }).eq('id', logId).select('*').single(); if (error) throw error
      await logHr(context, 'review_retention_log', `Reviewed retention log entry ${logId}`, { type: 'hr_retention_log', id: String(logId) })
      return NextResponse.json({ entry: data })
    }
    const id = cleanHrUuid(body?.id); if (!body || !id) return bad('A valid request is required.')
    const status = cleanHrEnum(body.status, values(dataRequestStatuses)) || 'received'; const outcome = cleanHrOptionalText(body.outcome, 5000)
    if ((status === 'completed' || status === 'refused_with_reason') && !outcome) return bad(status === 'completed' ? 'Record what was provided or changed.' : 'Record the reason for refusing.')
    const { data: current } = await context.database.from('hr_data_requests').select('completed_at').eq('id', id).maybeSingle()
    if (!current) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
    const closed = status === 'completed' || status === 'refused_with_reason'
    const { data, error } = await context.database.from('hr_data_requests').update({
      status, outcome, notes: cleanHrText(body.notes, 5000), due_at: cleanHrTimestamp(body.due_at), ndpc_notified_at: cleanHrTimestamp(body.ndpc_notified_at), handled_by: context.user.id,
      completed_at: closed ? current.completed_at || new Date().toISOString() : null,
    }).eq('id', id).select('*').single(); if (error) throw error
    await logHr(context, 'update_data_request', `Updated NDPA request for ${data.subject_name}: ${status.replace(/_/g, ' ')}`, { type: 'hr_data_request', id })
    return NextResponse.json({ request: data })
  } catch (error) { return failure(error, 'update the request') }
}
