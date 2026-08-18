import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { absoluteUrl, clinicId, contact, createMetadata, legalName, locations, organizationId, priceRange, serviceCatalog, serviceOfferJsonLd, siteName, siteUrl } from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...createMetadata({
    title: 'FXMed | Functional Medicine, Concierge Care and Mobile Healthcare',
    description:
      'FXMed delivers functional medicine, concierge care, lab investigations, health assessments, nutrition support and mobile healthcare in Lagos, Nigeria and Cypress, Texas.',
    keywords: [
      'functional medicine Lagos',
      'concierge medicine Nigeria',
      'mobile healthcare Lagos',
      'lab investigations at home',
      'nutrition counselling',
      'FXMed',
    ],
  }),
  applicationName: siteName,
  authors: [{ name: 'FXMed' }],
  creator: 'FXMed',
  publisher: 'WITS Functional Medicine',
  category: 'Healthcare',
  icons: {
    icon: '/FXMed_Favicon.png',
    apple: '/FXMed_Favicon.png',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['MedicalBusiness', 'Organization'],
  '@id': organizationId,
  name: siteName,
  alternateName: legalName,
  legalName,
  url: siteUrl,
  logo: absoluteUrl('/logo.png'),
  image: absoluteUrl('/fxmed-website-picture.png'),
  email: contact.email,
  telephone: [contact.phoneNigeria, contact.phoneUsa],
  priceRange,
  sameAs: ['https://www.instagram.com/fxmed.ng/', 'https://www.youtube.com/@witsfxmed'],
  medicalSpecialty: [
    'Functional Medicine',
    'Preventive Medicine',
    'Nutrition',
    'Endocrinology',
    'Geriatrics',
    'Maternal Health',
  ],
  makesOffer: serviceCatalog.map(serviceOfferJsonLd),
  subOrganization: locations.map((location) => ({ '@id': clinicId(location.id) })),
}

// Each clinic is its own entity so it competes in its own local market. geo and
// openingHours are omitted entirely while unset rather than emitted as blanks.
const clinicJsonLd = locations.map((location) => ({
  '@context': 'https://schema.org',
  '@type': ['MedicalClinic', 'LocalBusiness'],
  '@id': clinicId(location.id),
  name: location.name,
  alternateName: location.alternateName,
  url: siteUrl,
  image: absoluteUrl('/fxmed-website-picture.png'),
  email: contact.email,
  telephone: location.telephone,
  priceRange,
  parentOrganization: { '@id': organizationId },
  address: {
    '@type': 'PostalAddress',
    streetAddress: location.streetAddress,
    addressLocality: location.addressLocality,
    addressRegion: location.addressRegion,
    ...(location.postalCode ? { postalCode: location.postalCode } : {}),
    addressCountry: location.addressCountry,
  },
  areaServed: location.areaServed.map((area) => ({ '@type': 'Place', name: area })),
  medicalSpecialty: ['Functional Medicine', 'Preventive Medicine', 'Nutrition'],
  ...(location.geo
    ? { geo: { '@type': 'GeoCoordinates', latitude: location.geo.latitude, longitude: location.geo.longitude } }
    : {}),
  ...(location.openingHours.length ? { openingHours: location.openingHours } : {}),
}))

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: siteUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl}/blog?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, ...clinicJsonLd, websiteJsonLd]),
          }}
        />
      </body>
    </html>
  )
}
