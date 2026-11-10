import { applicationStages, closedApplicationStages, type ApplicationStage, type CandidateSource, type HrDepartment, type HrEmploymentType, type InterviewFormat, type InterviewStatus, type OfferStatus, type Recommendation, type ReferenceOutcome, type RoleFamily, type ScorecardStatus } from './hr'

// Recruiting (applicant tracking) rules from docs/hr/recruiting-process.md.
// Pure helpers only: safe for client components. Server helpers live in
// app/api/admin/hr/recruiting/shared.ts.

// ---------------------------------------------------------------- rows
export type HrCandidate = {
  id: string; full_name: string; email: string; phone: string | null; location: string | null; source: CandidateSource; referrer_employee_id: string | null
  privacy_notice_version: string; privacy_acknowledged_at: string; talent_pool_consent: boolean; talent_pool_consent_at: string | null; talent_pool_expires_at: string | null
  retention_delete_after: string | null; anonymised_at: string | null; created_at: string; updated_at: string
}
export type HrApplication = {
  id: string; candidate_id: string; career_opening_id: string | null; requisition_id?: string | null; opening_title: string; department: HrDepartment | null; role_family: RoleFamily | null
  hiring_manager_id: string | null; cv_path: string | null; cover_note: string; salary_expectation_ngn: number | null; notice_period: string | null; right_to_work_status: string | null
  stage: ApplicationStage; stage_entered_at: string; stage_due_at: string | null; rejection_reason: string | null; withdrawal_reason: string | null
  decision: 'hire' | 'no_hire' | null; decision_reason: string | null; decided_by: string | null; decided_at: string | null; last_candidate_contact_at: string | null
  employee_id: string | null; created_at: string; updated_at: string; candidate?: HrCandidate | null
}
export type CommunicationChannel = 'email' | 'phone' | 'whatsapp' | 'in_person' | 'other'
export const communicationChannels: { value: CommunicationChannel; label: string }[] = [{ value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' }, { value: 'whatsapp', label: 'WhatsApp (work line)' }, { value: 'in_person', label: 'In person' }, { value: 'other', label: 'Other' }]
export type HrApplicationEvent = { id: number; application_id: string; from_stage: ApplicationStage | null; to_stage: ApplicationStage | null; note: string; communication_sent: boolean; communication_channel: CommunicationChannel | null; changed_by: string | null; changed_at: string }
export type ScorecardCompetency = { code: string; name: string; is_core: boolean; is_knockout: boolean; anchors: string[]; loop_step_codes: string[] }
export type HrScorecardTemplate = { id: string; role_family: RoleFamily; version: number; competencies: ScorecardCompetency[]; min_average: number; max_twos: number; active: boolean; created_at: string; updated_at: string }
export type HrInterview = { id: string; application_id: string; loop_step_code: string; title: string; format: InterviewFormat; scheduled_at: string | null; duration_min: number | null; location_or_link: string | null; adjustments_requested: string | null; status: InterviewStatus; created_at: string; updated_at: string }
export type ScorecardRating = { competency_code: string; rating: number; evidence: string }
export type HrScorecard = {
  id: string; interview_id: string; application_id: string; interviewer_id: string; template_id: string | null; conflict_declared: boolean; conflict_note: string | null; conflict_checked_at?: string | null
  ratings: ScorecardRating[]; overall_recommendation: Recommendation | null; notes: string; status: ScorecardStatus; submitted_at: string | null; created_at: string; updated_at: string; interviewer_email?: string
}
export type ReferenceAnswers = { dates_role?: string; reliability?: string; quality?: string; conduct?: string; complaints?: string; re_employ?: string }
export const referenceQuestions: { key: keyof ReferenceAnswers; label: string }[] = [
  { key: 'dates_role', label: 'Dates and role' }, { key: 'reliability', label: 'Reliability' }, { key: 'quality', label: 'Clinical or work quality' },
  { key: 'conduct', label: 'Conduct' }, { key: 'complaints', label: 'Patient complaints' }, { key: 're_employ', label: 'Would they re-employ?' },
]
export type HrReferenceCheck = {
  id: string; application_id: string; referee_name: string; referee_relationship: string | null; referee_organisation: string | null; referee_contact: string | null; is_current_employer: boolean
  candidate_consent_at: string | null; dates_confirmed: boolean | null; answers: ReferenceAnswers; outcome: ReferenceOutcome | null; checked_by: string | null; checked_at: string | null; created_at: string; updated_at: string
}
export type OfferApprovalRole = 'md' | 'medical_director'
export const offerApprovalRoles: { value: OfferApprovalRole; label: string }[] = [{ value: 'md', label: 'Managing Director' }, { value: 'medical_director', label: 'Medical Director' }]
export type OfferApproval = { approver_id: string; approver_email: string | null; role: OfferApprovalRole; approved_at: string }
export type HrOffer = {
  id: string; application_id: string; job_title: string; employment_type: HrEmploymentType; band_code: string | null; basic_ngn: number; housing_ngn: number; transport_ngn: number; other_allowances_ngn: number
  gross_monthly_ngn: number; locum_session_rate_ngn: number | null; commission_terms: string | null; sign_on_bonus_ngn: number | null; above_midpoint_reason: string | null; start_date: string | null
  probation_months: number; notice_terms: string | null; contract_type: 'employment' | 'services_agreement'; conditions: string | null; references_clear: boolean; credentials_clear: boolean
  approvals: OfferApproval[]; status: OfferStatus; sent_at: string | null; response_due_at: string | null; responded_at: string | null; decline_reason: string | null; offer_letter_path: string | null; created_at: string; updated_at: string
}
export type SalaryBandSummary = { code: string; label: string; pay_basis: string; min_ngn: number; midpoint_ngn: number; max_ngn: number; confirmed: boolean; effective_from: string }

// ---------------------------------------------------------------- requisitions (migration 042)
export type RequisitionStatus = 'draft' | 'pending_approval' | 'approved' | 'on_hold' | 'filled' | 'cancelled'
export const requisitionStatuses: { value: RequisitionStatus; label: string }[] = [{ value: 'draft', label: 'Draft' }, { value: 'pending_approval', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }, { value: 'on_hold', label: 'On hold' }, { value: 'filled', label: 'Filled' }, { value: 'cancelled', label: 'Cancelled' }]
export type HrRequisition = {
  id: string; role_code: string | null; title: string; department: HrDepartment; employment_type: HrEmploymentType; role_family: RoleFamily; band_code: string | null; headcount: number
  career_opening_id: string | null; hiring_manager_id: string | null; panel_user_ids: string[]; trigger_evidence: string; pause_condition: string; budget_note: string; target_start_date: string | null
  approvals: OfferApproval[]; status: RequisitionStatus; plan_year: number | null; created_by: string | null; created_at: string; updated_at: string
}
// Hiring plan roles (docs/hr/hiring-plan.md) with their interview loop family.
export const hiringPlanRoles: { code: string; title: string; department: HrDepartment; employment_type: HrEmploymentType; family: RoleFamily }[] = [
  { code: 'R01', title: 'Home-Visit Registered Nurse', department: 'Clinical', employment_type: 'Full-time', family: 'B' },
  { code: 'R02', title: 'Medical Laboratory Scientist (Sample Collection Lead)', department: 'Clinical', employment_type: 'Full-time', family: 'B' },
  { code: 'R03', title: 'Clinical Operations Coordinator', department: 'Operations', employment_type: 'Full-time', family: 'E' },
  { code: 'R04', title: 'Patient Growth Associate', department: 'Marketing', employment_type: 'Full-time', family: 'D' },
  { code: 'L01', title: 'Locum Physician', department: 'Clinical', employment_type: 'Locum', family: 'A' },
  { code: 'R05', title: 'Clinical Dietitian', department: 'Clinical', employment_type: 'Full-time', family: 'C' },
  { code: 'R06', title: 'Superintendent Pharmacist', department: 'Clinical', employment_type: 'Part-time', family: 'C' },
  { code: 'R07', title: 'HR and Admin Officer', department: 'Operations', employment_type: 'Full-time', family: 'E' },
  { code: 'R08', title: 'Finance and Accounts Officer', department: 'Finance', employment_type: 'Full-time', family: 'E' },
  { code: 'T01', title: 'Platform Engineer', department: 'Technology', employment_type: 'Contract', family: 'F' },
  { code: 'R09', title: 'Medical Officer (Functional Medicine)', department: 'Clinical', employment_type: 'Full-time', family: 'A' },
  { code: 'R10', title: 'Speech and Language Therapist', department: 'Clinical', employment_type: 'Contract', family: 'C' },
  { code: 'R11', title: 'Content and Community Marketing Executive', department: 'Marketing', employment_type: 'Full-time', family: 'D' },
  { code: 'R12', title: 'Registered Nurse-Midwife (Maternal Wellness)', department: 'Clinical', employment_type: 'Full-time', family: 'B' },
  { code: 'R13', title: 'Patient Care Associate', department: 'Operations', employment_type: 'Full-time', family: 'D' },
]
// Medical Director signs requisitions and offers for clinical roles (recruiting-process.md 1 and 6).
export const isClinicalHire = (department: string | null | undefined, employmentType?: string | null) => department === 'Clinical' || employmentType === 'Locum'
export function requiredRequisitionApprovals(requisition: Pick<HrRequisition, 'department' | 'employment_type'>): OfferApprovalRole[] {
  return isClinicalHire(requisition.department, requisition.employment_type) ? ['md', 'medical_director'] : ['md']
}

// ---------------------------------------------------------------- stages
export const stageInfo = (stage: ApplicationStage) => applicationStages.find((item) => item.value === stage)!
export const isClosedStage = (stage: ApplicationStage) => closedApplicationStages.includes(stage)
// Stages an admin may move to by hand. Offer stages follow the offer record
// (offers route) and 'hired' is reached only through the hire handover.
export const manualStageTargets: ApplicationStage[] = ['applied', 'screened', 'phone_screen', 'assessment', 'interview_loop', 'debrief', 'references_credentials', 'pre_boarding', 'rejected', 'withdrawn']
export const openPipelineStages = applicationStages.filter((item) => !closedApplicationStages.includes(item.value)).map((item) => item.value)
// Every candidate hears from us within 5 working days at every stage.
export const candidateContactWorkingDays = 5
export const offerResponseWorkingDays = 5

// ---------------------------------------------------------------- dates
const dayMs = 86_400_000
const toDay = (time: number) => new Date(time).toISOString().slice(0, 10)
const dayTime = (day: string) => Date.parse(`${day}T00:00:00Z`)
export const isWeekend = (day: string) => { const weekday = new Date(dayTime(day)).getUTCDay(); return weekday === 0 || weekday === 6 }
// Adds Lagos working days (Mon-Fri, skipping hr_public_holidays) to a YYYY-MM-DD day.
export function addWorkingDays(day: string, days: number, holidays: Set<string> = new Set()) {
  let time = dayTime(day); let left = Math.max(0, Math.trunc(days))
  while (left > 0) { time += dayMs; const next = toDay(time); if (!isWeekend(next) && !holidays.has(next)) left -= 1 }
  return toDay(time)
}
export function workingDaysBetween(from: string, to: string, holidays: Set<string> = new Set()) {
  let count = 0; let time = dayTime(from); const end = dayTime(to)
  while (time < end) { time += dayMs; const next = toDay(time); if (!isWeekend(next) && !holidays.has(next)) count += 1 }
  return count
}
// Due at the close of the Lagos working day (WAT is UTC+1 all year).
export const endOfLagosDay = (day: string) => `${day}T17:00:00+01:00`
export function addMonths(day: string, months: number) {
  const [year, month, date] = day.split('-').map(Number); const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return toDay(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date, last)))
}
export const addDays = (day: string, days: number) => toDay(dayTime(day) + days * dayMs)

