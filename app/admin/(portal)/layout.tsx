import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import AdminShell from '@/components/admin/shell/AdminShell'

// The admin uses Inter; the public site keeps DM Sans.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

// Every signed-in admin page shares the sidebar, header and role gate.
// The shell reads the URL's query (useSearchParams), so it sits in Suspense.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className={inter.variable}><Suspense><AdminShell>{children}</AdminShell></Suspense></div>
}
