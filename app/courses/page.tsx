import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { CourseFacts } from '@/components/training/CoursePreview'
import { createMetadata } from '@/lib/seo'
import { formatPrice } from '@/lib/training'
import { getPublicCourses } from '@/lib/training-public'

export const revalidate = 300

export const metadata = createMetadata({
  title: 'Functional Medicine Courses | FXMed',
  description: 'Self-paced functional medicine courses from the FXMed clinical team, with quizzes and a certificate on completion.',
  path: '/courses',
  keywords: ['functional medicine course', 'FXMed courses', 'health education Nigeria', 'online course certificate'],
})

export default async function CoursesPage() {
  const courses = await getPublicCourses()
  return <main className="min-h-screen bg-[#FCFFF0]">
    <Navigation />
    <section className="bg-gradient-to-br from-green-deep to-green-mid px-[5%] pb-16 pt-40 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="font-dm-sans text-xs font-bold uppercase tracking-[0.16em] text-gold">FXMed courses</p>
        <h1 className="mt-3 font-dm-sans text-4xl font-bold md:text-5xl">Learn functional medicine with FXMed</h1>
        <p className="mt-4 max-w-2xl font-dm-sans text-lg text-white/80">Self-paced courses from our clinical team. Preview any course before you enrol, learn at your own pace, and earn a certificate.</p>
        <Link href="/learn/login" className="mt-6 inline-block font-dm-sans text-sm font-bold text-gold underline underline-offset-4">Already enrolled? Sign in →</Link>
      </div>
    </section>
    <section className="px-[5%] py-14">
      <div className="mx-auto max-w-5xl">
        {!courses.length ? <p className="rounded-[20px] border bg-white p-16 text-center font-dm-sans text-text-mid">New courses are coming soon.</p>
          : <div className="grid gap-6 md:grid-cols-2">{courses.map((course) => <Link key={course.id} href={`/courses/${course.slug}`} className="group overflow-hidden rounded-[24px] border border-green-deep/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            {course.cover_image_url ? <img src={course.cover_image_url} alt="" className="h-48 w-full object-cover" /> : <div className="h-48 bg-gradient-to-br from-green-deep to-green-mid" />}
            <div className="p-6 font-dm-sans">
              <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold text-green-deep group-hover:underline">{course.title}</h2><span className="shrink-0 rounded-full bg-gold px-3 py-1 text-sm font-bold text-green-deep">{formatPrice(course.price_kobo, course.currency)}</span></div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-mid">{course.summary || course.description}</p>
              <div className="mt-4"><CourseFacts preview={course} showPrice={false} /></div>
            </div>
          </Link>)}</div>}
      </div>
    </section>
    <Footer />
  </main>
}
