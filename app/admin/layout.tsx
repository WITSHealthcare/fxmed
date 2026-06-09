import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'FXMed Admin',
  description: 'FXMed private administration dashboard.',
  path: '/admin',
  noIndex: true,
})

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
