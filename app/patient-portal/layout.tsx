import type { ReactNode } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Patient Portal | FXMed',
  description: 'View your FXMed care plan, shared documents and messages from your care team.',
  path: '/patient-portal',
  noIndex: true,
})

// The portal wears the clinic theme (.clinic-theme in app/globals.css), which
// sets Plus Jakarta Sans through this variable, as the admin does.
const clinicFont = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-clinic', display: 'swap' })

export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  return <div className={clinicFont.variable}>{children}</div>
}
