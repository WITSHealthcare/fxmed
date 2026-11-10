import { createClient } from '@supabase/supabase-js'
import type { AdminRole } from './admin-auth'

// Shared HR foundation (migration 041). Three areas build on it in parallel:
// recruiting, people (records and onboarding) and performance (reviews, leave,
// pay, offboarding). Server code resolves the viewer with lib/hr-server.ts.

export type HrArea = 'recruiting' | 'people' | 'performance'
export type Option<T extends string> = { value: T; label: string }
const options = <T extends string>(pairs: [T, string][]): Option<T>[] => pairs.map(([value, label]) => ({ value, label }))
export const values = <T extends string>(list: Option<T>[]) => list.map((item) => item.value)
export const labelOf = <T extends string>(list: Option<T>[], value: T | null | undefined) => list.find((item) => item.value === value)?.label || value || ''

// Shared with career_openings (migration 019).
export const hrDepartments = ['Clinical', 'Operations', 'Marketing', 'Technology', 'Finance'] as const
export const hrEmploymentTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Locum'] as const
export const hrLevels = ['L1', 'L2', 'L3', 'L4', 'L5'] as const
export type HrDepartment = typeof hrDepartments[number]
export type HrEmploymentType = typeof hrEmploymentTypes[number]
export type HrLevel = typeof hrLevels[number]
export type HrPortalRole = AdminRole | 'none'

