import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { absoluteUrl, siteUrl } from '@/lib/seo'
import { topicPath } from '@/lib/blog'

// IndexNow tells Bing, Yandex and other participating engines about a changed
// URL straight away instead of waiting for their next crawl. Google does not
// take part; it picks changes up from the revalidated sitemap. Disabled until
// INDEXNOW_KEY is set, and never sent from a local or preview host.
async function submitToIndexNow(urls: string[]) {
  const key = process.env.INDEXNOW_KEY
  if (!key || urls.length === 0) return
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return

  const host = new URL(siteUrl).host
  if (host.startsWith('localhost') || host.startsWith('127.')) return

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: absoluteUrl('/indexnow-key.txt'), urlList: urls }),
    })
    if (!response.ok) console.error('IndexNow submission failed:', response.status, await response.text())
  } catch (error) {
    console.error('IndexNow submission failed:', error)
  }
}

type ChangedPost = { slug?: string | null; category?: string | null; status?: string | null }

// Call after any write to blog_posts. Refreshes the cached article, its topic
// hub, the blog index and the sitemap so the change is live immediately, then
// pings IndexNow after the response has been sent.
export function onBlogPostsChanged(posts: ChangedPost[]) {
  const paths = new Set(['/blog', '/sitemap.xml'])
  for (const post of posts) {
    if (post.slug) paths.add(`/blog/${post.slug}`)
    if (post.category) paths.add(topicPath(post.category))
  }
  paths.forEach((path) => revalidatePath(path))

  // Only published or removed posts are worth announcing; a draft save is not.
  const urls = posts
    .filter((post) => post.slug && post.status !== 'draft')
    .flatMap((post) => [absoluteUrl(`/blog/${post.slug}`), ...(post.category ? [absoluteUrl(topicPath(post.category))] : [])])
  if (urls.length) after(() => submitToIndexNow(Array.from(new Set([...urls, absoluteUrl('/blog')]))))
}
