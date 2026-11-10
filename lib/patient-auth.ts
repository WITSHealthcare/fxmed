import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// The patient portal keeps its own sign-in, in its own cookie, apart from the
// admin dashboard and the ambassador portal. A member of staff can open a
// patient's invitation in a browser where they are signed in to the admin
// dashboard, and neither sign-in replaces the other.

/** The cookie that holds a patient's portal sign-in. The server reads the same name. */
export const PATIENT_AUTH_COOKIE = 'sb-fxmed-patient-auth'

let client: SupabaseClient | null = null

/**
 * The patient portal's browser client. It never reads sign-in links from the
 * address bar by itself: the setup page does that, so a link always signs in
 * the account it was sent for. Returns its auth client (sign in, sign out,
 * sessions).
 */
export function patientAuth(): SupabaseClient['auth'] {
  client ||= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    isSingleton: false,
    cookieOptions: { name: PATIENT_AUTH_COOKIE },
    auth: { detectSessionInUrl: false },
  })
  return client.auth
}
