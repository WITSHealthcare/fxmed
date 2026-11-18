import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// Server-side Paystack calls for paid courses. Access is only ever granted
// from a transaction the server has verified with Paystack itself.

const API = 'https://api.paystack.co'
const secret = () => process.env.PAYSTACK_SECRET_KEY || ''
export const paystackConfigured = () => Boolean(secret())

type PaystackTransaction = { status: string; reference: string; amount: number; currency: string; customer?: { email?: string }; metadata?: Record<string, unknown> }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' })
  const body = await response.json().catch(() => ({})) as { status?: boolean; message?: string; data?: T }
  if (!response.ok || !body.status || !body.data) throw new Error(body.message || `Paystack request failed (${response.status}).`)
  return body.data
}

export const newPaymentReference = () => `fxmc_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`

export function initializeTransaction(input: { email: string; amountKobo: number; currency: string; reference: string; callbackUrl: string; metadata: Record<string, unknown> }) {
  return call<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({ email: input.email, amount: input.amountKobo, currency: input.currency, reference: input.reference, callback_url: input.callbackUrl, metadata: input.metadata }),
  })
}

export function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`)
}

/** Paystack signs each webhook body with HMAC-SHA512 using the secret key. */
export function validWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !secret()) return false
  const expected = createHmac('sha512', secret()).update(rawBody).digest('hex')
  const a = Buffer.from(expected); const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