// ---------------------------------------------------------------- recruiting
export type ApplicationStage = 'applied' | 'screened' | 'phone_screen' | 'assessment' | 'interview_loop' | 'debrief' | 'references_credentials' | 'offer_approval' | 'offer_extended' | 'accepted' | 'pre_boarding' | 'hired' | 'rejected' | 'withdrawn'
// slaDays: working-day limit from recruiting-process.md section 2.
export const applicationStages: (Option<ApplicationStage> & { slaDays: number | null })[] = [
  { value: 'applied', label: 'Applied', slaDays: 1 }, { value: 'screened', label: 'Screened', slaDays: 3 }, { value: 'phone_screen', label: 'Phone screen', slaDays: 5 },
  { value: 'assessment', label: 'Assessment', slaDays: 5 }, { value: 'interview_loop', label: 'Interview loop', slaDays: 7 }, { value: 'debrief', label: 'Debrief and decision', slaDays: 2 },
  { value: 'references_credentials', label: 'References and credentials', slaDays: 7 }, { value: 'offer_approval', label: 'Offer approval', slaDays: 2 }, { value: 'offer_extended', label: 'Offer extended', slaDays: 5 },
  { value: 'accepted', label: 'Accepted', slaDays: null }, { value: 'pre_boarding', label: 'Pre-boarding', slaDays: null }, { value: 'hired', label: 'Hired', slaDays: null },
  { value: 'rejected', label: 'Rejected', slaDays: null }, { value: 'withdrawn', label: 'Withdrawn', slaDays: null },
]
export const closedApplicationStages: ApplicationStage[] = ['hired', 'rejected', 'withdrawn']
export type CandidateSource = 'careers_page' | 'referral' | 'linkedin' | 'job_board' | 'agency' | 'locum_pool' | 'other'
export const candidateSources = options<CandidateSource>([['careers_page', 'Careers page'], ['referral', 'Staff referral'], ['linkedin', 'LinkedIn'], ['job_board', 'Job board'], ['agency', 'Agency'], ['locum_pool', 'Locum pool'], ['other', 'Other']])
export type RoleFamily = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export const roleFamilies = options<RoleFamily>([['A', 'Physicians'], ['B', 'Nursing, midwifery and lab'], ['C', 'Allied health and pharmacy'], ['D', 'Sales, marketing and patient care'], ['E', 'Operations, HR and finance'], ['F', 'Technology']])
export type InterviewStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled' | 'rescheduled'
export const interviewStatuses = options<InterviewStatus>([['scheduled', 'Scheduled'], ['completed', 'Completed'], ['no_show', 'No show'], ['cancelled', 'Cancelled'], ['rescheduled', 'Rescheduled']])
export type InterviewFormat = 'in_person' | 'video' | 'phone' | 'take_home'
export const interviewFormats = options<InterviewFormat>([['in_person', 'In person'], ['video', 'Video'], ['phone', 'Phone'], ['take_home', 'Take-home']])
export type ScorecardStatus = 'assigned' | 'draft' | 'submitted'
export const scorecardStatuses = options<ScorecardStatus>([['assigned', 'Assigned'], ['draft', 'Draft'], ['submitted', 'Submitted']])
export type Recommendation = 'strong_no' | 'no' | 'yes' | 'strong_yes'
export const recommendations = options<Recommendation>([['strong_no', 'Strong no'], ['no', 'No'], ['yes', 'Yes'], ['strong_yes', 'Strong yes']])
export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
export const offerStatuses = options<OfferStatus>([['draft', 'Draft'], ['pending_approval', 'Pending approval'], ['approved', 'Approved'], ['sent', 'Sent'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['withdrawn', 'Withdrawn'], ['expired', 'Expired']])
export type ReferenceOutcome = 'clear' | 'concern' | 'unable_to_contact'
export const referenceOutcomes = options<ReferenceOutcome>([['clear', 'Clear'], ['concern', 'Concern'], ['unable_to_contact', 'Unable to contact']])
// Bump when the candidate privacy notice on /careers changes; stored on hr_candidates.
export const candidatePrivacyNoticeVersion = '2026-11'

// ---------------------------------------------------------------- people
export type EmployeeStatus = 'offer_accepted' | 'pre_start' | 'probation' | 'probation_extended' | 'active' | 'on_leave' | 'suspended' | 'notice' | 'exited'
export const employeeStatuses = options<EmployeeStatus>([['offer_accepted', 'Offer accepted'], ['pre_start', 'Pre-start'], ['probation', 'On probation'], ['probation_extended', 'Probation extended'], ['active', 'Active'], ['on_leave', 'On leave'], ['suspended', 'Suspended'], ['notice', 'Serving notice'], ['exited', 'Left']])
export type CredentialType = 'NIN' | 'right_to_work' | 'degree' | 'MDCN' | 'NMCN_RN' | 'NMCN_RM' | 'MLSCN' | 'PCN' | 'dietitians_council' | 'SLT_board' | 'BLS' | 'NRP' | 'indemnity' | 'CIPM' | 'ICAN' | 'ANAN' | 'drivers_licence' | 'police_certificate' | 'other'
export const credentialTypes = options<CredentialType>([
  ['MDCN', 'MDCN practising licence'], ['NMCN_RN', 'NMCN registered nurse'], ['NMCN_RM', 'NMCN registered midwife'], ['MLSCN', 'MLSCN licence'], ['PCN', 'PCN pharmacist licence'],
  ['dietitians_council', 'Dietitians council registration'], ['SLT_board', 'Speech and language therapy registration'], ['indemnity', 'Professional indemnity'], ['BLS', 'Basic life support'], ['NRP', 'Neonatal resuscitation'],
  ['degree', 'Degree or certificate'], ['NIN', 'National identity (NIN)'], ['right_to_work', 'Right to work'], ['CIPM', 'CIPM'], ['ICAN', 'ICAN'], ['ANAN', 'ANAN'],
  ['drivers_licence', "Driver's licence"], ['police_certificate', 'Police character certificate'], ['other', 'Other'],
])
// Licences and cover that take a clinician off the rota when they lapse.
export const practisingCredentialTypes: CredentialType[] = ['MDCN', 'NMCN_RN', 'NMCN_RM', 'MLSCN', 'PCN', 'dietitians_council', 'SLT_board', 'indemnity']
export const credentialReminderDays = [90, 60, 30, 7] as const
export type CredentialStatus = 'pending_verification' | 'current' | 'expiring_soon' | 'expired' | 'suspended' | 'failed' | 'superseded'
export const credentialStatuses = options<CredentialStatus>([['pending_verification', 'Pending verification'], ['current', 'Current'], ['expiring_soon', 'Expiring soon'], ['expired', 'Expired'], ['suspended', 'Suspended'], ['failed', 'Failed verification'], ['superseded', 'Superseded']])
export type DocumentType = 'cv' | 'id' | 'certificate' | 'licence' | 'indemnity' | 'nysc' | 'proof_of_address' | 'reference' | 'guarantor' | 'contract' | 'offer_letter' | 'confidentiality' | 'medical' | 'immunisation' | 'sick_note' | 'payslip' | 'letter' | 'other'
export const documentTypes = options<DocumentType>([['cv', 'CV'], ['id', 'Identity document'], ['certificate', 'Certificate'], ['licence', 'Licence'], ['indemnity', 'Indemnity'], ['nysc', 'NYSC certificate'], ['proof_of_address', 'Proof of address'], ['reference', 'Reference'], ['guarantor', 'Guarantor form'], ['contract', 'Contract'], ['offer_letter', 'Offer letter'], ['confidentiality', 'Confidentiality undertaking'], ['medical', 'Medical fitness'], ['immunisation', 'Immunisation record'], ['sick_note', 'Sick note'], ['payslip', 'Payslip'], ['letter', 'Letter'], ['other', 'Other']])
// Always stored with is_restricted = true (health and background checks).
export const restrictedDocumentTypes: DocumentType[] = ['guarantor', 'medical', 'immunisation', 'sick_note', 'reference']
export const hrDocumentBucket = 'hr-documents'
export type ChecklistOwner = 'hr' | 'employee' | 'manager' | 'it'
export const checklistOwners = options<ChecklistOwner>([['hr', 'People Ops'], ['employee', 'New starter'], ['manager', 'Line manager'], ['it', 'IT / Admin']])
export type OnboardingStage = 'pre_start' | 'day_one' | 'week_one' | 'probation'
export const onboardingStages = options<OnboardingStage>([['pre_start', 'Before day one'], ['day_one', 'Day one'], ['week_one', 'Week one'], ['probation', 'Probation']])
export type OnboardingCategory = 'contract' | 'documents' | 'licence' | 'checks' | 'statutory' | 'it_accounts' | 'training' | 'equipment' | 'other'
export const onboardingCategories = options<OnboardingCategory>([['contract', 'Contract'], ['documents', 'Documents'], ['licence', 'Licence'], ['checks', 'Checks'], ['statutory', 'Statutory'], ['it_accounts', 'Portal and IT'], ['training', 'Training'], ['equipment', 'Equipment'], ['other', 'Other']])
export type ChecklistItemStatus = 'pending' | 'done' | 'exception_approved' | 'not_applicable'
export const checklistItemStatuses = options<ChecklistItemStatus>([['pending', 'Pending'], ['done', 'Done'], ['exception_approved', 'Exception approved'], ['not_applicable', 'Not applicable']])

// ---------------------------------------------------------------- performance
export type ReviewType = 'week_1' | 'day_30' | 'day_60' | 'day_90' | 'probation_decision' | 'mid_year' | 'annual'
export const reviewTypes = options<ReviewType>([['week_1', 'Week-one check-in'], ['day_30', '30-day check-in'], ['day_60', '60-day check-in'], ['day_90', '90-day probation review'], ['probation_decision', 'Probation decision'], ['mid_year', 'Mid-year review'], ['annual', 'Annual appraisal']])
export type ReviewStatus = 'scheduled' | 'self_review' | 'manager_review' | 'calibration' | 'final' | 'cancelled'
export const reviewStatuses = options<ReviewStatus>([['scheduled', 'Scheduled'], ['self_review', 'Self-review'], ['manager_review', 'Manager review'], ['calibration', 'Calibration'], ['final', 'Final'], ['cancelled', 'Cancelled']])
export const performanceRatings = options<'1' | '2' | '3' | '4' | '5'>([['5', 'Outstanding'], ['4', 'Strong'], ['3', 'Meets expectations'], ['2', 'Partly meets'], ['1', 'Does not meet']])
// A substantiated ethics or privacy breach caps the overall rating (performance-management.md).
export const ethicsOverrideMaxRating = 2
export type GoalStatus = 'draft' | 'agreed' | 'on_track' | 'at_risk' | 'met' | 'not_met' | 'dropped'
export const goalStatuses = options<GoalStatus>([['draft', 'Draft'], ['agreed', 'Agreed'], ['on_track', 'On track'], ['at_risk', 'At risk'], ['met', 'Met'], ['not_met', 'Not met'], ['dropped', 'Dropped']])
// Never valid as a goal or KPI target; watched for outliers only.
export const forbiddenGoalTerms = ['lab test', 'test orders', 'supplement', 'diagnos', 'upgrade', 'upsell', 'programme enrol', 'program enrol']
export type ImprovementPlanStatus = 'informal_support' | 'active' | 'extended' | 'passed' | 'not_passed' | 'cancelled'
export const improvementPlanStatuses = options<ImprovementPlanStatus>([['informal_support', 'Informal support'], ['active', 'Active'], ['extended', 'Extended'], ['passed', 'Passed'], ['not_passed', 'Not passed'], ['cancelled', 'Cancelled']])

export type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'adoption' | 'compassionate' | 'study' | 'unpaid' | 'toil' | 'public_holiday_in_lieu'
export const leaveTypes = options<LeaveType>([['annual', 'Annual'], ['sick', 'Sick'], ['maternity', 'Maternity'], ['paternity', 'Paternity'], ['adoption', 'Adoption'], ['compassionate', 'Compassionate'], ['study', 'Study / CPD'], ['unpaid', 'Unpaid'], ['toil', 'Time off in lieu'], ['public_holiday_in_lieu', 'Public holiday in lieu']])
// Leave the line manager may decide; everything else, and runs over 10 working days, goes to the MD (leave-policy.md 10.1).
export const managerApprovedLeave: LeaveType[] = ['annual', 'sick', 'compassionate', 'paternity', 'toil', 'public_holiday_in_lieu']
export const managerMaxLeaveDays = 10
// Draft entitlements from leave-policy.md (working days, to confirm with counsel).
export const defaultLeaveEntitlements: Partial<Record<LeaveType, number>> = { annual: 15, sick: 12, maternity: 80, paternity: 10, compassionate: 5, study: 5 }
export const annualLeaveLongServiceDays = 20
export const leaveCarryOverMaxDays = 5
export type LeaveStatus = 'draft' | 'submitted' | 'approved' | 'approved_with_changes' | 'declined' | 'cancelled' | 'cancelled_by_employer' | 'taken'
export const leaveStatuses = options<LeaveStatus>([['draft', 'Draft'], ['submitted', 'Awaiting approval'], ['approved', 'Approved'], ['approved_with_changes', 'Approved with changes'], ['declined', 'Declined'], ['cancelled', 'Cancelled'], ['cancelled_by_employer', 'Cancelled by FXMed'], ['taken', 'Taken']])
// Statuses that count against a balance: approved/taken as taken, submitted as pending.
export const leaveTakenStatuses: LeaveStatus[] = ['approved', 'approved_with_changes', 'taken']
export const leavePendingStatuses: LeaveStatus[] = ['submitted']

export type PayBasis = 'monthly' | 'per_session' | 'contract_monthly'
export const payBases = options<PayBasis>([['monthly', 'Monthly'], ['per_session', 'Per session'], ['contract_monthly', 'Contract (monthly)']])
export type CompensationReason = 'hire' | 'annual_review' | 'promotion' | 'adjustment' | 'correction'
export const compensationReasons = options<CompensationReason>([['hire', 'Hire'], ['annual_review', 'Annual review'], ['promotion', 'Promotion'], ['adjustment', 'Adjustment'], ['correction', 'Correction']])
export type ExitType = 'resignation' | 'termination' | 'end_of_contract' | 'probation_not_confirmed' | 'redundancy' | 'retirement' | 'death' | 'other'
export const exitTypes = options<ExitType>([['resignation', 'Resignation'], ['termination', 'Termination'], ['end_of_contract', 'End of contract'], ['probation_not_confirmed', 'Probation not confirmed'], ['redundancy', 'Redundancy'], ['retirement', 'Retirement'], ['death', 'Death in service'], ['other', 'Other']])
export type OffboardingStatus = 'notice' | 'handover' | 'access_removed' | 'final_pay_pending' | 'closed' | 'cancelled'
export const offboardingStatuses = options<OffboardingStatus>([['notice', 'Notice'], ['handover', 'Handover'], ['access_removed', 'Access removed'], ['final_pay_pending', 'Final pay pending'], ['closed', 'Closed'], ['cancelled', 'Cancelled']])
export type OffboardingItemStatus = 'pending' | 'done' | 'not_applicable' | 'missing'
export const offboardingItemStatuses = options<OffboardingItemStatus>([['pending', 'Pending'], ['done', 'Done'], ['not_applicable', 'Not applicable'], ['missing', 'Missing']])

// ---------------------------------------------------------------- records
// Row shapes shared across areas. Each area adds its own types in lib/hr-<area>.ts.
export type HrEmployee = {
  id: string; auth_user_id: string | null; staff_number: string | null; legal_name: string; preferred_name: string | null; work_email: string | null; phone: string | null
  job_title: string; department: HrDepartment; employment_type: HrEmploymentType; level: HrLevel | null; portal_role: HrPortalRole; location: string | null
  line_manager_id: string | null; buddy_id: string | null; clinical_supervisor_id: string | null; career_opening_id: string | null
  start_date: string | null; probation_end_date: string | null; confirmed_at: string | null; end_date: string | null; status: EmployeeStatus; created_at: string; updated_at: string
}
// Columns that are safe to show a line manager or colleague (no personal, pay or statutory data).
export const hrEmployeeWorkColumns = 'id,auth_user_id,staff_number,legal_name,preferred_name,work_email,phone,job_title,department,employment_type,level,portal_role,location,work_pattern,line_manager_id,buddy_id,clinical_supervisor_id,career_opening_id,start_date,probation_end_date,confirmed_at,end_date,status,created_at,updated_at'
export const displayName = (employee: Pick<HrEmployee, 'legal_name' | 'preferred_name'>) => employee.preferred_name || employee.legal_name

// ---------------------------------------------------------------- permissions
// Who can see what. Roles stay admin/clinical/sales; HR access is by role plus
// the viewer's relation to the record:
//   self        the record is about the viewer (hr_employees.auth_user_id = user.id)
//   report      the record is about a direct report (line_manager_id = viewer's employee id)
//   interviewer the viewer holds an hr_scorecards row for that application
//   other       anything else
// Admin (MD / People Ops) sees and edits everything, including pay.
// Clinical and sales staff get self-service: their own file, onboarding
// checklist, credentials, documents, leave and balance, goals, reviews and
// pay history. As line managers they see work fields, onboarding, credentials,
// leave (to decide), goals and reviews of direct reports, but never pay,
// private details or restricted records. Scorecards are visible only to admin
// and the assigned interviewer, and interviewers see the candidate only for
// applications they are assigned to. Nobody but admin sees anyone else's pay.
export type HrResource =
  | 'recruiting'        // candidates, applications, stage events, references, offers
  | 'scorecard'         // hr_scorecards
  | 'employee'          // hr_employees work columns (hrEmployeeWorkColumns)
  | 'employee_private'  // DOB, NIN, address, emergency contacts, hr_payroll_profiles
  | 'document'          // hr_documents (non-restricted) and their files
  | 'credential'        // hr_credentials
  | 'onboarding'        // hr_onboarding_items
  | 'review'            // hr_reviews, hr_goals, hr_improvement_plans
  | 'leave'             // hr_leave_requests (without sick reasons/evidence), hr_leave_balances
  | 'leave_private'     // sick-leave reasons and medical evidence
  | 'pay'               // hr_compensation, final pay, offer pay
  | 'offboarding'       // hr_offboarding_cases (minus exit interview and final pay), hr_offboarding_items
  | 'restricted'        // restricted documents, exit interviews, data requests, retention log
  | 'salary_band'       // hr_salary_bands
  | 'settings'          // scorecard templates, checklist templates, public holidays
export type HrRelation = 'self' | 'report' | 'interviewer' | 'other'
export type HrAction = 'read' | 'write'

const staffAccess: Record<HrResource, Partial<Record<HrRelation, HrAction[]>>> = {
  recruiting: { interviewer: ['read'] },
  scorecard: { interviewer: ['read', 'write'] },
  employee: { self: ['read'], report: ['read'] },
  employee_private: { self: ['read'] },
  document: { self: ['read', 'write'] },
  credential: { self: ['read', 'write'], report: ['read'] },
  onboarding: { self: ['read', 'write'], report: ['read', 'write'] },
  review: { self: ['read', 'write'], report: ['read', 'write'] },
  leave: { self: ['read', 'write'], report: ['read', 'write'] },
  leave_private: { self: ['read'] },
  pay: { self: ['read'] },
  offboarding: { self: ['read', 'write'], report: ['read'] },
  restricted: {},
  salary_band: {},
  settings: { self: ['read'], report: ['read'], interviewer: ['read'], other: ['read'] },
}

// Write access for staff is further narrowed by the route: self writes are
// limited to their own requests, self-reviews, comments, uploads and items
// owned by 'employee'; report writes to manager decisions and items owned by
// 'manager'. Status changes that confirm, verify or approve stay with admin.
export function canHr(role: AdminRole | null, resource: HrResource, relation: HrRelation, action: HrAction = 'read') {
  if (!role) return false
  if (role === 'admin') return true
  return staffAccess[resource][relation]?.includes(action) ?? false
}

export type HrViewer = { userId: string; email: string; role: AdminRole; employeeId: string | null; reportIds: string[] }
export function hrRelation(viewer: HrViewer, employee: { id: string; auth_user_id?: string | null; line_manager_id?: string | null }): HrRelation {
  if (employee.id === viewer.employeeId || (employee.auth_user_id && employee.auth_user_id === viewer.userId)) return 'self'
  if (viewer.employeeId && (employee.line_manager_id === viewer.employeeId || viewer.reportIds.includes(employee.id))) return 'report'
  return 'other'
}
// The employee ids a viewer may read for a resource; null means all (admin).
export function hrReadableEmployeeIds(viewer: HrViewer, resource: HrResource): string[] | null {
  if (viewer.role === 'admin') return null
  return [
    ...(viewer.employeeId && canHr(viewer.role, resource, 'self') ? [viewer.employeeId] : []),
    ...(canHr(viewer.role, resource, 'report') ? viewer.reportIds : []),
  ]
}

// Each table has one owning area; only that area's routes write it, except
// where noted (recruiting creates credentials/documents for applications and
// the hr_employees row at 'hired'; offboarding sets hr_employees.status/end_date).
export const hrTableOwners: Record<string, HrArea> = {
  hr_candidates: 'recruiting', hr_applications: 'recruiting', hr_application_events: 'recruiting', hr_scorecard_templates: 'recruiting',
  hr_interviews: 'recruiting', hr_scorecards: 'recruiting', hr_reference_checks: 'recruiting', hr_offers: 'recruiting',
  hr_employees: 'people', hr_payroll_profiles: 'people', hr_documents: 'people', hr_credentials: 'people', hr_checklist_templates: 'people',
  hr_onboarding_items: 'people', hr_data_requests: 'people', hr_retention_log: 'people',
  hr_reviews: 'performance', hr_goals: 'performance', hr_improvement_plans: 'performance', hr_leave_balances: 'performance',
  hr_leave_requests: 'performance', hr_public_holidays: 'performance', hr_salary_bands: 'performance', hr_compensation: 'performance',
  hr_offboarding_cases: 'performance', hr_offboarding_items: 'performance',
}

// ---------------------------------------------------------------- server helpers
export function getHrDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export const hrUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function cleanHrText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
export function cleanHrOptionalText(value: unknown, max: number) {
  return cleanHrText(value, max) || null
}
export function cleanHrEmail(value: unknown) {
  const email = cleanHrText(value, 254).toLowerCase()
  return emailPattern.test(email) ? email : null
}
export function cleanHrUuid(value: unknown) {
  return typeof value === 'string' && hrUuid.test(value) ? value : null
}
// A YYYY-MM-DD date (Lagos calendar day) or null.
export function cleanHrDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : value
}
export function cleanHrTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
export function cleanHrNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : null
}
export function cleanHrEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : null
}
export const formatNaira = (value: number | null | undefined) => value === null || value === undefined ? '—' : `₦${Number(value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
