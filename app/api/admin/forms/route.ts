import { NextRequest, NextResponse } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'
import { cleanFormPayload, formsErrorMessage, publicForm, slugify, staffCanFill } from '@/lib/forms-server'
import type { FormRecord } from '@/lib/forms-types'
import { getTrainingDatabase as getFormsDatabase } from '@/lib/training'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Admins get every form with its response count. Other staff get the published
// staff forms open to them, with their own latest response to each.
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const role = getUserAdminRole(user); const database = getFormsDatabase()
    if (!user || !role) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const { data, error } = await database.from('forms').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    const forms = (data || []) as FormRecord[]

    const mine = forms.filter((form) => staffCanFill(form, user))
    const { data: own, error: ownError } = mine.length
      ? await database.from('form_responses').select('form_id,answers,score,passed,submitted_at').eq('user_id', user.id).eq('respondent_type', 'staff').in('form_id', mine.map((form) => form.id)).order('submitted_at', { ascending: false })
      : { data: [], error: null }
    if (ownError) throw ownError
    const toFill = mine.map((form) => ({ ...publicForm(form), my_response: (own || []).find((response) => response.form_id === form.id) || null }))
    if (role !== 'admin') return NextResponse.json({ toFill })

    const counts = await Promise.all(forms.map((form) => database.from('form_responses').select('id', { count: 'exact', head: true }).eq('form_id', form.id)))
    return NextResponse.json({ forms: forms.map((form, index) => ({ ...form, response_count: counts[index].count || 0 })), toFill })
  } catch (error) { console.error('Error loading forms:', error); return NextResponse.json({ error: formsErrorMessage(error, 'Failed to load forms.') }, { status: 500 }) }
}

async function requireAdmin(request: NextRequest) {
  const user = await getRequestAdminUser(request); const database = getFormsDatabase()
  if (getUserAdminRole(user) !== 'admin') return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  if (!database) return { response: NextResponse.json({ error: 'Database unavailable' }, { status: 503 }) }
  return { user: user!, database }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request); if ('response' in auth) return auth.response
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const clean = body ? cleanFormPayload(body) : 'Invalid request.'
    if (typeof clean === 'string') return NextResponse.json({ error: clean }, { status: 400 })
    const { data, error } = await auth.database.from('forms').insert({ ...clean, slug: slugify(clean.title), created_by: auth.user.id }).select('*').single()
    if (error) throw error
    return NextResponse.json({ form: data }, { status: 201 })
  } catch (error) { console.error('Error creating form:', error); return NextResponse.json({ error: formsErrorMessage(error, 'Failed to create the form.') }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request); if ('response' in auth) return auth.response
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.id !== 'string' || !uuid.test(body.id)) return NextResponse.json({ error: 'A valid form is required.' }, { status: 400 })
    // Status-only changes (publish, close, reopen) from the forms list.
    if (Object.keys(body).length === 2 && ['draft', 'published', 'closed'].includes(body.status as string)) {
      const { data, error } = await auth.database.from('forms').update({ status: body.status }).eq('id', body.id).select('*').single()
      if (error) throw error
      return NextResponse.json({ form: data })
    }
    const clean = cleanFormPayload(body)
    if (typeof clean === 'string') return NextResponse.json({ error: clean }, { status: 400 })
    const { data, error } = await auth.database.from('forms').update(clean).eq('id', body.id).select('*').single()
    if (error) throw error
    return NextResponse.json({ form: data })
  } catch (error) { console.error('Error updating form:', error); return NextResponse.json({ error: formsErrorMessage(error, 'Failed to update the form.') }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request); if ('response' in auth) return auth.response
    const id = new URL(request.url).searchParams.get('id') || ''
    if (!uuid.test(id)) return NextResponse.json({ error: 'A valid form is required.' }, { status: 400 })
    const { error } = await auth.database.from('forms').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) { console.error('Error deleting form:', error); return NextResponse.json({ error: formsErrorMessage(error, 'Failed to delete the form.') }, { status: 500 }) }
}
