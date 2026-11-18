import { NextRequest, NextResponse } from 'next/server'
import { canSelfEnrol, enrol, getEnrolment, loadProgram, trainingErrorMessage, uuidPattern } from '@/lib/training-access'
import { getRequestStaffLearner } from '@/lib/training-learner'

// A staff member joins a course from the staff catalogue.
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestStaffLearner(request)
    if (!context) return NextResponse.json({ error: 'Dashboard access required' }, { status: 403 })
    const { database, learner } = context
    const body = await request.json().catch(() => null) as { id?: unknown } | null
    const id = typeof body?.id === 'string' && uuidPattern.test(body.id) ? body.id : ''
    const program = id ? await loadProgram(database, { id }) : null
    if (!program || !canSelfEnrol(program, learner)) return NextResponse.json({ error: 'This course is not open for enrolment.' }, { status: 403 })
    if ((await getEnrolment(database, program.id, learner.id))?.status === 'revoked') return NextResponse.json({ error: 'Your place on this course was withdrawn. Ask an admin to restore it.' }, { status: 403 })
    const enrolment = await enrol(database, program, learner, 'self')
    return NextResponse.json({ enrolment }, { status: 201 })
  } catch (error) { console.error('Error enrolling in training:', error); return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 }) }
}
