import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { ambassadorStatuses } from '@/lib/ambassador-applications'

function getDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    : null
}

export async function GET(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'ambassador')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const database = getDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = (searchParams.get('search') || '').trim().slice(0, 100)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
    const from = (page - 1) * pageSize

    let query = database
      .from('ambassador_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (status && ambassadorStatuses.includes(status as typeof ambassadorStatuses[number])) {
      query = query.eq('status', status)
    }
    if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    if (search) {
      const safeSearch = search.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim()
      if (safeSearch) {
        query = query.or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
      }
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ applications: data || [], total: count || 0, page, pageSize })
  } catch (error) {
    console.error('Error fetching ambassador applications:', error)
    return NextResponse.json({ error: 'Failed to fetch ambassador applications.' }, { status: 500 })
  }
}
