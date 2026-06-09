import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Hormone Balance Program | FXMed',
  description:
    'Rebalance hormones with FXMed’s six-month functional medicine program using advanced testing, nutrition and ongoing clinical support.',
  path: '/programs/hormone-balance',
  keywords: ['hormone balance', 'hormonal health', 'functional medicine hormone program'],
})

export default function HormoneBalanceLayout({ children }: { children: React.ReactNode }) {
  return children
}
