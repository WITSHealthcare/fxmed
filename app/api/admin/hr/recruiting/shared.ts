import { NextResponse, type NextRequest } from 'next/server'
import { writeAdminActivity, type AdminActivityDetails } from '@/lib/admin-activity'
import { getUserAdminRole } from '@/lib/admin-auth'
import { lagosDate } from '@/lib/follow-ups'
import { applicationStages, canHr, getHrDatabase, hrDocumentBucket, type ApplicationStage, type HrViewer, type RoleFamily } from '@/lib/hr'
import { getHrContext } from '@/lib/hr-server'
import { addMonths, addWorkingDays, endOfLagosDay, isClosedStage, talentPoolMaxMonths, talentPoolRenewalMonths, unsuccessfulRetentionMonths, type CommunicationChannel, type HrApplication, type HrScorecardTemplate, type SalaryBandSummary } from '@/lib/hr-recruiting'

// Server helpers shared by /api/admin/hr/recruiting/* and /api/careers/apply.
export type HrDatabase = NonNullable<ReturnType<typeof getHrDatabase>>
export type RecruitingContext = Extract<Awaited<ReturnType<typeof getHrContext>>, { viewer: HrViewer }>

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })
const missingSchema = new Set(['42P01', 'PGRST205', '42703', 'PGRST204'])
export function serverError(error: unknown, label: string, fallback: string) {
  const code = (error as { code?: string } | null)?.code
  console.error(`Error ${label}:`, error)
  if (code && missingSchema.has(code)) return fail('Recruiting is not set up yet. Apply migrations 041 and 042 first.', 503)
  return fail(fallback, 500)
}
export async function readJson(request: NextRequest) {
  const body = await request.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null
}
// Resolves the viewer; `admin` is true for People Ops / MD (every recruiting record).
export async function recruitingContext(request: NextRequest) {
  const context = await getHrContext(request)
  if ('error' in context) return { response: fail(context.error || 'HR access required', context.status) } as const
  return { context, admin: canHr(context.viewer.role, 'recruiting', 'other', 'write') } as const
}
export function logHr(context: RecruitingContext, details: Omit<AdminActivityDetails, 'module'>) {
  return writeAdminActivity(context.database, context.user, { ...details, module: 'hr' })
}

export async function loadHolidays(database: HrDatabase) {
  const today = lagosDate()
  const { data, error } = await database.from('hr_public_holidays').select('holiday_date').gte('holiday_date', today).lte('holiday_date', addMonths(today, 12))
  if (error) console.error('Error loading public holidays:', error.message)
  return new Set((data || []).map((row) => row.holiday_date as string))
}
// Working-day due date for a stage from applicationStages[].slaDays, skipping weekends and public holidays.
export async function stageDueAt(database: HrDatabase, stage: ApplicationStage, holidays?: Set<string>) {
  const days = applicationStages.find((item) => item.value === stage)?.slaDays
  if (!days) return null
  return endOfLagosDay(addWorkingDays(lagosDate(), days, holidays || await loadHolidays(database)))
}

export async function recordEvent(database: HrDatabase, event: { application_id: string; from_stage?: string | null; to_stage?: string | null; note?: string; communication_sent?: boolean; communication_channel?: CommunicationChannel | null; changed_by: string | null }) {
  const { error } = await database.from('hr_application_events').insert({ from_stage: null, to_stage: null, note: '', communication_sent: false, communication_channel: null, ...event })
  if (error) throw error
}

// Moves an application to a stage with its due date, writes the stage event
// and refreshes the candidate's retention date when the application closes.
export async function moveStage(database: HrDatabase, application: Pick<HrApplication, 'id' | 'stage' | 'candidate_id'>, to: ApplicationStage, by: string | null, note = '', extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString()
  const { data, error } = await database.from('hr_applications').update({ ...extra, stage: to, stage_entered_at: now, stage_due_at: await stageDueAt(database, to) }).eq('id', application.id).eq('stage', application.stage).select('*').maybeSingle()
  if (error) throw error
  if (!data) return null
  await recordEvent(database, { application_id: application.id, from_stage: application.stage, to_stage: to, note, changed_by: by })
  if (isClosedStage(to)) await refreshCandidateRetention(database, application.candidate_id)
  return data as HrApplication
}

