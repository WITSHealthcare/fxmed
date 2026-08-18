import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMedicalWebPageJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Adrenal Reset Program | FXMed',
  description:
    'Restore energy, improve sleep and address stress patterns with FXMed’s Adrenal Reset functional medicine program.',
  path: '/programs/adrenal-reset',
  keywords: ['adrenal reset', 'chronic fatigue support', 'stress and sleep program'],
})


const medicalPageJsonLd = createMedicalWebPageJsonLd({
  name: 'Adrenal Reset Program',
  description: 'Restore energy, improve sleep and address stress patterns with FXMed’s Adrenal Reset functional medicine program.',
  path: '/programs/adrenal-reset',
  condition: 'Adrenal fatigue',
})

const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Programs', path: '/programs' }, { name: 'Adrenal Reset', path: '/programs/adrenal-reset' }])

export default function AdrenalResetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, medicalPageJsonLd]} />
      {children}
    </>
  )
}
