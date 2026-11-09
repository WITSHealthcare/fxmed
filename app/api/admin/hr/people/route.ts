import { NextRequest, NextResponse } from 'next/server'
import { getUserAdminRole } from '@/lib/admin-auth'
import { canHr, cleanHrDate, cleanHrEmail, cleanHrEnum, cleanHrOptionalText, cleanHrText, cleanHrUuid, employeeStatuses, hrDepartments, hrEmployeeWorkColumns, hrEmploymentTypes, hrLevels, values, type HrEmployee } from '@/lib/hr'
import { addDays, hrDocumentColumns, hrEmployeeAdminColumns, hrEmployeeSelfColumns, workPatterns, type EmergencyContact, type HrCredential, type HrDocument, type PortalAccount } from '@/lib/hr-people'
import { bad, canOpenDocument, deny, employeeFor, failure, isAdmin, logHr, peopleContext, viewCredentials, type PeopleContext } from './shared'

// Employee file: list and detail, create and edit (admin), and linking a
// portal account. Linking never creates an account; that stays in Users & Roles.

const listColumns = `${hrEmployeeWorkColumns},legal_hold`

function cleanContacts(value: unknown): EmergencyContact[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 4).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>; const name = cleanHrText(item.name, 160); const phone = cleanHrText(item.phone, 40)
    return name && phone ? [{ name, phone, relationship: cleanHrText(item.relationship, 80), address: cleanHrText(item.address, 300) }] : []
  })
}

function employeePayload(body: Record<string, unknown>) {
  const legal_name = cleanHrText(body.legal_name, 160); const job_title = cleanHrText(body.job_title, 160)
  const department = cleanHrEnum(body.department, hrDepartments); const employment_type = cleanHrEnum(body.employment_type, hrEmploymentTypes)
  if (!legal_name || !job_title || !department || !employment_type) return null
  const start_date = cleanHrDate(body.start_date)
  return {
    legal_name, job_title, department, employment_type, preferred_name: cleanHrOptionalText(body.preferred_name, 160), staff_number: cleanHrOptionalText(body.staff_number, 40),
    work_email: cleanHrEmail(body.work_email), personal_email: cleanHrEmail(body.personal_email), phone: cleanHrOptionalText(body.phone, 40),
    date_of_birth: cleanHrDate(body.date_of_birth), gender: cleanHrOptionalText(body.gender, 40), nin: cleanHrOptionalText(body.nin, 20), address: cleanHrOptionalText(body.address, 500),
    emergency_contacts: cleanContacts(body.emergency_contacts), level: cleanHrEnum(body.level, hrLevels), work_pattern: cleanHrEnum(body.work_pattern, values(workPatterns)),
    location: cleanHrOptionalText(body.location, 160), line_manager_id: cleanHrUuid(body.line_manager_id), buddy_id: cleanHrUuid(body.buddy_id), clinical_supervisor_id: cleanHrUuid(body.clinical_supervisor_id),
    start_date, probation_end_date: cleanHrDate(body.probation_end_date) || (start_date ? addDays(start_date, 90) : null),
    status: cleanHrEnum(body.status, values(employeeStatuses)) || 'pre_start', legal_hold: body.legal_hold === true, retention_until: cleanHrDate(body.retention_until), notes: cleanHrText(body.notes, 5000),
  }
}

// A line manager may not be the employee or anyone who reports up to them,
// because line_manager_id drives the 'report' relation everywhere.
async function managerLoops(context: PeopleContext, employeeId: string, managerId: string | null) {
  let current = managerId
  for (let step = 0; current && step < 30; step++) {
    if (current === employeeId) return true
    const { data } = await context.database.from('hr_employees').select('line_manager_id').eq('id', current).maybeSingle()
    current = data?.line_manager_id || null
  }
  return false
}

async function portalRoleFor(context: PeopleContext, authUserId: string | null) {
  if (!authUserId) return { portal_role: 'none' as const }
  const { data, error } = await context.database.auth.admin.getUserById(authUserId)
  const role = error ? null : getUserAdminRole(data.user)
  return role ? { portal_role: role } : null
}

async function listAccounts(context: PeopleContext): Promise<PortalAccount[]> {
  const [{ data, error }, { data: linked }] = await Promise.all([context.database.auth.admin.listUsers({ page: 1, perPage: 1000 }), context.database.from('hr_employees').select('id,auth_user_id').not('auth_user_id', 'is', null)])
  if (error) throw error
  const byUser = new Map((linked || []).map((row) => [row.auth_user_id as string, row.id as string]))
  return data.users.flatMap((user) => { const role = getUserAdminRole(user); return role ? [{ id: user.id, email: user.email || '', role, linked_employee_id: byUser.get(user.id) || null }] : [] }).sort((a, b) => a.email.localeCompare(b.email))
}