// ---------------------------------------------------------------- retention (recruiting-process.md 8)
export const unsuccessfulRetentionMonths = 12
export const talentPoolMaxMonths = 24
export const talentPoolRenewalMonths = 12
export const candidateHealthDataDays = 30
export const candidateHealthDocumentTypes = ['medical', 'immunisation'] as const
// Health checks come after a conditional offer; nothing but the CV before a decision to hire.
export const preDecisionDocumentTypes = ['cv'] as const

// ---------------------------------------------------------------- interview loops (section 3)
export type LoopStep = { code: string; title: string; format: InterviewFormat; panel: string; minutes: number; tests: string }
export const interviewLoops: Record<RoleFamily, LoopStep[]> = {
  A: [
    { code: 'A1', title: 'Case review', format: 'in_person', panel: 'Medical Director + one clinician', minutes: 45, tests: 'Clinical reasoning; FM ranges without over-calling; when to refer' },
    { code: 'A2', title: 'Structured interview', format: 'in_person', panel: 'Medical Director + Managing Director', minutes: 45, tests: 'Patient communication, ethics, teamwork, motivation for FM' },
    { code: 'A3', title: 'Simulated consultation', format: 'in_person', panel: 'Clinician + Patient Care or Sales staff member', minutes: 30, tests: 'Explaining, listening, no cure claims' },
    { code: 'A4', title: 'Locum trial session (observed)', format: 'in_person', panel: 'Medical Director', minutes: 240, tests: 'Real-world practice' },
  ],
  B: [
    { code: 'B1', title: 'Practical skills station', format: 'in_person', panel: 'Senior nurse or MLS + Medical Director', minutes: 30, tests: 'Technique, infection control, documentation' },
    { code: 'B2', title: 'Home-visit scenario questions', format: 'in_person', panel: 'Medical Director + Clinical Operations Coordinator', minutes: 40, tests: 'Judgement, escalation, safeguarding, confidentiality' },
    { code: 'B3', title: 'Values interview', format: 'in_person', panel: 'Managing Director or Head of Talent', minutes: 30, tests: 'Reliability, patient warmth, fit' },
  ],
  C: [
    { code: 'C1', title: 'Professional task and discussion', format: 'take_home', panel: 'Medical Director + relevant professional', minutes: 30, tests: 'Professional competence' },
    { code: 'C2', title: 'Structured interview', format: 'in_person', panel: 'Medical Director + Managing Director', minutes: 45, tests: 'Communication, scope of practice, collaboration' },
    { code: 'C3', title: 'Compliance discussion (pharmacist)', format: 'in_person', panel: 'Managing Director + counsel if available', minutes: 30, tests: 'Regulatory knowledge' },
  ],
  D: [
    { code: 'D1', title: 'Lead role-play', format: 'in_person', panel: 'Sales lead + clinician', minutes: 30, tests: 'Listening, honesty, knowing what to hand to clinical' },
    { code: 'D2', title: 'Written task', format: 'take_home', panel: 'Sales lead', minutes: 60, tests: 'Organisation, writing' },
    { code: 'D3', title: 'Structured interview', format: 'in_person', panel: 'Managing Director + Patient Care or Ops staff', minutes: 30, tests: 'Values, resilience, fit' },
  ],
  E: [
    { code: 'E1', title: 'Work sample', format: 'in_person', panel: 'Hiring manager', minutes: 60, tests: 'Accuracy, judgement' },
    { code: 'E2', title: 'Structured interview', format: 'in_person', panel: 'Managing Director + clinician or external accountant', minutes: 45, tests: 'Ownership, confidentiality, process thinking' },
  ],
  F: [
    { code: 'F1', title: 'Code review', format: 'video', panel: 'Managing Director + external technical reviewer', minutes: 45, tests: 'Security instinct, code quality' },
    { code: 'F2', title: 'Paid take-home', format: 'take_home', panel: 'External reviewer', minutes: 240, tests: 'Delivery' },
    { code: 'F3', title: 'Structured interview', format: 'video', panel: 'Managing Director', minutes: 30, tests: 'Communication, reliability' },
  ],
}
export const loopStep = (family: RoleFamily | null | undefined, code: string | null | undefined) => family && code ? interviewLoops[family].find((step) => step.code === code) || null : null

