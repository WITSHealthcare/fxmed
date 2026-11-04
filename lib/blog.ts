import { createClient } from '@supabase/supabase-js'

// Shared by the public blog routes, the topic hubs and the sitemap. Uses the
// anon key, so it only ever sees rows that RLS exposes publicly.
export function getPublicBlogClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return null

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type BlogPostSummary = {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  read_time: string
  created_at: string
  updated_at?: string | null
}

export async function getPublishedPostSummaries(): Promise<BlogPostSummary[]> {
  const supabase = getPublicBlogClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id,title,slug,excerpt,category,read_time,created_at,updated_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch published blog posts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch published blog posts:', error)
    return []
  }
}

// Topic hubs are derived from the free-text category on each post, so a new
// category gets a hub automatically. 'Lab & Diagnostics' -> 'lab-diagnostics'.
export function topicSlug(category: string) {
  return category
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function topicPath(category: string) {
  return `/blog/topic/${topicSlug(category)}`
}

// Hubs with fewer posts than this are thin pages: they still render for
// visitors but are kept out of the index and the sitemap.
export const MIN_INDEXABLE_TOPIC_POSTS = 3

export type BlogTopic = { name: string; slug: string; count: number }

export function groupTopics(posts: Pick<BlogPostSummary, 'category'>[]): BlogTopic[] {
  const topics = new Map<string, BlogTopic>()
  for (const post of posts) {
    if (!post.category) continue
    const slug = topicSlug(post.category)
    const topic = topics.get(slug)
    if (topic) topic.count += 1
    else topics.set(slug, { name: post.category, slug, count: 1 })
  }
  return Array.from(topics.values()).sort((a, b) => b.count - a.count)
}

// Hand-written intros for the larger hubs. Anything not listed falls back to a
// generic line, so a new category never ships with an empty description.
const topicIntros: Record<string, string> = {
  'functional-medicine': 'How functional medicine looks for the root causes of chronic symptoms, explained by the FXMed clinical team in Lagos.',
  'lifestyle-longevity': 'Practical guidance on sleep, stress, movement, alcohol and long-term health for busy professionals in Lagos and across Nigeria.',
  'mental-wellness': 'Mood, anxiety, ADHD, personality and eating disorders: what they are, how they are assessed and where support fits in Nigeria.',
  'lab-diagnostics': 'What blood tests, scans and screenings can tell you, why “normal” is not always optimal, and when to ask for further investigation.',
  'mobile-healthcare': 'Conditions that can be assessed, monitored and supported at home through FXMed’s mobile and concierge care in Lagos.',
  'gut-health': 'Digestive pain, reflux, bloating, gut infections and the gut–skin and gut–brain connections, from a functional medicine perspective.',
  autism: 'Autism from early signs and diagnosis through speech, nutrition and adulthood, written for families in Nigeria.',
  'maternal-wellness': 'Pre-conception, pregnancy, antenatal screening and postnatal recovery for women in Lagos and across Nigeria.',
  'hormonal-health': 'Hormone imbalances in women and men, including thyroid, andropause and hormonal causes of fatigue, weight and hair loss.',
  'hormones-metabolism': 'Blood sugar, weight, metabolism and the hormones that drive them, with practical steps for a Nigerian diet.',
  'heart-health': 'Chest pain, arrhythmias, cholesterol and heart disease risk: warning signs, investigation and prevention in Nigeria.',
  'skin-health': 'Acne, eczema, boils, hair loss and other skin conditions, and the internal factors that often drive them.',
  'immune-health': 'Recurrent infections, allergies and immune resilience, and how testing and nutrition support a stronger immune system.',
}

export function topicIntro(topic: BlogTopic) {
  return (
    topicIntros[topic.slug] ||
    `Evidence-based ${topic.name.toLowerCase()} articles from the FXMed functional medicine team in Lagos, Nigeria.`
  )
}

// The FXMed page a reader of an article should be pointed to next. Title
// keywords win over category because they are more specific: a Hashimoto's
// article filed under 'Lifestyle & Longevity' still belongs with thyroid care.
type CareLink = { href: string; label: string; blurb: string }

const careLinks = {
  thyroid: { href: '/programs/thyroid-recovery', label: 'Thyroid Recovery Program', blurb: 'Comprehensive thyroid testing, nutrition and targeted support to find the root cause of thyroid symptoms.' },
  autism: { href: '/programs/autism-support', label: 'Autism Support Program', blurb: 'Gut health testing, nutrition and sleep guidance for autistic children, alongside their existing care.' },
  gut: { href: '/programs/gut-repair', label: 'Gut Repair Program', blurb: 'Comprehensive stool analysis and gut-focused protocols that address digestive symptoms at their source.' },
  hormone: { href: '/programs/hormone-balance', label: 'Hormone Balance Program', blurb: 'Detailed hormone testing and a personalised protocol to restore hormonal balance.' },
  adrenal: { href: '/programs/adrenal-reset', label: 'Adrenal Reset Program', blurb: 'Adrenal testing and a structured plan to rebuild energy, sleep and stress resilience.' },
  immune: { href: '/programs/immune-support', label: 'Immune Support Program', blurb: 'Targeted testing, nutrition and lifestyle support for a more resilient immune system.' },
  maternal: { href: '/maternal-wellness', label: 'Maternal Wellness Packages', blurb: 'Home-based care from pre-conception and fertility through antenatal care and postnatal recovery.' },
  analysis: { href: '/functional-health-analysis', label: 'Functional Health Analysis', blurb: 'A clinician-reviewed analysis of your symptoms, history and labs with a personalised plan.' },
  concierge: { href: '/elite', label: 'FXMed Elite Concierge Care', blurb: 'Private physician access, home visits and ongoing support for chronic and complex conditions.' },
} satisfies Record<string, CareLink>

const titleRules: Array<[RegExp, CareLink]> = [
  [/thyroid|hashimoto/i, careLinks.thyroid],
  [/autis/i, careLinks.autism],
  [/pregnan|antenatal|postnatal|fertility|preconception|breastfeed/i, careLinks.maternal],
  [/gut|digest|bloat|reflux|bowel|candida|amebiasis|oesophag/i, careLinks.gut],
  [/hormone|andropause|menopause|testosterone|pcos/i, careLinks.hormone],
  [/fatigue|tired|burnout|adrenal|can.t sleep/i, careLinks.adrenal],
  [/immun|recurrent.*infection|allerg/i, careLinks.immune],
]

const categoryRules: Record<string, CareLink> = {
  'gut-health': careLinks.gut,
  autism: careLinks.autism,
  'maternal-wellness': careLinks.maternal,
  'hormonal-health': careLinks.hormone,
  'hormones-metabolism': careLinks.hormone,
  'thyroid-health': careLinks.thyroid,
  'immune-health': careLinks.immune,
  'mobile-healthcare': careLinks.concierge,
  'lab-diagnostics': careLinks.analysis,
}

export function careLinkFor(post: { title: string; category?: string | null }): CareLink {
  for (const [pattern, link] of titleRules) {
    if (pattern.test(post.title)) return link
  }
  return (post.category && categoryRules[topicSlug(post.category)]) || careLinks.analysis
}
