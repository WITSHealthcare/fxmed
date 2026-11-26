import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CourseEnrolButton from '@/components/training/CourseEnrolButton'
import { CourseFacts, CourseOutline } from '@/components/training/CoursePreview'
import { absoluteUrl, createMetadata, jsonLdScript, organizationId } from '@/lib/seo'
import { formatPrice } from '@/lib/training'
import { getPublicCourse } from '@/lib/training-public'

export const revalidate = 300
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const course = await getPublicCourse(slug)
  if (!course) return createMetadata({ title: 'Course Not Found | FXMed', description: 'This FXMed course could not be found.', path: `/courses/${slug}`, noIndex: true })
  return createMetadata({
    title: `${course.title} | FXMed Courses`,
    description: (course.summary || course.description).slice(0, 155),
    path: `/courses/${course.slug}`,
    image: course.cover_image_url || undefined,
    keywords: ['FXMed course', 'functional medicine', course.title],
    noIndex: !course.listed,
  })
}

// The course landing page: what it covers, the outline, the price, and enrolment.
export default async function CoursePage({ params }: Props) {
  const { slug } = await params
  const course = await getPublicCourse(slug)
  if (!course) notFound()
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Course', name: course.title, description: course.summary || course.description,
    url: absoluteUrl(`/courses/${course.slug}`), provider: { '@id': organizationId },
    offers: { '@type': 'Offer', price: (course.price_kobo / 100).toFixed(2), priceCurrency: course.currency, category: course.price_kobo ? 'Paid' : 'Free' },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: course.total_minutes ? `PT${course.total_minutes}M` : undefined },
  }
  return <main className="min-h-screen bg-[#FCFFF0]">
    {course.listed && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />}
    <Navigation />
    <section className="bg-gradient-to-br from-green-deep to-green-mid px-[5%] pb-14 pt-40 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_320px] md:items-end">
        <div className="font-dm-sans">
          <Link href="/courses" className="text-sm font-bold text-gold hover:underline">← All courses</Link>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">{course.title}</h1>
          {course.summary && <p className="mt-4 text-lg text-white/85">{course.summary}</p>}
        </div>
        <div className="rounded-[24px] bg-white p-6 font-dm-sans text-green-deep shadow-2xl">
          {course.cover_image_url && <img src={course.cover_image_url} alt="" className="-mx-6 -mt-6 mb-5 h-40 w-[calc(100%+3rem)] max-w-none rounded-t-[24px] object-cover" />}
          <p className="text-3xl font-bold">{formatPrice(course.price_kobo, course.currency)}</p>
          <div className="mt-4"><CourseEnrolButton slug={course.slug!} paid={course.price_kobo > 0} /></div>
          <p className="mt-3 text-xs text-text-mid">Self-paced · online{course.certificate_enabled ? ' · certificate included' : ''}</p>
        </div>
      </div>
    </section>
    <section className="px-[5%] py-14">
      <div className="mx-auto max-w-5xl space-y-8 font-dm-sans">
        <CourseFacts preview={course} />
        {course.description && <div><h2 className="text-2xl font-bold text-green-deep">About this course</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-text-mid">{course.description}</p></div>}
        <CourseOutline preview={course} />
      </div>
    </section>
    <Footer />
  </main>
}
