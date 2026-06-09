import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Functional Health Analysis Results | FXMed',
  description: 'Private functional health analysis results.',
  path: '/functional-health-analysis/results',
  noIndex: true,
})

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children
}
