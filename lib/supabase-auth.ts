import { createBrowserClient } from '@supabase/ssr'
import { getUserAdminRole, isAdminUser, isDashboardUser } from './admin-auth'

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  throw new Error('Supabase configuration is missing. Please set up your environment variables.')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Helper functions for authentication
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return { user: data.user, session: data.session }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Check if user has admin role (custom claim or user metadata)
export async function isAdmin() {
  const user = await getCurrentUser()
  return isAdminUser(user)
}

export async function isDashboardUserSession() {
  const user = await getCurrentUser()
  return isDashboardUser(user)
}

export async function getCurrentAdminRole() {
  const user = await getCurrentUser()
  return getUserAdminRole(user)
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback)
}
