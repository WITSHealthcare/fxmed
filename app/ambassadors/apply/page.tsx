import AmbassadorApplicationForm from '@/components/AmbassadorApplicationForm'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import Navigation from '@/components/Navigation'
import { createBreadcrumbJsonLd, createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'Apply to the FXMed Elite Ambassador Program | FXMed',
  description: 'Submit your application to become an FXMed Elite Ambassador.',
  path: '/ambassadors/apply',
})

const breadcrumbJsonLd = createBreadcrumbJsonLd([
  { name: 'Home', path: '/' },
  { name: 'Ambassadors', path: '/ambassadors' },
  { name: 'Apply', path: '/ambassadors/apply' },
])

export default function AmbassadorApplicationPage() {
  return (
    <main className="min-h-screen bg-cream">
      <JsonLd data={breadcrumbJsonLd} />
      <Navigation />
      <section className="bg-green-deep px-[5%] pb-20 pt-48 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="font-dm-sans text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight">Apply to become an FXMed Elite Ambassador</h1>
          <p className="mx-auto mt-5 max-w-2xl font-dm-sans text-lg leading-8 text-cream/75">Tell us about your background, network, and interest in connecting suitable individuals and organizations with FXMed Elite. Fields marked * are required.</p>
        </div>
      </section>
      <section className="px-[5%] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <AmbassadorApplicationForm />
        </div>
      </section>
      <Footer />
    </main>
  )
}
