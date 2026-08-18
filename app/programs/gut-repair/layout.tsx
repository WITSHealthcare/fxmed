import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMedicalWebPageJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Gut Repair Program | FXMed',
  description:
    'Repair digestive health with FXMed’s Gut Repair program for leaky gut support, nutrition planning, detox lifestyle guidance and advanced testing.',
  path: '/programs/gut-repair',
  keywords: ['gut repair', 'leaky gut program', 'digestive health', 'functional nutrition'],
})


const medicalPageJsonLd = createMedicalWebPageJsonLd({
  name: 'Gut Repair Program',
  description: 'Repair digestive health with FXMed’s Gut Repair program for leaky gut support, nutrition planning, detox lifestyle guidance and advanced testing.',
  path: '/programs/gut-repair',
  condition: 'Digestive disorder',
})

const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Programs', path: '/programs' }, { name: 'Gut Repair', path: '/programs/gut-repair' }])

export default function GutRepairLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, medicalPageJsonLd]} />
      {children}
    </>
  )
}
