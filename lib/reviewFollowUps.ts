// Brings the automatic review follow-ups up to date: raises one for each
// active patient whose last encounter is approaching 11 months old (then each
// month after), and closes any that a new encounter or an inactive record has
// made unnecessary. The rules live in the database, in migration 036.
//
// Called whenever follow-ups are about to be shown, so they are current for
// whoever looks. Server-only.

import type { SupabaseClient } from '@supabase/supabase-js'

// The check is cheap, but follow-ups are loaded often (the notification bell
// polls), so it runs at most this often per server instance unless forced.
const MIN_INTERVAL_MS = 5 * 60 * 1000
let lastRun = 0
let warned = false

/** Pass force after something that changes the answer, such as a new encounter. */
export async function syncReviewFollowUps(database: SupabaseClient, { force = false } = {}) {
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return
  lastRun = Date.now()
  const { error } = await database.rpc('sync_encounter_review_follow_ups')
  // Never fails the request it runs in. Before migration 036 is applied the
  // function does not exist; that is said once rather than on every request.
  if (error && !warned) {
    warned = true
    console.error('Automatic review follow-ups could not be updated:', error.message)
  }
  if (!error) warned = false
}
