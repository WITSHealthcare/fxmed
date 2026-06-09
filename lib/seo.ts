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
      locale: 'en_US',
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

export const publicRoutes = [
  '/',
  '/services',
  '/programs',
  '/programs/adrenal-reset',
  '/programs/gut-repair',
  '/programs/hormone-balance',
  '/programs/thyroid-recovery',
  '/programs/immune-support',
  '/functional-health-analysis',
  '/health-assessment',
  '/maternal-wellness',
  '/elite',
  '/blog',
]

export const serviceCatalog = [
  'Virtual Consult',
  'Concierge Medicine',
  'Lab Investigations',
  'Nutrition Counselling',
  'Supplement Dispensary',
  'Specialist Consultation',
  'Medical Outreach',
  'Pregnancy Wellness',
]
