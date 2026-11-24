import { Suspense } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'
import AdminShell from '@/components/admin/shell/AdminShell'

// The admin uses Plus Jakarta Sans (as the FxMed Twin does); the public site keeps its own fonts.
const clinicFont = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-clinic', display: 'swap' })

// Every signed-in admin page shares the sidebar, header and role gate.
// The shell reads the URL's query (useSearchParams), so it sits in Suspense.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className={clinicFont.variable}><Suspense><AdminShell>{children}</AdminShell></Suspense></div>
}
