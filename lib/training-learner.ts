import type { NextRequest } from 'next/server'
import { getRequestAdminUser } from './admin-api-auth'
import { getUserAdminRole } from './admin-auth'
import { getRequestUser } from './ambassador-portal'
import { getTrainingDatabase } from './training'
import type { TrainingLearner } from './training-access'

export const LEARNER_ACCOUNT_TYPE = 'learner'

/**
 * The signed-in external learner (someone who signed up at /learn) and their
 * profile. Null for anyone else, including staff and suspended learners.
 */
export async function getRequestLearner(request: NextRequest) {
  const user = await getRequestUser(request)
  const database = getTrainingDatabase()
  if (!user || !database || user.app_metadata?.account_type !== LEARNER_ACCOUNT_TYPE) return null
  const { data: account, error } = await database.from('training_learner_accounts').select('*').eq('user_id', user.id).maybeSingle()
  if (error || !account || account.status === 'suspended') return null
  const learner: TrainingLearner = { kind: 'external', id: user.id, email: (user.email || '').toLowerCase() }
  return { user, account, database, learner }
}

/** The signed-in staff member as a learner (admins included). */
export async function getRequestStaffLearner(request: NextRequest) {
  const user = await getRequestAdminUser(request)
  const role = getUserAdminRole(user)
  const database = getTrainingDatabase()
  if (!user || !role || !database) return null
  const learner: TrainingLearner = { kind: 'staff', id: user.id, email: (user.email || '').toLowerCase(), role }
  return { user, role, database, learner }
}
