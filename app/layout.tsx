import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { absoluteUrl, contact, createMetadata, serviceCatalog, siteName, siteUrl } from '@/lib/seo'

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
  name: siteName,
  url: siteUrl,
  logo: absoluteUrl('/logo.png'),
  image: absoluteUrl('/fxmed-website-picture.png'),
  email: contact.email,
  telephone: [contact.phoneNigeria, contact.phoneUsa],
  sameAs: ['https://www.instagram.com/fxmed.ng/', 'https://www.youtube.com/@witsfxmed'],
  address: [
    {
      '@type': 'PostalAddress',
      streetAddress: '6A Robin Road, Crown Estate, Sangotedo',
      addressLocality: 'Lagos',
      addressCountry: 'NG',
    },
    {
      '@type': 'PostalAddress',
      streetAddress: '8118 Fry Road, Suite 1303',
      addressLocality: 'Cypress',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
  ],
  medicalSpecialty: [
    'Functional Medicine',
    'Preventive Medicine',
    'Nutrition',
    'Endocrinology',
    'Geriatrics',
    'Maternal Health',
  ],
  makesOffer: serviceCatalog.map((service) => ({
    '@type': 'Offer',
    itemOffered: {
      '@type': 'MedicalService',
      name: service,
    },
  })),
}

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
            __html: JSON.stringify([organizationJsonLd, websiteJsonLd]),
          }}
        />
      </body>
    </html>
  )
}
