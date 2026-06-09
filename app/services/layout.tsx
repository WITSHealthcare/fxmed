import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Functional Medicine Services | FXMed',
  description:
    'Explore FXMed services including virtual consults, concierge medicine, home lab investigations, nutrition counselling, specialist consultations and pregnancy wellness.',
  path: '/services',
  image: '/Equipment.jpg',
  keywords: ['functional medicine services', 'concierge medicine', 'home lab tests', 'nutrition counselling'],
})

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children
}