// ---------------------------------------------------------------- scorecards (section 4)
export const scorecardRatingLabels = ['', 'Does not meet', 'Partly meets', 'Meets', 'Exceeds']
// The structured/values interview steps score the core competencies; role-plays also score communication and integrity.
const coreSteps: Record<RoleFamily, { all: string[]; conversation: string[] }> = {
  A: { all: ['A2'], conversation: ['A3'] }, B: { all: ['B3'], conversation: ['B2'] }, C: { all: ['C2'], conversation: [] },
  D: { all: ['D3'], conversation: ['D1'] }, E: { all: ['E2'], conversation: [] }, F: { all: ['F3'], conversation: [] },
}
const core = (code: string, name: string, knockout: boolean, conversation: boolean, anchors: string[]) => ({ code, name, knockout, conversation, anchors })
const coreCompetencies = [
  core('communication', 'Patient-centred communication', false, true, ['Talks over the patient; jargon; dismissive', "Polite but generic; misses the patient's main worry", 'Listens, checks understanding, explains next step plainly', 'Adapts to each person (anxious parent, sceptic, elderly); builds trust quickly']),
  core('integrity', 'Integrity and scope', true, true, ['Would make cure claims, overstep scope or share data casually', 'Knows the rules but hesitates when pressured', 'States limits clearly; escalates correctly; no over-claiming', 'Spots grey areas others miss and handles them well']),
  core('confidentiality', 'Confidentiality and data care', true, false, ['Suggests sending records via personal WhatsApp or similar', 'Aware of privacy but vague on practice', 'Describes correct day-to-day handling (work channels, minimum data, locked devices)', 'Gives examples of improving privacy practice in past roles']),
  core('reliability', 'Reliability and ownership', false, false, ['Vague on past commitments; blames others', 'Reliable when supervised', 'Concrete examples of finishing what they start, on time', 'Examples of fixing problems no one assigned to them']),
  core('teamwork', 'Teamwork', false, false, ['Prefers to work alone; poor handovers', 'Cooperates but handovers incomplete', 'Clear handovers; asks for and gives help', 'Makes the team around them better']),
  core('learning_fm', 'Learning and FM fit', false, false, ['Dismissive of functional medicine or of evidence', 'Curious but unclear what FM means', 'Understands FM as root-cause and evidence-based, working with conventional care', 'Already learning in the field; balanced view of evidence']),
]
const family = (code: string, name: string, steps: string[], anchors: string[], knockout = false): ScorecardCompetency => ({ code, name, is_core: false, is_knockout: knockout, anchors, loop_step_codes: steps })
const familyCompetencies: Record<RoleFamily, ScorecardCompetency[]> = {
  A: [
    family('clinical_reasoning', 'Clinical reasoning', ['A1', 'A4'], ['Unsafe or missing differentials', 'Reasonable but misses key findings', 'Sound assessment and plan; appropriate tests', 'Elegant, prioritised plan; anticipates follow-up'], true),
    family('fm_ranges', 'Use of FM ranges', ['A1'], ['Over-calls disease from optimal ranges', 'Mixes optimal and diagnostic ranges', 'Distinguishes optimal vs standard; explains to patient', 'Teaches the distinction; knows the evidence limits']),
    family('referral', 'Referral judgement', ['A1', 'A3', 'A4'], ['Misses red flags', 'Refers late or vaguely', 'Refers at the right time with a clear letter', 'Builds referral relationships']),
  ],
  B: [
    family('technical_skill', 'Technical skill', ['B1'], ['Unsafe technique', 'Correct but slow or unsure', 'Safe, clean, efficient', 'Excellent, including in children'], true),
    family('infection_control', 'Infection control and sample integrity', ['B1'], ['Breaks asepsis or labelling rules', 'Minor lapses', 'No lapses; explains why', 'Improves the SOP']),
    family('home_visit_judgement', 'Home-visit judgement', ['B2'], ['Unsafe response to scenario', 'Right answer after prompting', 'Right, prompt escalation', 'Handles family dynamics and safety calmly']),
  ],
  C: [
    family('professional_competence', 'Professional competence (task)', ['C1'], ['Errors that could harm', 'Generic, not tailored', 'Correct, tailored to the case and Nigerian context', 'Insightful; adds what we did not ask for']),
    family('regulatory_awareness', 'Regulatory awareness (pharmacist)', ['C3'], ['Unaware of obligations', 'Partial', 'Knows storage, recalls, NAFDAC and premises duties', 'Has set up compliance before']),
  ],
  D: [
    family('lead_handling', 'Lead handling', ['D1'], ['Pushy or loses the lead', 'Gets to a booking but misses qualification', 'Qualifies, books, hands over cleanly', 'Converts while building trust; perfect notes']),
    family('written_communication', 'Written communication', ['D2'], ['Errors; unclear', 'Clear but cold or long', 'Clear, warm, short', 'Messages patients would forward']),
  ],
  E: [
    family('accuracy', 'Accuracy', ['E1'], ['Multiple errors in work sample', 'One material error', 'No material errors', 'Finds errors in our sample']),
    family('planning', 'Planning and prioritisation', ['E1'], ['No plan', 'Plan ignores constraints (traffic, cut-offs)', 'Workable plan with contingencies', 'Better plan than ours']),
  ],
  F: [
    family('security', 'Security and data protection', ['F1'], ['Misses the flaw', 'Finds it after hints', 'Finds and fixes it', 'Finds related issues and proposes guards'], true),
    family('code_quality', 'Code quality', ['F1', 'F2'], ['Hard to read; untested', 'Works but messy', 'Clean, matches repo patterns', 'Simplifies the surrounding code']),
  ],
}
export function defaultScorecardCompetencies(roleFamily: RoleFamily): ScorecardCompetency[] {
  const steps = coreSteps[roleFamily]
  return [
    ...coreCompetencies.map((item) => ({ code: item.code, name: item.name, is_core: true, is_knockout: item.knockout, anchors: item.anchors, loop_step_codes: [...steps.all, ...(item.conversation ? steps.conversation : [])] })),
    ...familyCompetencies[roleFamily],
  ]
}
// Competencies an interviewer scores for an interview step; all of them when the step is not mapped.
export function competenciesForStep(competencies: ScorecardCompetency[], stepCode: string | null | undefined) {
  const mapped = stepCode ? competencies.filter((item) => item.loop_step_codes.includes(stepCode)) : []
  return mapped.length ? mapped : competencies
}

