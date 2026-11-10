import {
  annualLeaveLongServiceDays, defaultLeaveEntitlements, forbiddenGoalTerms, leaveCarryOverMaxDays, leavePendingStatuses, leaveTakenStatuses, managerApprovedLeave, managerMaxLeaveDays,
  type CompensationReason, type ExitType, type GoalStatus, type HrEmployee, type ImprovementPlanStatus, type LeaveStatus, type LeaveType, type OffboardingItemStatus, type OffboardingStatus,
  type PayBasis, type ReviewStatus, type ReviewType, type ChecklistOwner, type HrLevel, type HrDepartment,
} from './hr'

// Performance, leave, pay and offboarding (hr_reviews .. hr_offboarding_items in
// migration 041). Shared by app/api/admin/hr/performance and the HR tab; no
// server imports here so client components can use the date and balance maths.

export const hrPerformanceApi = '/api/admin/hr/performance'
export const hrPerformanceMigrationError = 'HR tables are not ready. Has migration 041 been applied?'

// ---------------------------------------------------------------- rows
export type CheckInScores = { training?: number; attendance?: number; conduct?: number; team_fit?: number }
export type HrReview = {
  id: string; employee_id: string; review_type: ReviewType; review_year: number | null; reviewer_id: string | null; scheduled_date: string | null; held_at: string | null
  self_review: string; scores: Record<string, unknown>; manager_summary: string; improvement_actions: string; overall_rating: number | null; ethics_override: boolean; ethics_override_reason: string | null
  calibrated_rating: number | null; probation_outcome: 'confirmed' | 'extended' | 'not_confirmed' | null; probation_new_end_date: string | null; clinical_signoff_ref: string | null
  employee_comment: string; employee_acknowledged_at: string | null; manager_signed_at: string | null; second_review_requested_at: string | null; second_review_outcome: string | null
  status: ReviewStatus; created_at: string; updated_at: string
}
export type HrGoal = {
  id: string; employee_id: string; review_year: number; title: string; measure: string; target: string; data_source: string; is_development_goal: boolean; due_date: string | null
  progress_notes: string; rating: number | null; status: GoalStatus; agreed_at: string | null; created_at: string; updated_at: string
}
export type PlanGap = { area: string; standard: string; measure: string; support: string }
export type PlanCheckIn = { date: string; note: string; by: string; on_track?: boolean | null }
export type HrImprovementPlan = {
  id: string; employee_id: string; manager_id: string | null; start_date: string; end_date: string; gaps: PlanGap[]; check_ins: PlanCheckIn[]; outcome_notes: string; extended_to: string | null
  status: ImprovementPlanStatus; created_at: string; updated_at: string
}
export type BalanceLeaveType = Exclude<LeaveType, 'public_holiday_in_lieu'>
export type HrLeaveBalance = {
  id: string; employee_id: string; leave_year: number; leave_type: BalanceLeaveType; entitled_days: number; pro_rata_factor: number; carried_over_days: number; carry_over_expires_on: string | null
  adjustment_days: number; adjustment_reason: string | null; updated_at: string
}
export type HrLeaveRequest = {
  id: string; employee_id: string; leave_type: LeaveType; start_date: string; end_date: string; working_days: number; reason: string; cover_employee_id: string | null; handover_notes: string
  evidence_document_id: string | null; approval_level: 'manager' | 'md'; pay_treatment: 'full' | 'half' | 'unpaid'; status: LeaveStatus; decided_by: string | null; decided_at: string | null
  decision_reason: string | null; returned_on: string | null; return_meeting_at: string | null; created_at: string; updated_at: string
}
export type HrPublicHoliday = { holiday_date: string; name: string; confirmed: boolean; source: string | null }
export type HrSalaryBand = {
  id: string; code: string; label: string; level: HrLevel | null; department: HrDepartment | null; pay_basis: PayBasis; min_ngn: number; midpoint_ngn: number; max_ngn: number
  confirmed: boolean; confirmed_at: string | null; effective_from: string; notes: string; updated_at: string
}
export type HrCompensation = {
  id: string; employee_id: string; effective_date: string; level: HrLevel | null; band_code: string | null; basic_ngn: number; housing_ngn: number; transport_ngn: number; other_ngn: number
  monthly_gross_ngn: number; locum_session_rate_ngn: number | null; reason: CompensationReason; review_id: string | null; notes: string; created_at: string
}
export type FinalPayItem = { label: string; amount_ngn: number }
export type ExitInterview = Partial<Record<typeof exitInterviewQuestions[number]['key'], string>>
export type HrOffboardingCase = {
  id: string; employee_id: string; exit_type: ExitType; notice_received_at: string | null; notice_period_text: string | null; last_working_day: string | null; garden_leave: boolean; pay_in_lieu: boolean
  handover_plan: string; patients_reassigned_at: string | null; leads_reassigned_at: string | null; portal_access_removed_at: string | null; equipment_returned_at: string | null
  final_pay_date?: string | null; final_pay_items?: FinalPayItem[]; exit_interview?: ExitInterview; pressure_flag?: boolean
  certificate_of_service_issued_at: string | null; reference_consent: boolean | null; re_employable: 'yes' | 'no' | 'with_conditions' | null; status: OffboardingStatus; created_at: string; updated_at: string
}
export type OffboardingCategory = 'access' | 'equipment' | 'handover' | 'records' | 'pay' | 'other'
export type HrOffboardingItem = {
  id: string; case_id: string; category: OffboardingCategory; item: string; owner: ChecklistOwner; due_date: string | null; status: OffboardingItemStatus; done_at: string | null; notes: string; sort_order: number
}
export type OffboardingTemplateItem = { category: OffboardingCategory; item: string; owner: ChecklistOwner; due_offset_days: number }
export type OffboardingTemplate = { id: string; title: string; departments: string[]; employment_types: string[]; items: OffboardingTemplateItem[]; active: boolean }

