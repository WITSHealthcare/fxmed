import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Thyroid Recovery Program | FXMed',
  description:
    'Find root causes of thyroid symptoms with FXMed’s Thyroid Recovery program, including comprehensive testing, nutrition and targeted support.',
  path: '/programs/thyroid-recovery',
  keywords: ['thyroid recovery', 'thyroid symptoms', 'functional medicine thyroid support'],
})

export default function ThyroidRecoveryLayout({ children }: { children: React.ReactNode }) {
  return children
}
