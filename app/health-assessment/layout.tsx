import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Health Risk Assessment | FXMed',
  description:
    'Take FXMed’s health risk assessment to understand your wellness priorities and identify next steps for preventive, functional healthcare.',
  path: '/health-assessment',
  keywords: ['health risk assessment', 'preventive health screening', 'wellness assessment'],
})

export default function HealthAssessmentLayout({ children }: { children: React.ReactNode }) {
  return children
}
