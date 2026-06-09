import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Maternal Wellness Packages | FXMed',
  description:
    'FXMed maternal wellness packages support pre-conception, antenatal care, postnatal recovery and fertility with home-based functional healthcare.',
  path: '/maternal-wellness',
  image: '/black-pregnant-women-posing.jpg',
  keywords: ['maternal wellness', 'pregnancy wellness', 'antenatal care', 'postnatal care', 'fertility support'],
})

export default function MaternalWellnessLayout({ children }: { children: React.ReactNode }) {
  return children
}
