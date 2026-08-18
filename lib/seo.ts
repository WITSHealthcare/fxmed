import type { Metadata } from 'next'

function normalizeSiteUrl(url: string) {
  const trimmedUrl = url.trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl
  }

  return `https://${trimmedUrl}`
}

export const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fxmed.ng',
)

export const siteName = 'FXMed'
// FXMed is the short form of WITS Functional Medicine. Both names are declared
// via alternateName so Google resolves the site, the brand and the Google
// Business Profile to a single entity instead of guessing.
export const legalName = 'WITS Functional Medicine'
export const defaultImage = '/fxmed-website-picture.png'

export const contact = {
  email: 'fxmed@wellnesswits.com',
  phoneNigeria: '+2349077031311',
  phoneUsa: '+18327792347',
  lagosAddress: '6A Robin Road, Crown Estate, Sangotedo, Lagos, Nigeria',
  texasAddress: '8118 Fry Road, Suite 1303, Cypress, Texas, USA',
}

type SeoConfig = {
  title: string
  description: string
  path?: string
  image?: string
  keywords?: string[]
  noIndex?: boolean
}

export function absoluteUrl(path = '/') {
  if (path.startsWith('http')) return path
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function createMetadata({
  title,
  description,
  path = '/',
  image = defaultImage,
  keywords = [],
  noIndex = false,
}: SeoConfig): Metadata {
  const url = absoluteUrl(path)
  const imageUrl = absoluteUrl(image)

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_NG',
      alternateLocale: ['en_US'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  }
}

// Physical clinics, modelled as distinct entities so each can win local results
// in its own market rather than competing as one blended Organization node.
//
// geo and openingHours are intentionally empty: they are omitted from the
// emitted JSON-LD until real values are supplied. Publishing invented
// coordinates or hours is worse than publishing none, because it drops the map
// pin in the wrong place and advertises hours the clinic does not keep.
// Fill these from the Google Business Profile for each location.
export type ClinicLocation = {
  id: string
  name: string
  alternateName: string
  streetAddress: string
  addressLocality: string
  addressRegion: string
  postalCode?: string
  addressCountry: string
  telephone: string
  areaServed: string[]
  geo: { latitude: number; longitude: number } | null
  openingHours: string[]
}

export const locations: ClinicLocation[] = [
  {
    id: 'lagos',
    name: 'WITS Functional Medicine',
    alternateName: 'FXMed',
    streetAddress: '6A Robin Road, Crown Estate, Lekki-Epe Expressway',
    addressLocality: 'Lekki',
    addressRegion: 'Lagos',
    postalCode: '106104',
    addressCountry: 'NG',
    telephone: contact.phoneNigeria,
    areaServed: ['Lekki', 'Eti-Osa', 'Sangotedo', 'Ajah', 'Victoria Island', 'Ikoyi', 'Lagos', 'Nigeria'],
    geo: { latitude: 6.463520549917872, longitude: 3.646623776976838 },
    // Mon-Fri 09:00-17:00. Saturday and Sunday are closed, which schema.org
    // expresses by omission rather than an explicit closed entry.
    openingHours: ['Mo-Fr 09:00-17:00'],
  },
  {
    id: 'texas',
    name: 'WITS Functional Medicine — Cypress',
    alternateName: 'FXMed Texas',
    streetAddress: '8118 Fry Road, Suite 1303',
    addressLocality: 'Cypress',
    addressRegion: 'TX',
    addressCountry: 'US',
    telephone: contact.phoneUsa,
    areaServed: ['Cypress', 'Houston', 'Katy', 'Harris County', 'Texas'],
    geo: null,
    openingHours: [],
  },
]

// Derived from the published rates on /services. Update alongside that page.
export const priceRange = '₦15,000 - ₦85,000'

export const organizationId = `${siteUrl}/#organization`

export function clinicId(id: string) {
  return `${siteUrl}/#clinic-${id}`
}

export function createBreadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

// Sitemap entries. lastModified is a real content-change date, not build time:
// stamping every route with "today" on each crawl teaches Google the field
// carries no information. Update a route's date when its content meaningfully
// changes. Dates below were taken from git history for each page.
export type PublicRoute = {
  path: string
  lastModified: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export const publicRoutes: PublicRoute[] = [
  { path: '/', lastModified: '2026-06-09', changeFrequency: 'weekly', priority: 1 },
  { path: '/services', lastModified: '2026-08-18', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/programs', lastModified: '2026-05-27', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/programs/adrenal-reset', lastModified: '2026-05-07', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/programs/gut-repair', lastModified: '2026-05-07', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/programs/hormone-balance', lastModified: '2026-05-07', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/programs/thyroid-recovery', lastModified: '2026-05-07', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/programs/immune-support', lastModified: '2026-05-07', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/functional-health-analysis', lastModified: '2026-05-27', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/health-assessment', lastModified: '2026-08-18', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/maternal-wellness', lastModified: '2026-05-11', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/elite', lastModified: '2026-05-27', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog', lastModified: '2026-06-09', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/ambassadors', lastModified: '2026-08-13', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/ambassadors/apply', lastModified: '2026-08-12', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/careers', lastModified: '2026-08-18', changeFrequency: 'weekly', priority: 0.7 },
]

// Single source of truth for the service catalogue. Prices mirror /services;
// `from` marks an entry-level price rather than a fixed one, and services with
// variable pricing carry no price at all rather than a misleading number.
export type ServiceOffering = {
  name: string
  description: string
  price?: number
  from?: boolean
}

export const serviceCatalog: ServiceOffering[] = [
  { name: 'Virtual Consult', description: 'Expert medical advice, follow-ups and prescription refills from anywhere via secure video or chat.', price: 25000 },
  { name: 'Concierge Medicine', description: 'Priority access to a dedicated physician, extended consultations and home visits tailored to your schedule.', price: 85000, from: true },
  { name: 'Lab Investigations', description: 'Routine to advanced panels with fast sample collection, accurate results and physician-led interpretation.', price: 15000, from: true },
  { name: 'Nutrition Counselling', description: 'Evidence-based, personalised dietary plans for weight management and chronic condition support.', price: 15000, from: true },
  { name: 'Supplement Dispensary', description: 'Clinically curated vitamins, nutraceuticals and prescription medication.' },
  { name: 'Specialist Consultation', description: 'Access certified specialists across cardiology, endocrinology, dermatology and more.' },
  { name: 'Medical Outreach', description: 'On-site consultations, screenings and health education for organisations and communities.' },
  { name: 'Pregnancy Wellness', description: 'Comprehensive maternal care from pre-conception through postnatal recovery.', price: 295000, from: true },
]

export const programCatalog = [
  { slug: 'thyroid-recovery', name: 'Thyroid Recovery', condition: 'Thyroid disorder', description: 'Find the root causes of thyroid symptoms with comprehensive testing, nutrition and targeted support.' },
  { slug: 'hormone-balance', name: 'Hormone Balance', condition: 'Hormonal imbalance', description: 'Restore hormonal balance through detailed testing and a personalised treatment protocol.' },
  { slug: 'gut-repair', name: 'Gut Repair', condition: 'Digestive disorder', description: 'Address digestive symptoms at their source with comprehensive stool analysis and gut-focused protocols.' },
  { slug: 'adrenal-reset', name: 'Adrenal Reset', condition: 'Adrenal fatigue', description: 'Rebuild energy and stress resilience with adrenal testing and a structured recovery plan.' },
  { slug: 'immune-support', name: 'Immune Support', condition: 'Immune dysfunction', description: 'Strengthen immune resilience through targeted testing, nutrition and lifestyle support.' },
]

// Offer nodes reused by both the Organization schema and the services page.
export function serviceOfferJsonLd(service: ServiceOffering) {
  return {
    '@type': 'Offer',
    itemOffered: {
      '@type': 'MedicalService',
      name: service.name,
      description: service.description,
    },
    ...(service.price
      ? {
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'NGN',
            ...(service.from ? { minPrice: service.price } : { price: service.price }),
          },
        }
      : {}),
  }
}

export function createMedicalWebPageJsonLd({
  name,
  description,
  path,
  condition,
}: {
  name: string
  description: string
  path: string
  condition?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { '@id': `${siteUrl}/#organization` },
    provider: { '@id': `${siteUrl}/#organization` },
    medicalAudience: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    ...(condition ? { about: { '@type': 'MedicalCondition', name: condition } } : {}),
  }
}
