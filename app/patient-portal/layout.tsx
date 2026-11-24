import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Patient Portal | FXMed',
  description: 'View your FXMed care plan, shared documents and messages from your care team.',
  path: '/patient-portal',
  noIndex: true,
})

// The portal wears the clinic theme (.clinic-theme in app/globals.css), which
// sets Inter through this variable, as the admin does.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  return <div className={inter.variable}>{children}</div>
}
