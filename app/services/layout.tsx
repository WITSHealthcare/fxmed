import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMedicalWebPageJsonLd, createMetadata, serviceCatalog, serviceOfferJsonLd, siteUrl } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Functional Medicine Services | FXMed',
  description:
    'Explore FXMed services including virtual consults, concierge medicine, home lab investigations, nutrition counselling, specialist consultations and pregnancy wellness.',
  path: '/services',
  image: '/Equipment.jpg',
  keywords: ['functional medicine services', 'concierge medicine', 'home lab tests', 'nutrition counselling'],
})


const servicesPageJsonLd = [
  createMedicalWebPageJsonLd({
    name: 'FXMed Services',
    description: 'Functional medicine, concierge care, lab investigations, nutrition counselling and mobile healthcare across Lagos and Texas.',
    path: '/services',
  }),
  {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'FXMed Services',
    url: `${siteUrl}/services`,
    provider: { '@id': `${siteUrl}/#organization` },
    itemListElement: serviceCatalog.map(serviceOfferJsonLd),
  },
]

const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }])

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, ...servicesPageJsonLd]} />
      {children}
    </>
  )
}
