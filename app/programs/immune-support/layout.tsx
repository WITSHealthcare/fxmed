import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Immune Support Program | FXMed',
  description:
    'Strengthen immune health with FXMed’s Immune Support program, micronutrient assessment, immune nutrition guidance and lifestyle support.',
  path: '/programs/immune-support',
  keywords: ['immune support', 'micronutrient assessment', 'immune nutrition'],
})

export default function ImmuneSupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
