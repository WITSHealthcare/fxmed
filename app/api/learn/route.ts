import { NextRequest, NextResponse } from 'next/server'
import type { TrainingEnrolment, TrainingProgram } from '@/lib/training'
import { canOpenProgram, trainingErrorMessage, withLearnerState } from '@/lib/training-access'
import { getRequestLearner } from '@/lib/training-learner'

// The external learner's dashboard: profile and enrolled courses with progress.
export async function GET(request: NextRequest) {
  try {
    const context = await getRequestLearner(request)
    if (!context) return NextResponse.json({ error: 'Learner sign-in required' }, { status: 403 })
    const { database, learner, account } = context
    const { data: enrolments, error } = await database.from('training_enrolments').select('*, program:training_programs(*)').eq('user_id', learner.id).order('enrolled_at', { ascending: false })
    if (error) throw error
    const programs = await Promise.all((enrolments || []).flatMap((row) => {
      const { program, ...enrolment } = row as TrainingEnrolment & { program: TrainingProgram | null }
      return program && canOpenProgram(program, learner, enrolment) ? [withLearnerState(database, program, learner.id, enrolment)] : []
    }))
    await database.from('training_learner_accounts').update({ last_seen_at: new Date().toISOString() }).eq('user_id', learner.id)
    return NextResponse.json({ account: { full_name: account.full_name, email: learner.email }, programs })
  } catch (error) { console.error('Error loading learner dashboard:', error); return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 }) }
}