export type LeaveBalanceView = {
  leave_type: BalanceLeaveType; leave_year: number; balance_id: string | null; entitled: number; carried_over: number; carried_usable: number; carry_over_expires_on: string | null
  adjustment: number; taken: number; pending: number; remaining: number
}
// What the signed-in viewer may do on one employee's file (set by the API, shown by the UI).
export type PerformanceAccess = { isAdmin: boolean; isSelf: boolean; isManager: boolean; seesPay: boolean; seesPrivateLeave: boolean }
export type PerformanceFile = {
  employee: HrEmployee; access: PerformanceAccess; reviews: HrReview[]; goals: HrGoal[]; plans: HrImprovementPlan[]; balances: LeaveBalanceView[]; leave: HrLeaveRequest[]
  compensation: HrCompensation[]; offboarding: (HrOffboardingCase & { items: HrOffboardingItem[] }) | null; signoffOptions: SignoffOption[]; year: number
}
export type SignoffOption = { ref: string; label: string; submitted_at: string; score: number | null; passed: boolean | null }

export const offboardingCategories: { value: OffboardingCategory; label: string }[] = [
  { value: 'access', label: 'Access' }, { value: 'equipment', label: 'Equipment' }, { value: 'handover', label: 'Handover' }, { value: 'records', label: 'Records' }, { value: 'pay', label: 'Final pay' }, { value: 'other', label: 'Other' },
]
export const reEmployableOptions = [{ value: 'yes', label: 'Yes' }, { value: 'with_conditions', label: 'With conditions' }, { value: 'no', label: 'No' }] as const
// offboarding.md section 8. Answers are admin only.
export const exitInterviewQuestions = [
  { key: 'why_leaving', label: 'Why are you leaving?' },
  { key: 'did_well', label: 'What did FXMed do well for you?' },
  { key: 'change', label: 'What should we change (workload, pay, management, tools, home-visit logistics)?' },
  { key: 'pressure', label: 'Did you ever feel pressure to recommend, sell or say something that was not in the patient’s interest?' },
  { key: 'training_enough', label: 'Was the training and onboarding enough for the job?' },
  { key: 'recommend_score', label: 'Would you recommend FXMed as a place to work? (0–10)' },
  { key: 'come_back', label: 'Would you consider coming back?' },
] as const
// offboarding.md section 4–6, used when no template is chosen. Offsets are days from the last working day.
export const defaultOffboardingItems: OffboardingTemplateItem[] = [
  { category: 'handover', item: 'Handover plan agreed: patients, follow-ups, open leads, deals, pending lab results, training they run', owner: 'manager', due_offset_days: -14 },
  { category: 'pay', item: 'Payroll told; future-dated allowances and commission stopped after the last day', owner: 'hr', due_offset_days: -14 },
  { category: 'handover', item: 'Active patients reassigned to a named clinician and notes completed (clinical)', owner: 'manager', due_offset_days: -1 },
  { category: 'handover', item: 'Open leads and deals reassigned with a next step and date (sales)', owner: 'manager', due_offset_days: -1 },
  { category: 'handover', item: 'Follow-ups, appointments and owned training programmes reassigned', owner: 'manager', due_offset_days: -1 },
  { category: 'records', item: 'Exit interview booked (HR owner or Admin, not the line manager)', owner: 'hr', due_offset_days: -5 },
  { category: 'access', item: 'Portal account deactivated in Users & Roles', owner: 'it', due_offset_days: 0 },
  { category: 'access', item: 'Work email, WhatsApp Business, lab/HMO portals, payment and social accounts removed; shared credentials changed', owner: 'it', due_offset_days: 0 },
  { category: 'equipment', item: 'Laptop, phone, SIMs, medical bag and equipment, dispensary stock, ID card and keys returned', owner: 'manager', due_offset_days: 0 },
  { category: 'records', item: 'Confirm in writing that FXMed patient and business data is deleted from personal devices and accounts', owner: 'employee', due_offset_days: 0 },
  { category: 'records', item: 'Paper records, consent and sample forms returned to the clinic', owner: 'employee', due_offset_days: 0 },
  { category: 'access', item: 'Access-removal checklist signed off by Admin', owner: 'hr', due_offset_days: 1 },
  { category: 'pay', item: 'Final pay calculated and paid; final pension remitted; final payslip and tax statement issued', owner: 'hr', due_offset_days: 30 },
  { category: 'records', item: 'Certificate of service issued; group life and health plan told of the end date', owner: 'hr', due_offset_days: 14 },
]

