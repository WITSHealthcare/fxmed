import { NextRequest, NextResponse } from 'next/server'
import { cleanTrainingText } from '@/lib/training'
import { accessProgram, loadProgram, submitLessonForm, trainingErrorMessage, uuidPattern } from '@/lib/training-access'
import { getRequestLearner } from '@/lib/training-learner'

// An external learner submits or retakes a lesson quiz or survey.
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestLearner(request)
    if (!context) return NextResponse.json({ error: 'Learner sign-in required' }, { status: 403 })
    const { database, learner } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const programId = typeof body?.programId === 'string' && uuidPattern.test(body.programId) ? body.programId : ''
    const lessonId = cleanTrainingText(body?.lessonId, 80)
    if (!programId || !lessonId) return NextResponse.json({ error: 'A valid lesson is required.' }, { status: 400 })
    const program = await loadProgram(database, { id: programId })
    const enrolment = program ? await accessProgram(database, program, learner) : null
    if (!program || !enrolment) return NextResponse.json({ error: 'Course access denied.' }, { status: 403 })
    const outcome = await submitLessonForm(database, program, enrolment, lessonId, body?.answers)
    if ('error' in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status })
    return NextResponse.json(outcome.result)
  } catch (error) { console.error('Error saving course response:', error); return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 }) }
}
