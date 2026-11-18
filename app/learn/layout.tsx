import type { ReactNode } from 'react'
import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'My Courses | FXMed',
  description: 'Your FXMed courses, progress and certificates.',
  path: '/learn',
  noIndex: true,
})

export default function LearnLayout({ children }: { children: ReactNode }) {
  return children
}
