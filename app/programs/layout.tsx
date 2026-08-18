import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Nutri-Shift Functional Medicine Programs | FXMed',
  description:
    'Choose an FXMed Nutri-Shift program for adrenal reset, gut repair, hormone balance, thyroid recovery and immune support using food, lifestyle and advanced testing.',
  path: '/programs',
  image: '/3d-medical-background-with-virus-cells-dna-strand.jpg',
  keywords: ['functional medicine programs', 'gut repair program', 'hormone balance', 'thyroid recovery'],
})


export default function ProgramsLayout({ children }: { children: React.ReactNode }) {
  return children
}
