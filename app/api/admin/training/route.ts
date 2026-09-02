import { NextRequest, NextResponse } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'
import { cleanTrainingText, getTrainingDatabase, type TrainingLesson, type TrainingModule } from '@/lib/training'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanModules(value: unknown): TrainingModule[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 50).flatMap((raw, moduleIndex) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>
    const title = cleanTrainingText(item.title, 160)
    if (!title) return []
    const lessons = Array.isArray(item.lessons) ? item.lessons.slice(0, 100).flatMap((lessonRaw, lessonIndex) => {
      if (!lessonRaw || typeof lessonRaw !== 'object') return []
      const lesson = lessonRaw as Record<string, unknown>
      const lessonTitle = cleanTrainingText(lesson.title, 160)
      if (!lessonTitle) return []
      return [{
        id: cleanTrainingText(lesson.id, 80) || `lesson-${moduleIndex + 1}-${lessonIndex + 1}`,
        title: lessonTitle,
        content: cleanTrainingText(lesson.content, 20000),
        resourceUrl: cleanTrainingText(lesson.resourceUrl, 2000),
        durationMinutes: Math.max(0, Math.min(1440, Math.trunc(Number(lesson.durationMinutes) || 0))),
      } satisfies TrainingLesson]
    }) : []
    return [{ id: cleanTrainingText(item.id, 80) || `module-${moduleIndex + 1}`, title, lessons }]
  })
}

function payload(body: Record<string, unknown>) {
  const title = cleanTrainingText(body.title, 160)
  if (!title) return null
  const audienceRoles = Array.isArray(body.audience_roles)
    ? Array.from(new Set(body.audience_roles.filter((role): role is string => role === 'clinical' || role === 'sales')))
    : []
  const assignedEmails = Array.isArray(body.assigned_emails)
    ? Array.from(new Set(body.assigned_emails.map((email) => cleanTrainingText(email, 254).toLowerCase()).filter((email) => emailPattern.test(email)))).slice(0, 500)
    : []
  if (!audienceRoles.length && !assignedEmails.length) return null
  return { title, description: cleanTrainingText(body.description, 3000), status: body.status === 'published' ? 'published' : 'draft', audience_roles: audienceRoles, assigned_emails: assignedEmails, modules: cleanModules(body.modules) }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const role = getUserAdminRole(user); const database = getTrainingDatabase()
    if (!user || !role) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const { data, error } = await database.from('training_programs').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    const email = user.email?.toLowerCase() || ''
    const programs = role === 'admin' ? (data || []) : (data || []).filter((program) => program.status === 'published' && (program.audience_roles?.includes(role) || program.assigned_emails?.includes(email)))
    if (role === 'admin' || !programs.length) return NextResponse.json({ programs })
    const { data: progress, error: progressError } = await database.from('training_progress').select('program_id,completed_lesson_ids').eq('user_id', user.id)
    if (progressError) throw progressError
    const byProgram = new Map((progress || []).map((item) => [item.program_id, item.completed_lesson_ids || []]))
    return NextResponse.json({ programs: programs.map((program) => {
      const completed = byProgram.get(program.id) || []; const total = (program.modules || []).reduce((sum: number, module: TrainingModule) => sum + module.lessons.length, 0)
      return { ...program, completed_lesson_ids: completed, progress_percent: total ? Math.round(completed.length / total * 100) : 0 }
    }) })
  } catch (error) { console.error('Error loading training:', error); return NextResponse.json({ error: 'Failed to load training programs. Has migration 028 been applied?' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const database = getTrainingDatabase()
    if (getUserAdminRole(user) !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null; const clean = body && payload(body)
    if (!clean) return NextResponse.json({ error: 'Add a title and at least one role or member email.' }, { status: 400 })
    const { data, error } = await database.from('training_programs').insert({ ...clean, created_by: user!.id }).select('*').single()
    if (error) throw error
    return NextResponse.json({ program: data }, { status: 201 })
  } catch (error) { console.error('Error creating training:', error); return NextResponse.json({ error: 'Failed to create training program.' }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const role = getUserAdminRole(user); const database = getTrainingDatabase()
    if (!user || !role) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.id !== 'string' || !uuid.test(body.id)) return NextResponse.json({ error: 'A valid program is required.' }, { status: 400 })
    if (role !== 'admin') {
      const lessonId = cleanTrainingText(body.lessonId, 80); if (!lessonId) return NextResponse.json({ error: 'A lesson is required.' }, { status: 400 })
      const { data: program } = await database.from('training_programs').select('status,audience_roles,assigned_emails,modules').eq('id', body.id).single()
      const allowed = program?.status === 'published' && (program.audience_roles?.includes(role) || program.assigned_emails?.includes(user.email?.toLowerCase() || ''))
      const lessonIds = (program?.modules || []).flatMap((module: TrainingModule) => module.lessons.map((lesson) => lesson.id))
      if (!allowed || !lessonIds.includes(lessonId)) return NextResponse.json({ error: 'Training access denied.' }, { status: 403 })
      const { data: existing } = await database.from('training_progress').select('completed_lesson_ids').eq('program_id', body.id).eq('user_id', user.id).maybeSingle()
      const set = new Set<string>(existing?.completed_lesson_ids || []); body.completed === false ? set.delete(lessonId) : set.add(lessonId)
      const completed = Array.from(set).filter((id) => lessonIds.includes(id))
      const { error } = await database.from('training_progress').upsert({ program_id: body.id, user_id: user.id, completed_lesson_ids: completed, updated_at: new Date().toISOString() })
      if (error) throw error
      return NextResponse.json({ completed_lesson_ids: completed, progress_percent: lessonIds.length ? Math.round(completed.length / lessonIds.length * 100) : 0 })
    }
    const clean = payload(body); if (!clean) return NextResponse.json({ error: 'Add a title and at least one role or member email.' }, { status: 400 })
    const { data, error } = await database.from('training_programs').update(clean).eq('id', body.id).select('*').single(); if (error) throw error
    return NextResponse.json({ program: data })
  } catch (error) { console.error('Error updating training:', error); return NextResponse.json({ error: 'Failed to update training program.' }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const database = getTrainingDatabase(); const id = new URL(request.url).searchParams.get('id') || ''
    if (getUserAdminRole(user) !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    if (!uuid.test(id)) return NextResponse.json({ error: 'A valid program is required.' }, { status: 400 })
    const { error } = await database.from('training_programs').delete().eq('id', id); if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) { console.error('Error deleting training:', error); return NextResponse.json({ error: 'Failed to delete training program.' }, { status: 500 }) }
}
