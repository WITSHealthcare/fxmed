import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMedicalWebPageJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Autism Support Program | FXMed',
  description:
    'Support your autistic child with FXMed’s Autism Support program, gut health, nutrition, sleep and family support from a functional medicine team.',
  path: '/programs/autism-support',
  keywords: ['autism support', 'autism nutrition', 'autism gut health', 'functional medicine autism'],
})


const medicalPageJsonLd = createMedicalWebPageJsonLd({
  name: 'Autism Support Program',
  description: 'Support your autistic child with FXMed’s Autism Support program, gut health, nutrition, sleep and family support from a functional medicine team.',
  path: '/programs/autism-support',
  condition: 'Autism spectrum disorder',
})

const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Programs', path: '/programs' }, { name: 'Autism Support', path: '/programs/autism-support' }])

export default function AutismSupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, medicalPageJsonLd]} />
      {children}
    </>
  )
}