// ---------------------------------------------------------------- dates (YYYY-MM-DD, Lagos calendar days)
const day = 86_400_000
const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`)
const fromUtc = (time: number) => new Date(time).toISOString().slice(0, 10)
export const addDays = (date: string, days: number) => fromUtc(toUtc(date) + days * day)
export function addMonths(date: string, months: number) {
  const [y, m, d] = date.split('-').map(Number); const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return fromUtc(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, last)))
}
export const yearOf = (date: string) => Number(date.slice(0, 4))
export const isWeekend = (date: string) => { const weekday = new Date(toUtc(date)).getUTCDay(); return weekday === 0 || weekday === 6 }
// Working days in [start, end], skipping weekends and public holidays.
export function countWorkingDays(start: string, end: string, holidays: Iterable<string> = []) {
  const off = new Set(holidays); let count = 0
  for (let time = toUtc(start); time <= toUtc(end) && count < 400; time += day) { const date = fromUtc(time); if (!isWeekend(date) && !off.has(date)) count++ }
  return count
}
export function addWorkingDays(start: string, days: number, holidays: Iterable<string> = []) {
  const off = new Set(holidays); let date = start; let left = days
  while (left > 0) { date = addDays(date, 1); if (!isWeekend(date) && !off.has(date)) left-- }
  return date
}
export const displayDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: value.length === 10 ? 'UTC' : 'Africa/Lagos' }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value)) : '—'

// ---------------------------------------------------------------- probation and reviews
// Check-ins from new-hire-training-plan.md: end of week 1, day 30, 60 and 90.
export const probationCheckIns: { type: ReviewType; offset: number }[] = [{ type: 'week_1', offset: 7 }, { type: 'day_30', offset: 30 }, { type: 'day_60', offset: 60 }, { type: 'day_90', offset: 90 }]
export const checkInAreas: { key: keyof CheckInScores; label: string }[] = [{ key: 'training', label: 'Training' }, { key: 'attendance', label: 'Reliability and attendance' }, { key: 'conduct', label: 'Professional standards' }, { key: 'team_fit', label: 'Fit with how we work' }]
export const behaviourAreas = ['Puts the patient’s interest first', 'Honest about results and limits', 'Protects patient data', 'Reliable (time, follow-through)', 'Works well across clinical and sales'] as const
export const isCheckIn = (type: ReviewType) => ['week_1', 'day_30', 'day_60', 'day_90'].includes(type)
export const isRated = (type: ReviewType) => type === 'annual'
export const probationExtensionMaxMonths = 3
export const secondReviewWindowDays = 10
export const probationOutcomes = [{ value: 'confirmed', label: 'Confirmed' }, { value: 'extended', label: 'Extended' }, { value: 'not_confirmed', label: 'Not confirmed' }] as const
export const finalRating = (review: Pick<HrReview, 'calibrated_rating' | 'overall_rating' | 'ethics_override'>) => {
  const rating = review.calibrated_rating ?? review.overall_rating
  return rating === null ? null : review.ethics_override ? Math.min(rating, 2) : rating
}

// ---------------------------------------------------------------- goals
// Returns the forbidden term found in a goal or KPI, if any (performance-management.md section 4).
export function forbiddenGoalTerm(...texts: (string | null | undefined)[]) {
  const text = texts.filter(Boolean).join(' ').toLowerCase()
  return forbiddenGoalTerms.find((term) => text.includes(term)) || null
}
export const goalTermError = (term: string) => `Goals and KPIs cannot target “${term}”: tests, supplements, diagnoses, upgrades and programme enrolments are watched as guardrails only.`

// ---------------------------------------------------------------- leave
export const balanceLeaveTypes: BalanceLeaveType[] = ['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'study', 'adoption', 'unpaid', 'toil']
// Types shown on the balance card even with no row (the rest only once a row exists).
export const shownBalanceTypes: BalanceLeaveType[] = ['annual', 'sick', 'compassionate', 'study']
export const carryOverExpiry = (year: number) => `${year}-03-31`

// Complete months worked in the leave year, over 12 (leave-policy.md section 1).
export function proRataFactor(year: number, startDate: string | null, endDate: string | null = null) {
  const from = startDate && yearOf(startDate) === year ? startDate : `${year}-01-01`
  const to = endDate && yearOf(endDate) === year ? endDate : `${year}-12-31`
  if ((startDate && yearOf(startDate) > year) || (endDate && yearOf(endDate) < year)) return 0
  if (from > to) return 0
  const [fy, fm, fd] = from.split('-').map(Number); const [ty, tm, td] = to.split('-').map(Number)
  let months = (ty - fy) * 12 + (tm - fm) + 1
  if (fd > 1) months-- // joined after the 1st: that month is not complete
  if (td < new Date(Date.UTC(ty, tm, 0)).getUTCDate()) months-- // left before month end
  return Math.max(0, Math.min(12, months)) / 12
}
// Annual: 15 days, 20 after 3 years' continuous service by 1 January of the leave year.
export function defaultEntitlement(type: BalanceLeaveType, year: number, startDate: string | null) {
  if (type === 'annual') return startDate && startDate <= `${year - 3}-01-01` ? annualLeaveLongServiceDays : defaultLeaveEntitlements.annual || 0
  return defaultLeaveEntitlements[type] || 0
}
// Prorated types: annual and study; statutory sick, maternity, paternity and compassionate are not cut for joiners.
export const proRatedLeave: BalanceLeaveType[] = ['annual', 'study']
const roundHalf = (value: number) => Math.round(value * 2) / 2

// Remaining = entitled + carried over + adjustment − taken − pending. Carried-over
// days not used by leave starting on or before 31 March lapse after that date.
export function leaveBalance(type: BalanceLeaveType, year: number, row: Pick<HrLeaveBalance, 'id' | 'entitled_days' | 'pro_rata_factor' | 'carried_over_days' | 'carry_over_expires_on' | 'adjustment_days'> | null, requests: Pick<HrLeaveRequest, 'leave_type' | 'start_date' | 'working_days' | 'status'>[], employee: Pick<HrEmployee, 'start_date' | 'end_date'>, today: string): LeaveBalanceView {
  const mine = requests.filter((request) => request.leave_type === type && yearOf(request.start_date) === year)
  const sum = (statuses: LeaveStatus[], filter: (request: typeof mine[number]) => boolean = () => true) => mine.filter((request) => statuses.includes(request.status) && filter(request)).reduce((total, request) => total + Number(request.working_days), 0)
  const taken = sum(leaveTakenStatuses); const pending = sum(leavePendingStatuses)
  const entitled = row ? roundHalf(Number(row.entitled_days) * Number(row.pro_rata_factor)) : roundHalf(defaultEntitlement(type, year, employee.start_date) * (proRatedLeave.includes(type) ? proRataFactor(year, employee.start_date, employee.end_date) : 1))
  const carried = row ? Number(row.carried_over_days) : 0; const expires = row?.carry_over_expires_on || (carried ? carryOverExpiry(year) : null)
  const usedBeforeExpiry = expires ? sum([...leaveTakenStatuses, ...leavePendingStatuses], (request) => request.start_date <= expires) : 0
  const carriedUsable = expires && today > expires ? Math.min(carried, usedBeforeExpiry) : carried
  const adjustment = row ? Number(row.adjustment_days) : 0
  return { leave_type: type, leave_year: year, balance_id: row?.id || null, entitled, carried_over: carried, carried_usable: carriedUsable, carry_over_expires_on: expires, adjustment, taken, pending, remaining: roundHalf(entitled + carriedUsable + adjustment - taken - pending) }
}
// Up to 5 unused annual days roll into the next year (leave-policy.md section 2).
export const carryOverDays = (previous: LeaveBalanceView) => Math.max(0, Math.min(leaveCarryOverMaxDays, previous.remaining))

// Line manager decides managerApprovedLeave up to 10 working days; everything else goes to the MD.
export function leaveApprovalLevel(type: LeaveType, workingDays: number, onProbation: boolean, overBalance: boolean): 'manager' | 'md' {
  if (!managerApprovedLeave.includes(type) || workingDays > managerMaxLeaveDays || overBalance) return 'md'
  // Annual leave during probation is for exceptional reasons; paternity needs probation completed.
  if (onProbation && (type === 'annual' || type === 'paternity')) return 'md'
  return 'manager'
}
// Notice in working days before the start (leave-policy.md sections 2 and 7).
export function leaveNoticeWarning(type: LeaveType, start: string, workingDays: number, today: string) {
  const weeks = type === 'annual' ? (workingDays >= 5 ? 4 : 2) : type === 'study' ? 4 : 0
  return weeks && start < addDays(today, weeks * 7) ? `${weeks} weeks’ notice is expected for this request.` : null
}
export const leaveOpenStatuses: LeaveStatus[] = ['submitted', 'approved', 'approved_with_changes']

// ---------------------------------------------------------------- pay
export const nationalMinimumWage = 70000
export const currentCompensation = (rows: HrCompensation[], today: string) => [...rows].filter((row) => row.effective_date <= today).sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0] || null
export function bandFor(bands: HrSalaryBand[], level: HrLevel | null, department: HrDepartment | null, date: string) {
  return bands.filter((band) => band.level === level && (band.department === department || band.department === null) && band.effective_from <= date)
    .sort((a, b) => Number(b.department === department) - Number(a.department === department) || b.effective_from.localeCompare(a.effective_from))[0] || null
}
