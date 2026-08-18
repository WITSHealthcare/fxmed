import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Functional Health Analysis | FXMed',
  description:
    'Request an FXMed functional health analysis to uncover health patterns, risk factors, lab insights and personalized wellness strategies.',
  path: '/functional-health-analysis',
  image: '/team-young-nurses-learning-practice-from-doctor-expert-cabinet.jpg',
  keywords: ['functional health analysis', 'health risk assessment', 'lab analysis', 'personalized wellness plan'],
})


const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Functional Health Analysis', path: '/functional-health-analysis' }])

export default function FunctionalHealthAnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