// retention_delete_after: 12 months after the latest application closed (or
// from today while one is open), extended to the talent-pool expiry while
// consent lasts; cleared once hired because the employee file takes over.
export async function refreshCandidateRetention(database: HrDatabase, candidateId: string) {
  const [{ data: candidate }, { data: applications }] = await Promise.all([
    database.from('hr_candidates').select('talent_pool_consent,talent_pool_expires_at,anonymised_at').eq('id', candidateId).maybeSingle(),
    database.from('hr_applications').select('stage,stage_entered_at,employee_id').eq('candidate_id', candidateId),
  ])
  if (!candidate || candidate.anonymised_at) return
  const today = lagosDate(); const rows = applications || []
  const hired = rows.some((row) => row.employee_id || row.stage === 'hired')
  const dates = hired ? [] : rows.map((row) => addMonths(isClosedStage(row.stage) ? lagosDate(row.stage_entered_at) : today, unsuccessfulRetentionMonths))
  if (!hired && candidate.talent_pool_consent && candidate.talent_pool_expires_at) dates.push(candidate.talent_pool_expires_at)
  const until = hired ? null : dates.sort().pop() || addMonths(today, unsuccessfulRetentionMonths)
  const { error } = await database.from('hr_candidates').update({ retention_delete_after: until }).eq('id', candidateId)
  if (error) throw error
}
// Talent-pool consent runs 12 months at a time, never past 24 months from the first consent.
export function talentPoolExpiry(consentAt: string) {
  const today = lagosDate(); const cap = addMonths(lagosDate(consentAt), talentPoolMaxMonths); const renewal = addMonths(today, talentPoolRenewalMonths)
  return renewal < cap ? renewal : cap
}

// Interviewers see an application only while it is open and they hold a scorecard for it.
export async function interviewerScorecards(database: HrDatabase, userId: string, applicationId: string) {
  const [{ data: application }, { data: cards }] = await Promise.all([
    database.from('hr_applications').select('stage').eq('id', applicationId).maybeSingle(),
    database.from('hr_scorecards').select('id').eq('application_id', applicationId).eq('interviewer_id', userId),
  ])
  return application && !isClosedStage(application.stage) ? (cards || []).length : 0
}

// Scorecards that count for the debrief: not on cancelled interviews.
export async function liveScorecards(database: HrDatabase, applicationId: string) {
  const { data, error } = await database.from('hr_scorecards').select('*, interview:hr_interviews(status)').eq('application_id', applicationId)
  if (error) throw error
  return (data || []).filter((card) => card.interview?.status !== 'cancelled').map(({ interview: _interview, ...card }) => card)
}

export async function signedUrl(database: HrDatabase, path: string, seconds = 120) {
  const { data, error } = await database.storage.from(hrDocumentBucket).createSignedUrl(path, seconds)
  if (error) throw error
  return data.signedUrl
}

// Active dashboard users, for interviewer, hiring manager and panel pickers (admin only).
export async function staffDirectory(database: HrDatabase) {
  const { data, error } = await database.auth.admin.listUsers({ perPage: 1000 })
  if (error) { console.error('Error listing staff:', error.message); return [] }
  return data.users.flatMap((user) => {
    const role = getUserAdminRole(user)
    if (!role) return []
    const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : ''
    return [{ id: user.id, email: user.email || '', name, role }]
  }).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
}
export type StaffMember = Awaited<ReturnType<typeof staffDirectory>>[number]

// Accepted uploads: PDF or Word for CVs; candidate check documents also allow images.
export const cvMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export const checkMimeTypes = [...cvMimeTypes, 'image/jpeg', 'image/png', 'image/webp']
export const maxUploadBytes = 15 * 1024 * 1024
const extensionMime: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
// Checks the declared type, the extension and the file signature so a renamed file is refused.
export async function checkUpload(file: File, allowed: string[]) {
  if (file.size <= 0 || file.size > maxUploadBytes) return { error: 'Files must be smaller than 15 MB.' } as const
  const extension = file.name.split('.').pop()?.toLowerCase() || ''; const mime = extensionMime[extension]
  if (!mime || !allowed.includes(mime) || (file.type && file.type !== mime && file.type !== 'application/octet-stream')) return { error: 'That file type is not accepted.' } as const
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer()); const hex = Array.from(head).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const ok = mime === 'application/pdf' ? hex.startsWith('25504446') : mime === 'application/msword' ? hex.startsWith('d0cf11e0') : mime.includes('openxml') ? hex.startsWith('504b0304')
    : mime === 'image/jpeg' ? hex.startsWith('ffd8ff') : mime === 'image/png' ? hex.startsWith('89504e47') : hex.startsWith('52494646')
  if (!ok) return { error: 'The file does not match its type.' } as const
  return { mime, safeName: file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) } as const
}

export async function activeTemplate(database: HrDatabase, roleFamily: RoleFamily | null) {
  if (!roleFamily) return null
  const { data } = await database.from('hr_scorecard_templates').select('*').eq('role_family', roleFamily).eq('active', true).order('version', { ascending: false }).limit(1).maybeSingle()
  return (data || null) as HrScorecardTemplate | null
}
export async function currentBand(database: HrDatabase, code: string | null) {
  if (!code) return null
  const { data } = await database.from('hr_salary_bands').select('code,label,pay_basis,min_ngn,midpoint_ngn,max_ngn,confirmed,effective_from').eq('code', code).lte('effective_from', lagosDate()).order('effective_from', { ascending: false }).limit(1).maybeSingle()
  return (data || null) as SalaryBandSummary | null
}
