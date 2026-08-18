import { createClient } from '@supabase/supabase-js'
import { absoluteUrl, locations, organizationId, siteName, siteUrl } from '@/lib/seo'

export const careerDepartments = ['Clinical', 'Operations', 'Marketing', 'Technology', 'Finance'] as const
export const careerEmploymentTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Locum'] as const
export const careerStatuses = ['draft', 'published', 'closed'] as const

export type CareerDepartment = (typeof careerDepartments)[number]
export type CareerEmploymentType = (typeof careerEmploymentTypes)[number]
export type CareerStatus = (typeof careerStatuses)[number]

export type CareerOpening = {
  id: string
  title: string
  department: CareerDepartment
  location: string
  employment_type: CareerEmploymentType
  summary: string
  responsibilities: string[]
  requirements: string[]
  apply_email: string | null
  status: CareerStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export const defaultCareersEmail = 'fxmed@wellnesswits.com'

export function getCareersDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    : null
}

export function cleanCareerText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().slice(0, max)
  return clean || null
}

// Accepts either an array or a newline-separated textarea value.
export function cleanCareerList(value: unknown, max = 40): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : []
  return raw
    .map((item) => (typeof item === 'string' ? item.trim().slice(0, 300) : ''))
    .filter(Boolean)
    .slice(0, max)
}

export function careerEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && allowed.includes(value as never) ? (value as T[number]) : fallback
}

export function buildApplyLink(role: string, email: string | null | undefined) {
  const subject = encodeURIComponent(`Application: ${role}`)
  const body = encodeURIComponent(`Hello FXMed team,\n\nI would like to apply for the ${role} role.\n\nMy CV is attached.\n\nThank you,\n`)
  return `mailto:${email || defaultCareersEmail}?subject=${subject}&body=${body}`
}

// schema.org employment types differ from the human-readable labels stored on
// the record, so map rather than pass the label straight through.
const employmentTypeMap: Record<string, string> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  'Contract': 'CONTRACTOR',
  'Internship': 'INTERN',
  'Locum': 'TEMPORARY',
}

// JobPosting is what makes a role eligible for the Google Jobs experience.
// Google requires title, description, datePosted, hiringOrganization and
// jobLocation; description must carry the full posting, not a teaser.
export function createJobPostingJsonLd(opening: CareerOpening) {
  const clinic = locations.find((location) => location.id === 'lagos') || locations[0]
  const sections = [
    `<p>${opening.summary}</p>`,
    opening.responsibilities?.length
      ? `<p><strong>What you will do</strong></p><ul>${opening.responsibilities.map((item) => `<li>${item}</li>`).join('')}</ul>`
      : '',
    opening.requirements?.length
      ? `<p><strong>What we are looking for</strong></p><ul>${opening.requirements.map((item) => `<li>${item}</li>`).join('')}</ul>`
      : '',
  ].filter(Boolean)

  const remote = /remote/i.test(opening.location)

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: opening.title,
    description: sections.join(''),
    identifier: {
      '@type': 'PropertyValue',
      name: siteName,
      value: opening.id,
    },
    datePosted: opening.created_at,
    employmentType: employmentTypeMap[opening.employment_type] || 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      '@id': organizationId,
      name: siteName,
      sameAs: siteUrl,
      logo: absoluteUrl('/logo.png'),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: clinic.streetAddress,
        addressLocality: clinic.addressLocality,
        addressRegion: clinic.addressRegion,
        ...(clinic.postalCode ? { postalCode: clinic.postalCode } : {}),
        addressCountry: clinic.addressCountry,
      },
    },
    ...(remote
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: 'Nigeria' },
        }
      : {}),
    industry: 'Healthcare',
    occupationalCategory: opening.department,
    directApply: false,
  }
}