// Decision rules: any 1 on a knockout competency is no hire; otherwise hire
// needs an average of min_average or more across every submitted rating and
// no more than max_twos ratings of 2. Pending scorecards block the debrief.
export type DecisionCheck = { submitted: number; pending: number; conflicts: number; ratings: number; average: number | null; twos: number; knockouts: string[]; passes: boolean; reasons: string[] }
export function checkDecisionRules(scorecards: Pick<HrScorecard, 'status' | 'ratings' | 'conflict_declared'>[], template: Pick<HrScorecardTemplate, 'competencies' | 'min_average' | 'max_twos'> | null): DecisionCheck {
  const competencies = template?.competencies || []; const minAverage = Number(template?.min_average ?? 3); const maxTwos = Number(template?.max_twos ?? 1)
  const knockoutCodes = new Set(competencies.length ? competencies.filter((item) => item.is_knockout).map((item) => item.code) : ['integrity', 'confidentiality', 'clinical_reasoning', 'technical_skill', 'security'])
  const live = scorecards.filter((card) => !card.conflict_declared); const submitted = live.filter((card) => card.status === 'submitted')
  const ratings = submitted.flatMap((card) => (card.ratings || []).filter((item) => item.rating >= 1 && item.rating <= 4))
  const average = ratings.length ? Math.round(ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length * 100) / 100 : null
  const twos = ratings.filter((item) => item.rating === 2).length
  const knockouts = Array.from(new Set(ratings.filter((item) => item.rating === 1 && knockoutCodes.has(item.competency_code)).map((item) => competencies.find((c) => c.code === item.competency_code)?.name || item.competency_code)))
  const reasons: string[] = []
  if (!ratings.length) reasons.push('No submitted ratings yet.')
  if (knockouts.length) reasons.push(`A rating of 1 on ${knockouts.join(', ')} means no hire.`)
  if (average !== null && average < minAverage) reasons.push(`Average ${average.toFixed(2)} is below ${minAverage.toFixed(1)}.`)
  if (twos > maxTwos) reasons.push(`${twos} ratings of 2 (at most ${maxTwos} allowed).`)
  return { submitted: submitted.length, pending: live.length - submitted.length, conflicts: scorecards.length - live.length, ratings: ratings.length, average, twos, knockouts, passes: !reasons.length, reasons }
}

