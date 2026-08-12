// Creates Microsoft Bookings appointments (and their Teams meeting links) via Microsoft Graph.
// Uses raw fetch + client-credentials grant instead of an SDK, matching lib/ai/providers.ts style.

interface BookingAppointmentInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  preferredDate: string // YYYY-MM-DD
  preferredTime: string // HH:mm
  durationMinutes?: number
}

interface BookingAppointmentResult {
  id: string
  onlineMeetingUrl: string | null
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

async function getGraphToken(): Promise<string> {
  const tenantId = requireEnv('MS_TENANT_ID')
  const clientId = requireEnv('MS_CLIENT_ID')
  const clientSecret = requireEnv('MS_CLIENT_SECRET')

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to acquire Graph token: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function createBookingAppointment(
  appointment: BookingAppointmentInput
): Promise<BookingAppointmentResult> {
  const businessId = requireEnv('MS_BOOKING_BUSINESS_ID')
  const serviceId = requireEnv('MS_BOOKING_SERVICE_ID')
  const staffIds = process.env.MS_BOOKING_STAFF_IDS
    ? process.env.MS_BOOKING_STAFF_IDS.split(',').map((id) => id.trim())
    : undefined

  const token = await getGraphToken()

  const start = new Date(`${appointment.preferredDate}T${appointment.preferredTime}:00`)
  const end = new Date(start.getTime() + (appointment.durationMinutes ?? 30) * 60 * 1000)

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${businessId}/appointments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceId,
        ...(staffIds ? { staffMemberIds: staffIds } : {}),
        isLocationOnline: true,
        startDateTime: { dateTime: start.toISOString(), timeZone: 'UTC' },
        endDateTime: { dateTime: end.toISOString(), timeZone: 'UTC' },
        customers: [
          {
            name: `${appointment.firstName} ${appointment.lastName}`,
            emailAddress: appointment.email,
            phone: appointment.phone,
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create Bookings appointment: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return { id: data.id, onlineMeetingUrl: data.onlineMeetingUrl ?? null }
}

// One-off discovery helpers — not called at runtime. Use these once (e.g. via a scratch script)
// to find MS_BOOKING_BUSINESS_ID / MS_BOOKING_SERVICE_ID / MS_BOOKING_STAFF_IDS for the env file.

export async function listBookingBusinesses() {
  const token = await getGraphToken()
  const response = await fetch('https://graph.microsoft.com/v1.0/solutions/bookingBusinesses', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Failed to list booking businesses: ${response.status}`)
  return response.json()
}

export async function listServices(businessId: string) {
  const token = await getGraphToken()
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${businessId}/services`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!response.ok) throw new Error(`Failed to list services: ${response.status}`)
  return response.json()
}

export async function listStaffMembers(businessId: string) {
  const token = await getGraphToken()
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${businessId}/staffMembers`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!response.ok) throw new Error(`Failed to list staff members: ${response.status}`)
  return response.json()
}
