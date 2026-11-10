import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { stripHtml } from '@/lib/content-sanitizer'
import { absoluteUrl, createBreadcrumbJsonLd, createMetadata, organizationId, siteName } from '@/lib/seo'
import {
  MIN_INDEXABLE_TOPIC_POSTS,
  careLinkFor,
  getPublishedPostSummaries,
  groupTopics,
  topicIntro,
  topicPath,
  topicSlug,
} from '@/lib/blog'

// Topic hubs: one crawlable page per blog category. The blog index filters by
// category on the client, which crawlers cannot follow, so without these the
// only route from Google to most articles is the sitemap.
export const revalidate = 600

export async function generateStaticParams() {
  const posts = await getPublishedPostSummaries()
  return groupTopics(posts).map((topic) => ({ topic: topic.slug }))
}

async function getTopic(slug: string) {
  const posts = await getPublishedPostSummaries()
  const topics = groupTopics(posts)
  const topic = topics.find((item) => item.slug === slug)
  if (!topic) return null
  return {
    topic,
    topics,
    posts: posts.filter((post) => topicSlug(post.category || '') === slug),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const data = await getTopic(slug)

  if (!data) {
    return createMetadata({
      title: 'Topic Not Found | FXMed',
      description: 'This FXMed blog topic could not be found.',
      path: `/blog/topic/${slug}`,
      noIndex: true,
    })
  }

  return createMetadata({
    title: `${data.topic.name} Articles | FXMed Health Blog`,
    description: topicIntro(data.topic).slice(0, 155),
    path: topicPath(data.topic.name),
    image: '/blog/functional-medicine.jpg',
    keywords: [data.topic.name, `${data.topic.name} Nigeria`, `${data.topic.name} Lagos`, 'functional medicine', 'FXMed'],
    noIndex: data.posts.length < MIN_INDEXABLE_TOPIC_POSTS,
  })
}

export default async function BlogTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const data = await getTopic(slug)
  if (!data) notFound()

  const { topic, topics, posts } = data
  const path = topicPath(topic.name)
  const intro = topicIntro(topic)
  // The care link most articles in this topic point to.
  const careLink = careLinkFor({ title: '', category: topic.name })
  const otherTopics = topics.filter((item) => item.slug !== topic.slug)

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${topic.name} Articles`,
    description: intro,
    url: absoluteUrl(path),
    publisher: { '@id': organizationId },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/blog/${post.slug}`),
        name: post.title,
      })),
    },
  }
  const breadcrumbJsonLd = createBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: topic.name, path },
  ])

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd]} />
      <Navigation />

      <section className="pt-[180px] px-[5%]">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Breadcrumb" className="mb-6 font-dm-sans text-[0.9rem] text-text-mid">
            <Link href="/" className="text-green-mid no-underline hover:underline">Home</Link>
            {' / '}
            <Link href="/blog" className="text-green-mid no-underline hover:underline">Blog</Link>
            {' / '}
            <span>{topic.name}</span>
          </nav>

          <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
            {posts.length} {posts.length === 1 ? 'article' : 'articles'}
          </div>
          <h1 className="font-dm-sans font-bold text-green-deep text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.1] mb-5">
            {topic.name}
          </h1>
          <p className="font-dm-sans text-text-mid text-[1.15rem] leading-[1.7] max-w-[720px] mb-8">{intro}</p>

          <Link
            href={careLink.href}
            className="inline-block font-dm-sans bg-green-deep text-white px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] no-underline transition-all hover:opacity-90"
          >
            {careLink.label}
          </Link>
        </div>
      </section>

      <section className="px-[5%] py-14">
        <ul className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="block h-full bg-white rounded-[16px] p-6 border border-green-deep/8 shadow-sm hover:shadow-md transition-shadow no-underline"
              >
                <h2 className="font-dm-sans font-semibold text-green-deep text-[1.15rem] leading-[1.35] mb-2">{post.title}</h2>
                <p className="font-dm-sans text-text-mid text-[0.92rem] leading-[1.6] mb-3">
                  {stripHtml(post.excerpt || '').slice(0, 160)}
                </p>
                <div className="text-green-mid text-[0.85rem] font-medium">{post.read_time}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {otherTopics.length > 0 && (
        <section className="px-[5%] pb-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-dm-sans font-bold text-green-deep text-[1.6rem] mb-5">More health topics from {siteName}</h2>
            <ul className="flex flex-wrap gap-3 list-none p-0">
              {otherTopics.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={topicPath(item.name)}
                    className="inline-block font-dm-sans text-green-deep bg-white border border-green-deep/15 px-4 py-2 rounded-[50px] text-[0.9rem] no-underline hover:bg-green-deep hover:text-white transition-all"
                  >
                    {item.name} ({item.count})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Footer />
    </main>
  )
}
