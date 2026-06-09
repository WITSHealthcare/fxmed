import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'FXMed Elite Concierge Healthcare',
  description:
    'FXMed Elite provides private concierge healthcare, mobile clinic visits, chronic disease support, geriatric care, teleconsults and medication delivery.',
  path: '/elite',
  image: '/Hero Background.jpeg',
  keywords: ['concierge healthcare', 'private healthcare', 'mobile clinic', 'geriatric care', 'chronic disease management'],
})

export default function EliteLayout({ children }: { children: React.ReactNode }) {
  return children
}
