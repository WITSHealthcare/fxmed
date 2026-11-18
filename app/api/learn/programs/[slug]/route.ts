import { NextRequest, NextResponse } from 'next/server'
import { cleanTrainingText, toPreview } from '@/lib/training'
import { accessProgram, canSelfEnrol, isPublic, loadProgram, tickLesson, trainingErrorMessage, withLearnerState } from '@/lib/training-access'
import { getRequestLearner } from '@/lib/training-learner'

type Context = { params: Promise<{ slug: string }> }

// A public course for the signed-in learner: full content once enrolled,
// otherwise the preview so the page can offer enrolment.
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { slug } = await params
    const context = await getRequestLearner(request)
    if (!context) return NextResponse.json({ error: 'Learner sign-in required' }, { status: 403 })
    const { database, learner } = context
    const program = await loadProgram(database, { slug })
    if (!program || program.status !== 'published' || !isPublic(program)) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })
    const enrolment = await accessProgram(database, program, learner)
    if (!enrolment) return NextResponse.json({ enrolled: false, preview: toPreview(program), can_enrol: canSelfEnrol(program, learner) })
    return NextResponse.json({ enrolled: true, program: await withLearnerState(database, program, learner.id, enrolment) })
  } catch (error) { console.error('Error loading course:', error); return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 }) }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { slug } = await params
    const context = await getRequestLearner(request)
    if (!context) return NextResponse.json({ error: 'Learner sign-in required' }, { status: 403 })
    const { database, learner } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const lessonId = cleanTrainingText(body?.lessonId, 80)
    const program = await loadProgram(database, { slug })
    const enrolment = program && lessonId ? await accessProgram(database, program, learner) : null
    if (!program || !enrolment) return NextResponse.json({ error: 'Course access denied.' }, { status: 403 })
    const outcome = await tickLesson(database, program, enrolment, lessonId, body?.completed !== false)
    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status })
    return NextResponse.json(outcome.result)
  } catch (error) { console.error('Error updating course progress:', error); return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 }) }
}