async function onboardingProgress(context: PeopleContext, ids: string[] | null) {
  let query = context.database.from('hr_onboarding_items').select('employee_id,status')
  if (ids) query = query.in('employee_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  const { data, error } = await query; if (error) throw error
  const progress: Record<string, { total: number; done: number }> = {}
  for (const row of data || []) { const entry = progress[row.employee_id] ||= { total: 0, done: 0 }; entry.total++; if (row.status !== 'pending') entry.done++ }
  return progress
}

async function credentialAlerts(context: PeopleContext, ids: string[] | null, names: Map<string, string>) {
  let query = context.database.from('hr_credentials').select('*').not('employee_id', 'is', null).neq('status', 'superseded')
  if (ids) query = query.in('employee_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  const { data, error } = await query; if (error) throw error
  const views = await viewCredentials(context.database, (data || []) as HrCredential[], isAdmin(context))
  return views.filter((row) => ['expiring_soon', 'expired', 'pending_verification', 'suspended'].includes(row.status)).map((row) => ({ ...row, employee_name: names.get(row.employee_id!) || '' }))
    .sort((a, b) => (a.days_to_expiry ?? 9999) - (b.days_to_expiry ?? 9999))
}

async function list(context: PeopleContext) {
  const { database, viewer } = context
  if (isAdmin(context)) {
    const [{ data, error }, requests] = await Promise.all([database.from('hr_employees').select(listColumns).order('legal_name'), database.from('hr_data_requests').select('id,due_at,status').in('status', ['received', 'in_progress'])])
    if (error) throw error
    const employees = (data || []) as unknown as HrEmployee[]; const names = new Map(employees.map((e) => [e.id, e.preferred_name || e.legal_name]))
    const [onboarding, alerts] = await Promise.all([onboardingProgress(context, null), credentialAlerts(context, null, names)])
    const now = Date.now(); const open = requests.data || []
    return NextResponse.json({ role: 'admin', employees, onboarding, alerts, dataRequests: { open: open.length, overdue: open.filter((r) => r.due_at && Date.parse(r.due_at) < now).length } })
  }
  const ids = [...(viewer.employeeId ? [viewer.employeeId] : []), ...viewer.reportIds]
  const { data, error } = ids.length ? await database.from('hr_employees').select(hrEmployeeWorkColumns).in('id', ids).order('legal_name') : { data: [], error: null }
  if (error) throw error
  const employees = (data || []) as unknown as HrEmployee[]; const names = new Map(employees.map((e) => [e.id, e.preferred_name || e.legal_name]))
  const visible = ids.filter((id) => canHr(viewer.role, 'credential', id === viewer.employeeId ? 'self' : 'report'))
  const [onboarding, alerts] = await Promise.all([onboardingProgress(context, ids), credentialAlerts(context, visible, names)])
  return NextResponse.json({ role: viewer.role, self: employees.find((e) => e.id === viewer.employeeId) || null, reports: employees.filter((e) => e.id !== viewer.employeeId), onboarding, alerts })
}

async function detail(context: PeopleContext, id: string) {
  const access = await employeeFor(context, id, 'employee')
  if (!access) return deny()
  const { database, viewer } = context; const { relation } = access; const role = viewer.role
  const columns = role === 'admin' ? '*' : relation === 'self' ? `${hrEmployeeWorkColumns},${hrEmployeeSelfColumns}` : hrEmployeeWorkColumns
  const empty = Promise.resolve({ data: null, error: null })
  const [employee, payroll, documents, credentials, onboarding, managers] = await Promise.all([
    database.from('hr_employees').select(columns).eq('id', id).single(),
    canHr(role, 'employee_private', relation) ? database.from('hr_payroll_profiles').select('*').eq('employee_id', id).maybeSingle() : empty,
    canHr(role, 'document', relation) ? database.from('hr_documents').select(hrDocumentColumns).eq('employee_id', id).neq('status', 'deleted').order('created_at', { ascending: false }) : empty,
    canHr(role, 'credential', relation) ? database.from('hr_credentials').select('*').eq('employee_id', id).order('expires_on', { ascending: true, nullsFirst: false }) : empty,
    canHr(role, 'onboarding', relation) ? database.from('hr_onboarding_items').select('*').eq('employee_id', id).order('sort_order') : empty,
    // Names for the reporting line; work columns only.
    database.from('hr_employees').select('id,legal_name,preferred_name').in('id', [access.employee.line_manager_id, access.employee.buddy_id, access.employee.clinical_supervisor_id].filter(Boolean) as string[]),
  ])
  for (const result of [employee, payroll, documents, credentials, onboarding]) if (result.error) throw result.error
  // Staff open their own restricted documents except reference responses and guarantor forms.
  const docs = ((documents.data || []) as unknown as HrDocument[]).map((doc) => ({ ...doc, can_open: canOpenDocument(context, relation, doc) }))
  const file = employee.data as unknown as HrEmployee
  await logHr(context, 'view_staff_file', `Viewed staff file: ${file.legal_name}`, { type: 'hr_employee', id, employee: file }, { relation })
  return NextResponse.json({
    employee: file, relation, payroll: payroll.data, documents: documents.data ? docs : null, onboarding: onboarding.data,
    credentials: credentials.data ? await viewCredentials(database, credentials.data as HrCredential[], role === 'admin') : null,
    people: Object.fromEntries((managers.data || []).map((row) => [row.id, row.preferred_name || row.legal_name])),
    can: {
      editFile: role === 'admin', uploadDocument: canHr(role, 'document', relation, 'write'), submitCredential: canHr(role, 'credential', relation, 'write'),
      tickOnboarding: canHr(role, 'onboarding', relation, 'write') ? (role === 'admin' ? 'all' : relation === 'self' ? 'employee' : 'manager') : null,
    },
  })
}

export async function GET(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  try {
    const params = new URL(request.url).searchParams
    if (params.get('accounts')) return isAdmin(context) ? NextResponse.json({ accounts: await listAccounts(context) }) : deny()
    const id = params.get('id')
    if (id) return cleanHrUuid(id) ? await detail(context, id) : bad('A valid employee is required.')
    if (params.get('self')) return context.viewer.employeeId ? await detail(context, context.viewer.employeeId) : NextResponse.json({ employee: null })
    return await list(context)
  } catch (error) { return failure(error, 'load staff records') }
}

export async function POST(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null; const clean = body && employeePayload(body)
    if (!clean) return bad('Legal name, job title, department and employment type are required.')
    if (clean.status === 'exited') return bad('Leavers are closed through an offboarding case.')
    const authUserId = cleanHrUuid(body!.auth_user_id); const portal = await portalRoleFor(context, authUserId)
    if (!portal) return bad('That portal account is not a dashboard user.')
    const { data, error } = await context.database.from('hr_employees').insert({ ...clean, auth_user_id: authUserId, ...portal, created_by: context.user.id }).select('*').single()
    if (error) throw error
    await logHr(context, 'create_staff_file', `Created staff file: ${data.legal_name}`, { type: 'hr_employee', id: data.id, employee: data })
    return NextResponse.json({ employee: data }, { status: 201 })
  } catch (error) { return failure(error, 'create the staff file') }
}

export async function PATCH(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null; const id = cleanHrUuid(body?.id)
    if (!body || !id) return bad('A valid employee is required.')
    const { data: current, error: currentError } = await context.database.from('hr_employees').select('id,legal_name,auth_user_id,line_manager_id,status').eq('id', id).maybeSingle()
    if (currentError) throw currentError
    if (!current) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
    if (body.action === 'link') {
      const authUserId = cleanHrUuid(body.auth_user_id); const portal = await portalRoleFor(context, authUserId)
      if (!portal) return bad('That portal account is not a dashboard user.')
      const { data, error } = await context.database.from('hr_employees').update({ auth_user_id: authUserId, ...portal }).eq('id', id).select('*').single(); if (error) throw error
      await logHr(context, authUserId ? 'link_portal_account' : 'unlink_portal_account', `${authUserId ? 'Linked' : 'Unlinked'} portal account for ${data.legal_name}`, { type: 'hr_employee', id, employee: authUserId ? data : current }, { previous: current.auth_user_id, auth_user_id: authUserId })
      return NextResponse.json({ employee: data })
    }
    const clean = employeePayload(body)
    if (!clean) return bad('Legal name, job title, department and employment type are required.')
    if (clean.status === 'exited' && current.status !== 'exited') return bad('Leavers are closed through an offboarding case.')
    if ([clean.line_manager_id, clean.buddy_id, clean.clinical_supervisor_id].includes(id)) return bad('Someone cannot be their own manager, buddy or supervisor.')
    if (clean.line_manager_id !== current.line_manager_id && await managerLoops(context, id, clean.line_manager_id)) return bad('That line manager reports up to this employee.')
    const { data, error } = await context.database.from('hr_employees').update(clean).eq('id', id).select('*').single(); if (error) throw error
    await logHr(context, 'update_staff_file', `Updated staff file: ${data.legal_name}`, { type: 'hr_employee', id, employee: data }, {
      fields: Object.keys(clean), ...(clean.line_manager_id !== current.line_manager_id ? { line_manager_from: current.line_manager_id, line_manager_to: clean.line_manager_id } : {}), ...(clean.status !== current.status ? { status_from: current.status, status_to: clean.status } : {}),
    })
    return NextResponse.json({ employee: data })
  } catch (error) { return failure(error, 'update the staff file') }
}