// ---------------------------------------------------------------- offers (section 6)
// Who must approve: MD for every employment offer, plus the Medical Director
// for clinical roles, offers above the band maximum and sign-on bonuses.
// Locum and sessional rates: Medical Director within the approved session
// rate (MD too if above it). Above the midpoint needs a written reason.
export function offerApprovalRules(offer: Pick<HrOffer, 'employment_type' | 'gross_monthly_ngn' | 'locum_session_rate_ngn' | 'sign_on_bonus_ngn'>, department: string | null, band: Pick<SalaryBandSummary, 'midpoint_ngn' | 'max_ngn' | 'pay_basis'> | null) {
  const roles = new Set<OfferApprovalRole>(); const notes: string[] = []
  const locum = offer.employment_type === 'Locum'
  const pay = Number(locum ? offer.locum_session_rate_ngn || 0 : offer.gross_monthly_ngn || 0)
  const aboveMid = !!band && pay > Number(band.midpoint_ngn); const aboveMax = !!band && pay > Number(band.max_ngn)
  if (locum) { roles.add('medical_director'); if (aboveMax) roles.add('md') } else { roles.add('md'); if (isClinicalHire(department, offer.employment_type)) roles.add('medical_director') }
  if (aboveMax) { roles.add('medical_director'); notes.push('Above the band maximum: MD and Medical Director, with a finance check on budget.') }
  if (Number(offer.sign_on_bonus_ngn || 0) > 0) { roles.add('medical_director'); notes.push('Sign-on bonus: MD and Medical Director.') }
  if (!band) notes.push('No salary band found for this offer; check the band code.')
  return { roles: Array.from(roles), needsReason: aboveMid, aboveMid, aboveMax, notes }
}
export const missingApprovals = (required: OfferApprovalRole[], approvals: OfferApproval[]) => required.filter((role) => !approvals.some((item) => item.role === role))
export const liveOfferStatuses: OfferStatus[] = ['draft', 'pending_approval', 'approved', 'sent', 'accepted']
