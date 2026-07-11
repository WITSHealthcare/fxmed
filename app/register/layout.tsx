import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Outreach Registration | FXMed',
  description: 'Register your details at an FXMed outreach.',
  path: '/register',
  noIndex: true,
})

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
