import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Request Functional Health Analysis | FXMed',
  description: 'Private functional health analysis request form.',
  path: '/functional-health-analysis/form',
  noIndex: true,
})

export default function FunctionalHealthAnalysisFormLayout({ children }: { children: React.ReactNode }) {
  return children
}
