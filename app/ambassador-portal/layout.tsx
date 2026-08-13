import type { ReactNode } from 'react'
import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Ambassador Portal | FXMed',
  description: 'Manage FXMed Elite Ambassador referrals, earnings, resources, and account details.',
  path: '/ambassador-portal',
  noIndex: true,
})

export default function AmbassadorPortalLayout({ children }: { children: ReactNode }) {
  return children
}
