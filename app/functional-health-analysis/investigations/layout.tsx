import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Functional Health Investigations | FXMed',
  description: 'Private personalized health investigation recommendations.',
  path: '/functional-health-analysis/investigations',
  noIndex: true,
})

export default function InvestigationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
