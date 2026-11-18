import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'
import { getTrainingDatabase, progressPercent, type TrackingRow, type TrackingStatus, type TrainingEnrolment, type TrainingProgram } from '@/lib/training'
import { enrol, isAssigned, newCertificateId, trainingErrorMessage, uuidPattern, type TrainingLearner } from '@/lib/training-access'

async function admin(request: NextRequest) {
  const user = await getRequestAdminUser(request); const database = getTrainingDatabase()
  if (getUserAdminRole(user) !== 'admin' || !database) return null
  return { user: user!, database }
}

async function listAllUsers(database: NonNullable<ReturnType<typeof getTrainingDatabase>>) {
  const users: User[] = []
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await database.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

function statusOf(enrolment: TrainingEnrolment | null, percent: number): TrackingStatus {
  if (enrolment?.status === 'revoked') return 'revoked'
  if (enrolment?.status === 'completed' || percent === 100) return 'completed'
  if (enrolment?.due_at && new Date(enrolment.due_at).getTime() < Date.now()) return 'overdue'
  return percent > 0 || enrolment?.started_at ? 'in_progress' : 'not_started'
}

// Everyone enrolled in (or assigned to) each course, with progress, due dates and quiz results.
export async function GET(request: NextRequest) {
  const context = await admin(request)
  if (!context) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const { database } = context
  try {
    const [programsResult, enrolmentsResult, progressResult, attemptsResult, learnersResult, users] = await Promise.all([
      database.from('training_programs').select('*').order('updated_at', { ascending: false }),
      database.from('training_enrolments').select('*'),
      database.from('training_progress').select('program_id,user_id,completed_lesson_ids'),
      database.from('training_attempts').select('program_id,user_id,lesson_id,score,submitted_at'),
      database.from('training_learner_accounts').select('user_id,full_name'),
      listAllUsers(database),
    ])
    const failed = programsResult.error || enrolmentsResult.error || progressResult.error || attemptsResult.error || learnersResult.error
    if (failed) throw failed
    const programs = (programsResult.data || []) as TrainingProgram[]
    const enrolments = (enrolmentsResult.data || []) as TrainingEnrolment[]
    const key = (programId: string, userId: string) => `${programId}:${userId}`
    const progress = new Map((progressResult.data || []).map((row) => [key(row.program_id, row.user_id), row.completed_lesson_ids as string[]]))
    const learnerNames = new Map((learnersResult.data || []).map((row) => [row.user_id, row.full_name as string]))
    const usersById = new Map(users.map((user) => [user.id, user]))

    // Latest score per quiz lesson feeds the average; every submission counts as an attempt.
    const attempts = new Map<string, { count: number; latest: Map<string, { score: number | null; at: string }> }>()
    for (const row of attemptsResult.data || []) {
      const item = attempts.get(key(row.program_id, row.user_id)) || { count: 0, latest: new Map() }
      item.count += 1
      const previous = item.latest.get(row.lesson_id)
      if (!previous || previous.at < row.submitted_at) item.latest.set(row.lesson_id, { score: row.score, at: row.submitted_at })
      attempts.set(key(row.program_id, row.user_id), item)
    }

    const rowFor = (program: TrainingProgram, userId: string, enrolment: TrainingEnrolment | null): TrackingRow => {
      const user = usersById.get(userId)
      const completed = progress.get(key(program.id, userId)) || []
      const percent = progressPercent(program, completed)
      const tried = attempts.get(key(program.id, userId))
      const scores = tried ? Array.from(tried.latest.values()).map((item) => item.score).filter((score): score is number => score !== null) : []
      return {
        program_id: program.id, user_id: userId, enrolment_id: enrolment?.id || null,
        name: learnerNames.get(userId) || user?.user_metadata?.full_name || [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ') || user?.email || 'Former user',
        email: user?.email || '', learner_type: enrolment?.learner_type || 'staff', source: enrolment?.source || 'assigned',
        status: statusOf(enrolment, percent), progress_percent: percent, enrolled_at: enrolment?.enrolled_at || null, due_at: enrolment?.due_at || null,
        last_activity_at: enrolment?.last_activity_at || null, completed_at: enrolment?.completed_at || null, certificate_id: enrolment?.certificate_id || null,
        quiz_average: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null, attempts: tried?.count || 0,
      }
    }

    const rows: TrackingRow[] = enrolments.flatMap((enrolment) => {
      const program = programs.find((item) => item.id === enrolment.program_id)
      return program ? [rowFor(program, enrolment.user_id, enrolment)] : []
    })
    // Staff assigned to a published course who have never opened it.
    const enrolled = new Set(enrolments.map((enrolment) => key(enrolment.program_id, enrolment.user_id)))
    const staff = users.flatMap((user) => {
      const role = getUserAdminRole(user)
      return role ? [{ user, learner: { kind: 'staff', id: user.id, email: (user.email || '').toLowerCase(), role } as TrainingLearner }] : []
    })
    for (const program of programs) {
      for (const { user, learner } of staff) {
        if (!enrolled.has(key(program.id, user.id)) && isAssigned(program, learner)) rows.push(rowFor(program, user.id, null))
      }
    }

    const summary = programs.map((program) => {
      const mine = rows.filter((row) => row.program_id === program.id && row.status !== 'revoked')
      const scored = mine.filter((row) => row.quiz_average !== null)
      return {
        id: program.id, title: program.title, status: program.status, visibility: program.visibility,
        enrolled: mine.length, not_started: mine.filter((row) => row.status === 'not_started').length,
        in_progress: mine.filter((row) => row.status === 'in_progress').length, completed: mine.filter((row) => row.status === 'completed').length,
        overdue: mine.filter((row) => row.status === 'overdue').length,
        average_score: scored.length ? Math.round(scored.reduce((sum, row) => sum + row.quiz_average!, 0) / scored.length) : null,
      }
    })
    return NextResponse.json({ summary, rows })
  } catch (error) {
    console.error('Error loading training tracking:', error)
    return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 })
  }
}

