import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMedicalWebPageJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Hormone Balance Program | FXMed',
  description:
    'Rebalance hormones with FXMed’s six-month functional medicine program using advanced testing, nutrition and ongoing clinical support.',
  path: '/programs/hormone-balance',
  keywords: ['hormone balance', 'hormonal health', 'functional medicine hormone program'],
})


const medicalPageJsonLd = createMedicalWebPageJsonLd({
  name: 'Hormone Balance Program',
  description: 'Rebalance hormones with FXMed’s six-month functional medicine program using advanced testing, nutrition and ongoing clinical support.',
  path: '/programs/hormone-balance',
  condition: 'Hormonal imbalance',
})

const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Programs', path: '/programs' }, { name: 'Hormone Balance', path: '/programs/hormone-balance' }])

export default function HormoneBalanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, medicalPageJsonLd]} />
      {children}
    </>
  )
}
