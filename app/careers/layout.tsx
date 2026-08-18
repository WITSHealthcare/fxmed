import type { ReactNode } from 'react'
import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Careers at FXMed | Healthcare & Nursing Jobs in Lagos',
  description: 'Current job openings at FXMed (WITS Functional Medicine) in Lagos, Nigeria. Explore nursing, clinical, patient engagement and digital health roles and apply today.',
  path: '/careers',
  keywords: [
    'healthcare jobs Lagos',
    'nursing jobs Lagos',
    'nurse jobs Nigeria',
    'digital health jobs Nigeria',
    'patient engagement specialist Lagos',
    'functional medicine jobs Nigeria',
    'medical jobs Lekki',
    'FXMed careers',
  ],
})


const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Careers', path: '/careers' }])

export default function CareersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
