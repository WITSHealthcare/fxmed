import { createClient } from '@supabase/supabase-js'
import CareersContent from '@/components/careers/CareersContent'
import JsonLd from '@/components/JsonLd'
import { createJobPostingJsonLd, type CareerOpening } from '@/lib/careers'

// Fetch openings at request time so publishing from the admin dashboard shows
// up immediately and deploy builds do not depend on Supabase reachability.
export const dynamic = 'force-dynamic'

async function getOpenings(): Promise<CareerOpening[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  try {
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await supabase
      .from('career_openings')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load career openings:', error)
      return []
    }
    return (data || []) as CareerOpening[]
  } catch (error) {
    console.error('Failed to load career openings:', error)
    return []
  }
}

export default async function CareersPage() {
  const openings = await getOpenings()
  return (
    <>
      {/* Emitted server-side so every published role is eligible for Google Jobs. */}
      {openings.length > 0 && <JsonLd data={openings.map(createJobPostingJsonLd)} />}
      <CareersContent openings={openings} />
    </>
  )
}
