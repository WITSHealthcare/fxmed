import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd, createMedicalWebPageJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Immune Support Program | FXMed',
  description:
    'Strengthen immune health with FXMed’s Immune Support program, micronutrient assessment, immune nutrition guidance and lifestyle support.',
  path: '/programs/immune-support',
  keywords: ['immune support', 'micronutrient assessment', 'immune nutrition'],
})


const medicalPageJsonLd = createMedicalWebPageJsonLd({
  name: 'Immune Support Program',
  description: 'Strengthen immune health with FXMed’s Immune Support program, micronutrient assessment, immune nutrition guidance and lifestyle support.',
  path: '/programs/immune-support',
  condition: 'Immune dysfunction',
})

const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Programs', path: '/programs' }, { name: 'Immune Support', path: '/programs/immune-support' }])

export default function ImmuneSupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, medicalPageJsonLd]} />
      {children}
    </>
  )
}
