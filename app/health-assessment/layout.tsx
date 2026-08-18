import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Health Risk Assessment | FXMed',
  description:
    'Take FXMed’s health risk assessment to understand your wellness priorities and identify next steps for preventive, functional healthcare.',
  path: '/health-assessment',
  keywords: ['health risk assessment', 'preventive health screening', 'wellness assessment'],
})


const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Health Assessment', path: '/health-assessment' }])

export default function HealthAssessmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
