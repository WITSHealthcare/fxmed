// Health insurance coverage and referrals, shared by the EMR API and the
// clinical workspace so both agree on the options and what they mean.
import { lagosDate } from '@/lib/follow-ups'

type Option = { value: string; label: string }

export const coverageSchemes: Option[] = [
  { value: 'nhia_formal', label: 'NHIA formal sector' },
  { value: 'bhcpf', label: 'BHCPF (Basic Health Care Provision Fund)' },
  { value: 'vgf', label: 'NHIA Vulnerable Group Fund' },
  { value: 'state_scheme', label: 'State health insurance scheme' },
  { value: 'private_hmo', label: 'Private HMO plan' },
  { value: 'other', label: 'Other cover' },
]

export const membershipTypes: Option[] = [
  { value: 'principal', label: 'Principal' },
  { value: 'spouse', label: 'Spouse (dependant)' },
  { value: 'child', label: 'Child (dependant)' },
  { value: 'other_dependant', label: 'Other dependant' },
]

export const verificationOutcomes: Option[] = [
  { value: 'verified', label: 'Eligible — cover confirmed' },
  { value: 'not_eligible', label: 'Not eligible' },
  { value: 'unable_to_verify', label: 'Could not verify' },
]

export const verificationMethods: Option[] = [
  { value: 'hmo_portal', label: 'HMO portal' },
  { value: 'hmo_phone', label: 'HMO call centre' },
  { value: 'scheme_portal', label: 'NHIA or state scheme portal' },
  { value: 'card_and_id_sighted', label: 'Enrollee card and ID sighted' },
  { value: 'other', label: 'Other' },
]

export const referralLevels: Option[] = [
  { value: 'secondary', label: 'Secondary care' },
  { value: 'tertiary', label: 'Tertiary care' },
  { value: 'specialist', label: 'Specialist clinic' },
  { value: 'diagnostic', label: 'Diagnostic centre' },
  { value: 'other', label: 'Other' },
]

export const referralUrgencies: Option[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
]

export const authorizationStatuses: Option[] = [
  { value: 'not_required', label: 'Not required' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
]

// The order a referral moves through. Declined, cancelled and lost to
// follow-up end it without the patient being seen.
export const referralStatuses: Option[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted by facility' },
  { value: 'attended', label: 'Patient attended' },
  { value: 'completed', label: 'Feedback received' },
  { value: 'declined', label: 'Declined by facility' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'lost_to_follow_up', label: 'Lost to follow-up' },
]

export const openReferralStatuses = ['sent', 'accepted', 'attended']
export const unsuccessfulReferralStatuses = ['declined', 'cancelled', 'lost_to_follow_up']
// The timestamp each status sets when a referral reaches it.
export const referralStatusTimestamps: Record<string, string> = {
  sent: 'sent_at', accepted: 'accepted_at', attended: 'attended_at', completed: 'completed_at',
  declined: 'closed_at', cancelled: 'closed_at', lost_to_follow_up: 'closed_at',
}

// How long after sending a referral the patient should have been seen,
// before the team chases it.
export const referralExpectedDays: Record<string, number> = { routine: 14, urgent: 3, emergency: 0 }

export function optionLabel(options: Option[], value?: string | null) {
  return options.find(option => option.value === value)?.label || value || '—'
}

export const values = (options: Option[]) => options.map(option => option.value)

export function coverageExpired(coverage: { coverage_end?: string | null }, today = lagosDate()) {
  return Boolean(coverage.coverage_end && coverage.coverage_end < today)
}

// Eligibility is confirmed with the HMO or scheme on the day of service, so
// a check from any earlier day is due again.
export function coverageNeedsVerification(coverage: { status?: string; last_verified_at?: string | null; verification_status?: string; coverage_end?: string | null }, today = lagosDate()) {
  if (coverage.status !== 'active') return false
  if (coverageExpired(coverage, today)) return true
  return !coverage.last_verified_at || coverage.verification_status !== 'verified' || lagosDate(coverage.last_verified_at) !== today
}

export function addLagosDays(days: number, from = lagosDate()) {
  const target = new Date(`${from}T00:00:00Z`)
  target.setUTCDate(target.getUTCDate() + days)
  return target.toISOString().slice(0, 10)
}
