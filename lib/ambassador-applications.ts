export const ambassadorStatuses = ['pending', 'under_review', 'approved', 'rejected'] as const

export type AmbassadorStatus = (typeof ambassadorStatuses)[number]

export type AmbassadorApplication = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  gender: string
  state_region: string
  city: string
  organization: string | null
  job_title: string | null
  field_of_expertise: string | null
  motivation: string | null
  consent: boolean
  status: AmbassadorStatus
  created_at: string
  updated_at: string
}

type ApplicationInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: string
  stateRegion: string
  city: string
  organization: string
  jobTitle: string
  fieldOfExpertise: string | null
  motivation: string | null
  consent: boolean
}

type ValidationResult =
  | { success: true; data: ApplicationInput }
  | { success: false; errors: Record<string, string> }

const limits: Record<keyof Omit<ApplicationInput, 'consent'>, number> = {
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 40,
  gender: 40,
  stateRegion: 120,
  city: 120,
  organization: 160,
  jobTitle: 120,
  fieldOfExpertise: 160,
  motivation: 1600,
}

const requiredFields: Array<keyof Omit<ApplicationInput, 'consent' | 'fieldOfExpertise' | 'motivation'>> = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'gender',
  'stateRegion',
  'city',
  'organization',
  'jobTitle',
]

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\r\n/g, '\n') : ''
}

export function validateAmbassadorApplication(body: unknown): ValidationResult {
  const source = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const values = {} as Omit<ApplicationInput, 'consent'>
  const errors: Record<string, string> = {}

  for (const key of Object.keys(limits) as Array<keyof typeof limits>) {
    const value = clean(source[key])
    values[key] = value || null as never
    if (value.length > limits[key]) errors[key] = `Must be ${limits[key]} characters or fewer.`
  }

  for (const field of requiredFields) {
    if (!values[field]) errors[field] = 'This field is required.'
  }

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (values.phone && !/^[+\d][\d\s().-]{6,39}$/.test(values.phone)) {
    errors.phone = 'Enter a valid phone number.'
  }

  const consent = source.consent === true
  if (!consent) errors.consent = 'You must acknowledge the application terms.'

  if (Object.keys(errors).length > 0) return { success: false, errors }

  return {
    success: true,
    data: {
      ...values,
      email: values.email.toLowerCase(),
      consent,
    } as ApplicationInput,
  }
}

export function ambassadorInputToRow(input: ApplicationInput) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    gender: input.gender,
    state_region: input.stateRegion,
    city: input.city,
    organization: input.organization,
    job_title: input.jobTitle,
    field_of_expertise: input.fieldOfExpertise,
    motivation: input.motivation,
    consent: input.consent,
  }
}

export function formatAmbassadorStatus(status: AmbassadorStatus) {
  return status.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
