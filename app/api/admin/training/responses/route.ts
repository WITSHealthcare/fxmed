import { NextRequest, NextResponse } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'
import { cleanTrainingText, getTrainingDatabase } from '@/lib/training'
import { accessProgram, loadProgram, submitLessonForm } from '@/lib/training-access'
import { getRequestStaffLearner } from '@/lib/training-learner'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const migrationHint = 'Have migrations 040 and 056 been applied?'

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

// Any staff member (admins included) submits or retakes a lesson form in their own course.
// Every attempt is kept; surveys and passed quizzes complete the lesson.
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestStaffLearner(request)
    if (!context) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })
    const { database, learner } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const programId = typeof body?.programId === 'string' ? body.programId : ''; const lessonId = cleanTrainingText(body?.lessonId, 80)
    if (!uuid.test(programId) || !lessonId) return NextResponse.json({ error: 'A valid lesson is required.' }, { status: 400 })
    const program = await loadProgram(database, { id: programId })
    const enrolment = program ? await accessProgram(database, program, learner) : null
    if (!program || !enrolment) return NextResponse.json({ error: 'Training access denied.' }, { status: 403 })
    const outcome = await submitLessonForm(database, program, enrolment, lessonId, body?.answers)
    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status })
    return NextResponse.json(outcome.result)
  } catch (error) { console.error('Error saving training response:', error); return NextResponse.json({ error: `Failed to submit the form. ${migrationHint}` }, { status: 500 }) }
}
