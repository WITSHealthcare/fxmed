'use client'

// After a booking is saved, take the booker to pay for it. With Paystack set up
// on the server, that is a checkout for this exact booking, which marks it paid
// automatically and brings them back to /booking/payment. Otherwise (or if
// starting it fails) the clinic's Paystack payment page opens, as before.
export async function payForBooking(appointmentId: string | undefined, fallbackUrl: string) {
  if (appointmentId) {
    try {
      const response = await fetch('/api/appointments/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId }) })
      const result = await response.json().catch(() => ({})) as { url?: string }
      if (response.ok && result.url) {
        window.location.assign(result.url)
        return 'checkout' as const
      }
    } catch {
      // Fall back to the payment page below.
    }
  }
  window.open(fallbackUrl, '_blank')
  return 'payment_page' as const
}
