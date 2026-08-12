import type { ReactNode } from 'react'
import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'FXMed Elite Ambassador Program | FXMed',
  description: 'Join the FXMed Elite Ambassador Program and connect your network with concierge functional medicine and premium personalized healthcare.',
  path: '/ambassadors',
  keywords: ['FXMed Elite ambassador', 'healthcare ambassador program', 'concierge healthcare partnership Nigeria'],
})

export default function AmbassadorsLayout({ children }: { children: ReactNode }) {
  return children
}
