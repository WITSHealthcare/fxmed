import PublicFormPage from '@/components/forms/PublicFormPage'
import { createMetadata } from '@/lib/seo'

// Forms are shared by link, so they stay out of search results.
export const metadata = createMetadata({
  title: 'FXMed | Form',
  description: 'Share your answers with the FXMed team.',
  path: '/forms',
  noIndex: true,
})

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PublicFormPage slug={slug} />
}
