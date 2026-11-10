import { NextRequest, NextResponse } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'
import { cleanTrainingText, getTrainingDatabase, gradeTrainingResponse, type TrainingLesson, type TrainingModule } from '@/lib/training'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const migrationHint = 'Has migration 040 been applied?'

// Admins review every response to a program's lesson forms.
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const database = getTrainingDatabase(); const programId = new URL(request.url).searchParams.get('programId') || ''
    if (getUserAdminRole(user) !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    if (!uuid.test(programId)) return NextResponse.json({ error: 'A valid program is required.' }, { status: 400 })
    const { data, error } = await database.from('training_form_responses').select('*').eq('program_id', programId).order('submitted_at', { ascending: false })
    if (error) throw error
    const { data: listed, error: listError } = await database.auth.admin.listUsers({ perPage: 1000 })
    if (listError) console.error('Training responses: could not list staff:', listError.message)
    const names = new Map((listed?.users || []).map((member) => [member.id, member.user_metadata?.full_name || member.email || 'Staff member']))
    return NextResponse.json({ responses: (data || []).map((response) => ({ ...response, respondent: names.get(response.user_id) || 'Former staff member' })) })
  } catch (error) { console.error('Error loading training responses:', error); return NextResponse.json({ error: `Failed to load responses. ${migrationHint}` }, { status: 500 }) }
}

// Learners submit (or resubmit) a lesson form. Surveys and passed quizzes complete the lesson.
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestAdminUser(request); const role = getUserAdminRole(user); const database = getTrainingDatabase()
    if (!user || !role || role === 'admin') return NextResponse.json({ error: 'Assigned learner access required' }, { status: 403 })
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const programId = typeof body?.programId === 'string' ? body.programId : ''; const lessonId = cleanTrainingText(body?.lessonId, 80)
    if (!uuid.test(programId) || !lessonId) return NextResponse.json({ error: 'A valid lesson is required.' }, { status: 400 })
    const { data: program } = await database.from('training_programs').select('status,audience_roles,assigned_emails,modules').eq('id', programId).single()
    const allowed = program?.status === 'published' && (program.audience_roles?.includes(role) || program.assigned_emails?.includes(user.email?.toLowerCase() || ''))
    const lessons: TrainingLesson[] = (program?.modules || []).flatMap((module: TrainingModule) => module.lessons)
    const lesson = lessons.find((item) => item.id === lessonId)
    if (!allowed || !lesson) return NextResponse.json({ error: 'Training access denied.' }, { status: 403 })
    if (!lesson.form?.questions.length) return NextResponse.json({ error: 'This lesson has no form.' }, { status: 400 })

    const graded = gradeTrainingResponse(lesson.form, body?.answers)
    if ('error' in graded) return NextResponse.json({ error: graded.error }, { status: 400 })
    const { data: response, error } = await database.from('training_form_responses')
      .upsert({ program_id: programId, lesson_id: lessonId, user_id: user.id, ...graded, submitted_at: new Date().toISOString() })
      .select('*').single()
    if (error) throw error

    const lessonIds = lessons.map((item) => item.id)
    const { data: existing } = await database.from('training_progress').select('completed_lesson_ids').eq('program_id', programId).eq('user_id', user.id).maybeSingle()
    const set = new Set<string>(existing?.completed_lesson_ids || []); graded.passed === false ? set.delete(lessonId) : set.add(lessonId)
    const completed = Array.from(set).filter((id) => lessonIds.includes(id))
    const { error: progressError } = await database.from('training_progress').upsert({ program_id: programId, user_id: user.id, completed_lesson_ids: completed, updated_at: new Date().toISOString() })
    if (progressError) throw progressError
    return NextResponse.json({ response, completed_lesson_ids: completed, progress_percent: lessonIds.length ? Math.round(completed.length / lessonIds.length * 100) : 0 })
  } catch (error) { console.error('Error saving training response:', error); return NextResponse.json({ error: `Failed to submit the form. ${migrationHint}` }, { status: 500 }) }
}
