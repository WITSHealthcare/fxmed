import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { createMetadata } from '@/lib/seo'
import { getTrainingDatabase } from '@/lib/training'
import { findCertificate } from '@/lib/trainingCertificatePdf'

export const dynamic = 'force-dynamic'
export const metadata = createMetadata({ title: 'Certificate Verification | FXMed', description: 'Check that an FXMed course certificate is genuine.', path: '/courses/certificates', noIndex: true })

// Anyone with a certificate number can confirm who earned it, for which course, and when.
export default async function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const database = getTrainingDatabase()
  const certificate = database ? await findCertificate(database, id.toUpperCase()).catch(() => null) : null
  if (!certificate) notFound()
  const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(certificate.completedAt))
  return <main className="min-h-screen bg-[#FCFFF0]">
    <Navigation />
    <section className="px-[5%] pb-20 pt-44">
      <div className="mx-auto max-w-xl rounded-[28px] border border-green-deep/10 bg-white p-8 text-center font-dm-sans shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-mid">Certificate verified</p>
        <div aria-hidden className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl text-green-mid">✓</div>
        <h1 className="mt-4 text-3xl font-bold text-green-deep">{certificate.name}</h1>
        <p className="mt-2 text-text-mid">completed</p>
        <p className="mt-1 text-xl font-bold text-green-deep">{certificate.course}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-[#fbfaf6] p-4 text-sm"><div><dt className="text-xs text-text-mid">Completed</dt><dd className="font-bold text-green-deep">{date}</dd></div><div><dt className="text-xs text-text-mid">Certificate</dt><dd className="font-bold text-green-deep">{certificate.id}</dd></div></dl>
        <Link href="/courses" className="mt-6 inline-block text-sm font-bold text-green-mid underline">Browse FXMed courses</Link>
      </div>
    </section>
    <Footer />
  </main>
}
