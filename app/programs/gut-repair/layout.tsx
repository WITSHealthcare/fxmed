import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Gut Repair Program | FXMed',
  description:
    'Repair digestive health with FXMed’s Gut Repair program for leaky gut support, nutrition planning, detox lifestyle guidance and advanced testing.',
  path: '/programs/gut-repair',
  keywords: ['gut repair', 'leaky gut program', 'digestive health', 'functional nutrition'],
})

export default function GutRepairLayout({ children }: { children: React.ReactNode }) {
  return children
}
