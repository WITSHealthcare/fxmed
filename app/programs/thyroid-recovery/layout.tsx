import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMedicalWebPageJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Thyroid Recovery Program | FXMed',
  description:
    'Find root causes of thyroid symptoms with FXMed’s Thyroid Recovery program, including comprehensive testing, nutrition and targeted support.',
  path: '/programs/thyroid-recovery',
  keywords: ['thyroid recovery', 'thyroid symptoms', 'functional medicine thyroid support'],
})


const medicalPageJsonLd = createMedicalWebPageJsonLd({
  name: 'Thyroid Recovery Program',
  description: 'Find root causes of thyroid symptoms with FXMed’s Thyroid Recovery program, including comprehensive testing, nutrition and targeted support.',
  path: '/programs/thyroid-recovery',
  condition: 'Thyroid disorder',
})

const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Programs', path: '/programs' }, { name: 'Thyroid Recovery', path: '/programs/thyroid-recovery' }])

export default function ThyroidRecoveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, medicalPageJsonLd]} />
      {children}
    </>
  )
}
