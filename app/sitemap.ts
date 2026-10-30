import type { MetadataRoute } from 'next'
import { absoluteUrl, publicRoutes } from '@/lib/seo'
import { MIN_INDEXABLE_TOPIC_POSTS, getPublishedPostSummaries, groupTopics, topicPath } from '@/lib/blog'

// Without this the sitemap is prerendered once at build, so articles published
// after a deploy stay invisible to crawlers until the next deploy. Publishing
// also revalidates it on demand (see lib/blog-publish.ts).
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const blogPosts = await getPublishedPostSummaries()
  const newestPost = blogPosts[0]

  const staticEntries = publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    // The blog index changes whenever a post is published, not when its code does.
    lastModified:
      route.path === '/blog' && newestPost
        ? new Date(newestPost.updated_at || newestPost.created_at)
        : new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  })) satisfies MetadataRoute.Sitemap

  const blogEntries = blogPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updated_at || post.created_at ? new Date(post.updated_at || post.created_at) : now,
    changeFrequency: 'monthly',
    priority: 0.6,
  })) satisfies MetadataRoute.Sitemap

  const topicEntries = groupTopics(blogPosts)
    .filter((topic) => topic.count >= MIN_INDEXABLE_TOPIC_POSTS)
    .map((topic) => {
      const newest = blogPosts.find((post) => post.category === topic.name)
      return {
        url: absoluteUrl(topicPath(topic.name)),
        lastModified: newest ? new Date(newest.updated_at || newest.created_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }
    }) satisfies MetadataRoute.Sitemap

  return [...staticEntries, ...topicEntries, ...blogEntries]
}
