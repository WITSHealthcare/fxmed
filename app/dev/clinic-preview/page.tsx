import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import Preview from './Preview'

// A development-only look at the clinic theme: the admin frame and the patient
// portal filled with made-up sample data, so the design can be checked
// without signing in. Not served in production.
export const metadata = { title: 'Clinic theme preview', robots: { index: false, follow: false } }

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export default function ClinicPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <div className={inter.variable}><Suspense><Preview /></Suspense></div>
}
