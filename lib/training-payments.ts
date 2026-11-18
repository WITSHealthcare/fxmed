import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyTransaction } from './paystack'
import { enrol, loadProgram } from './training-access'

/**
 * Check a course payment with Paystack and, if it succeeded for the amount and
 * currency we asked for, enrol the buyer. Safe to call more than once for the
 * same reference (webhook and callback both do).
 */
export async function settleCoursePayment(database: SupabaseClient, reference: string) {
  const { data: payment, error } = await database.from('training_payments').select('*').eq('reference', reference).maybeSingle()
  if (error) throw error
  if (!payment) return { ok: false as const, reason: 'unknown_reference' }
  if (payment.status === 'success') return { ok: true as const, programId: payment.program_id as string, already: true }

  const transaction = await verifyTransaction(reference)
  const matches = transaction.status === 'success' && transaction.amount === payment.amount_kobo && transaction.currency === payment.currency
  if (!matches) {
    if (transaction.status === 'failed' || transaction.status === 'abandoned' || transaction.status === 'reversed' || (transaction.status === 'success' && !matches)) {
      await database.from('training_payments').update({ status: 'failed', paystack_payload: transaction }).eq('reference', reference).eq('status', 'pending')
    }
    return { ok: false as const, reason: transaction.status === 'success' ? 'amount_mismatch' : transaction.status }
  }

  // Only the first caller to flip pending → success goes on to enrol.
  const { data: claimed, error: claimError } = await database.from('training_payments')
    .update({ status: 'success', verified_at: new Date().toISOString(), paystack_payload: transaction })
    .eq('reference', reference).neq('status', 'success').select('reference')
  if (claimError) throw claimError

  const program = await loadProgram(database, { id: payment.program_id })
  if (!program) return { ok: false as const, reason: 'program_missing' }
  const { data: userResult } = await database.auth.admin.getUserById(payment.user_id)
  await enrol(database, program, { kind: 'external', id: payment.user_id, email: (userResult.user?.email || '').toLowerCase() }, 'purchase')
  return { ok: true as const, programId: program.id, already: !claimed?.length }
}
