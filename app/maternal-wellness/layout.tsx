import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Maternal Wellness Packages | FXMed',
  description:
    'FXMed maternal wellness packages support pre-conception, antenatal care, postnatal recovery and fertility with home-based functional healthcare.',
  path: '/maternal-wellness',
  image: '/black-pregnant-women-posing.jpg',
  keywords: ['maternal wellness', 'pregnancy wellness', 'antenatal care', 'postnatal care', 'fertility support'],
})


const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Maternal Wellness', path: '/maternal-wellness' }])

export default function MaternalWellnessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
