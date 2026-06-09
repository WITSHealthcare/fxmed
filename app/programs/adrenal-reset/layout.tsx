import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Adrenal Reset Program | FXMed',
  description:
    'Restore energy, improve sleep and address stress patterns with FXMed’s Adrenal Reset functional medicine program.',
  path: '/programs/adrenal-reset',
  keywords: ['adrenal reset', 'chronic fatigue support', 'stress and sleep program'],
})

export default function AdrenalResetLayout({ children }: { children: React.ReactNode }) {
  return children
}
