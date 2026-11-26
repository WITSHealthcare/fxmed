import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Preview from './Preview'

// A development-only look at the clinic theme: the admin frame and the patient
// portal filled with made-up sample data, so the design can be checked
// without signing in. Not served in production.
export const metadata = { title: 'Clinic theme preview', robots: { index: false, follow: false } }

const clinicFont = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-clinic', display: 'swap' })

export default function ClinicPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <div className={clinicFont.variable}><Suspense><Preview /></Suspense></div>
}
