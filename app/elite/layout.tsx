import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'FXMed Elite Concierge Healthcare',
  description:
    'FXMed Elite provides private concierge healthcare, mobile clinic visits, chronic disease support, geriatric care, teleconsults and medication delivery.',
  path: '/elite',
  image: '/Hero Background.jpeg',
  keywords: ['concierge healthcare', 'private healthcare', 'mobile clinic', 'geriatric care', 'chronic disease management'],
})


const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'FXMed Elite', path: '/elite' }])

export default function EliteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