// Admin actions on one learner's place in a course.
//   { action: 'enrol', programId, email, due_at? }
//   { action: 'set_due' | 'revoke' | 'restore' | 'issue_certificate', programId, userId, due_at? }
export async function POST(request: NextRequest) {
  const context = await admin(request)
  if (!context) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const { database } = context
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const action = typeof body?.action === 'string' ? body.action : ''
    const programId = typeof body?.programId === 'string' && uuidPattern.test(body.programId) ? body.programId : ''
    if (!programId) return NextResponse.json({ error: 'A valid course is required.' }, { status: 400 })
    const { data: program, error: programError } = await database.from('training_programs').select('*').eq('id', programId).maybeSingle()
    if (programError) throw programError
    if (!program) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })
    const dueAt = typeof body?.due_at === 'string' && body.due_at ? new Date(body.due_at) : null
    if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: 'Enter a valid due date.' }, { status: 400 })

    // Find (or create) the learner's enrolment.
    let userId = typeof body?.userId === 'string' && uuidPattern.test(body.userId) ? body.userId : ''
    if (action === 'enrol') {
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
      const user = (await listAllUsers(database)).find((item) => item.email?.toLowerCase() === email)
      if (!user) return NextResponse.json({ error: 'No account uses that email. External learners need to sign up at /learn/signup first.' }, { status: 404 })
      userId = user.id
    }
    if (!userId) return NextResponse.json({ error: 'A valid learner is required.' }, { status: 400 })
    const { data: userResult } = await database.auth.admin.getUserById(userId)
    if (!userResult.user) return NextResponse.json({ error: 'Learner not found.' }, { status: 404 })
    const learner: TrainingLearner = getUserAdminRole(userResult.user)
      ? { kind: 'staff', id: userId, email: (userResult.user.email || '').toLowerCase(), role: getUserAdminRole(userResult.user)! }
      : { kind: 'external', id: userId, email: (userResult.user.email || '').toLowerCase() }
    if (action === 'enrol' && learner.kind === 'external' && program.visibility === 'internal') return NextResponse.json({ error: 'This is a staff-only course. Make it public before enrolling an external learner.' }, { status: 400 })
    const enrolment = await enrol(database, program as TrainingProgram, learner, action === 'enrol' ? 'manual' : 'assigned', action === 'enrol' && dueAt ? dueAt.toISOString() : undefined)
    if (!enrolment) throw new Error('Could not create the enrolment.')

    let update: Partial<TrainingEnrolment> = {}
    if (action === 'set_due') update = { due_at: dueAt ? dueAt.toISOString() : null }
    else if (action === 'revoke') update = { status: 'revoked' }
    else if (action === 'restore') update = { status: enrolment.completed_at ? 'completed' : 'active' }
    else if (action === 'issue_certificate') {
      if (enrolment.status !== 'completed') return NextResponse.json({ error: 'Certificates are issued once the course is complete.' }, { status: 400 })
      update = { certificate_id: newCertificateId() }
    } else if (action !== 'enrol') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })

    if (Object.keys(update).length) {
      const { error } = await database.from('training_enrolments').update(update).eq('id', enrolment.id)
      if (error) throw error
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating training enrolment:', error)
    return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 })
  }
}
