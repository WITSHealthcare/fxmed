// The functional health analysis form collected a typed age until it was
// changed to collect a date of birth. Submissions made before that still carry
// only `age`, so every display derives the age from the date of birth when it
// is there and falls back to the stored number when it is not.

export function ageFromDateOfBirth(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null
  const born = new Date(`${dateOfBirth}T00:00:00`)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const monthDiff = today.getMonth() - born.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}

// What to show wherever an age used to be printed.
export function displayAge(person: { dateOfBirth?: string | null; age?: string | null }): string {
  const derived = ageFromDateOfBirth(person.dateOfBirth)
  if (derived !== null) return String(derived)
  return (person.age || '').trim()
}

// A date of birth is only plausible if it is in the past and within a human
// lifespan. Used by the public form and by the submission endpoint.
export function isPlausibleDateOfBirth(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const age = ageFromDateOfBirth(value)
  return age !== null
}
