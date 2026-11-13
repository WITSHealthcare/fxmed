import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { writeRequestAdminActivity } from '@/lib/admin-activity'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const clean = (value: unknown, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function GET(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'crm')) return NextResponse.json({ error: 'CRM access required' }, { status: 403 })
  if (request.nextUrl.searchParams.get('resource') === 'contacts') {
    const search = clean(request.nextUrl.searchParams.get('search'), 100).replace(new RegExp('[^\\p{L}\\p{N} @+._-]', 'gu'), '').trim()
    let query = db().from('contacts').select('id, full_name, phone, email').order('full_name').limit(50)
    if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Unable to load contacts.' }, { status: 500 })
    return NextResponse.json({ contacts: data })
  }
  const { data, error } = await db().from('crm_prospects').select('*, interactions:crm_prospect_interactions(*)').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.code === '42P01' || error.code === 'PGRST205' ? 'Prospect follow-ups need database migration 054 before they can be used.' : 'Unable to load prospects.' }, { status: 500 })
  return NextResponse.json({ prospects: data })
}

async function save(request: NextRequest, updating: boolean) {
  if (!await getAuthorizedAdminRole(request, 'crm')) return NextResponse.json({ error: 'CRM access required' }, { status: 403 })
  try {
    const body = await request.json()
    const client = db()
    if (body.resource === 'interaction') {
      if (!uuid(body.prospect_id) || !['call','meeting','email','whatsapp','note'].includes(body.kind) || !date(body.occurred_at) || !clean(body.notes, 10000)) return NextResponse.json({ error: 'Choose a prospect, interaction type, date and notes.' }, { status: 400 })
      const { error } = await client.from('crm_prospect_interactions').insert({ prospect_id: body.prospect_id, kind: body.kind, occurred_at: body.occurred_at, notes: clean(body.notes, 10000) })
      if (error) throw error
      await writeRequestAdminActivity(client, request, { action: 'record_prospect_interaction', module: 'CRM', description: 'Recorded prospect interaction', entityType: 'crm_prospect', entityId: body.prospect_id })
      return NextResponse.json({ success: true }, { status: 201 })
    }
    if (!clean(body.name, 200) || !['individual','corporate'].includes(body.kind) || !['new','in_discussion','proposal_sent','won','lost'].includes(body.status) || (body.next_follow_up && !date(body.next_follow_up)) || (updating && !uuid(body.id))) return NextResponse.json({ error: 'Check prospect name, type, status and follow-up date.' }, { status: 400 })
    let contactId: string | undefined
    if (!updating && body.contact_id) {
      if (!uuid(body.contact_id)) return NextResponse.json({ error: 'Choose a valid contact.' }, { status: 400 })
      const { data: contact, error } = await client.from('contacts').select('id').eq('id', body.contact_id).maybeSingle()
      if (error) throw error
      if (!contact) return NextResponse.json({ error: 'This contact no longer exists. Choose another contact.' }, { status: 404 })
      contactId = contact.id
    }
    const values = { ...(contactId ? { contact_id: contactId } : {}), name: clean(body.name, 200), kind: body.kind, contact_person: clean(body.contact_person), phone: clean(body.phone, 80), email: clean(body.email, 254), owner: clean(body.owner, 200), status: body.status, next_follow_up: body.next_follow_up || null, next_action: clean(body.next_action, 2000) }
    const query = updating ? client.from('crm_prospects').update(values).eq('id', body.id) : client.from('crm_prospects').insert(values)
    const { data, error } = await query.select().single()
    if (error?.code === '23505' && contactId) return NextResponse.json({ error: 'This contact is already a prospect. Search for them in prospect follow-ups.' }, { status: 409 })
    if (error?.code === 'PGRST204' && contactId) return NextResponse.json({ error: 'Adding contacts requires database migration 055.' }, { status: 500 })
    if (error) throw error
    await writeRequestAdminActivity(client, request, { action: updating ? 'update_prospect' : 'create_prospect', module: 'CRM', description: `${updating ? 'Updated' : 'Created'} prospect ${data.name}`, entityType: 'crm_prospect', entityId: data.id })
    return NextResponse.json({ prospect: data }, { status: updating ? 200 : 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to save. Check your details and try again.' }, { status: 500 })
  }
}
export async function POST(request: NextRequest) { return save(request, false) }
export async function PATCH(request: NextRequest) { return save(request, true) }
