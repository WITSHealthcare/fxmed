import type { ReactNode } from 'react'
import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Patient Portal | FXMed',
  description: 'View your FXMed care plan, shared documents and messages from your care team.',
  path: '/patient-portal',
  noIndex: true,
})

export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  return children
}
