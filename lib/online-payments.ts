import { after } from 'next/server'
import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { initializeTransaction, paystackConfigured, verifyTransaction } from '@/lib/paystack'
import { INVOICE_COLUMNS, formatInvoiceMoney, mapInvoice, type InvoiceBill } from '@/lib/invoices'
import { bookingAmount, bookingTypeName } from '@/lib/bookingTimes'
import { sendEmail } from '@/lib/email'
import { siteUrl } from '@/lib/seo'
import { staffEmail, staffRecipients } from '@/lib/staff-alerts'

// Paystack payments for patient invoices and bookings (migration 062).
//
// Flow: start*Payment saves a pending row and returns Paystack's checkout URL.
// The patient pays on Paystack and comes back to our callback page; Paystack
// also calls the webhook. Both run settleOnlinePayment, which verifies the
// transaction with Paystack before anything is marked paid, and only the
// first of them records the payment. Course payments (lib/training-payments)
// work the same way with their own table.

export class PaymentProblem extends Error {}

const newReference = (kind: 'invoice' | 'booking') => `${kind === 'invoice' ? 'fxinv' : 'fxbk'}_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`
export const isOnlinePaymentReference = (reference: string) => /^fx(inv|bk)_[a-z0-9_]+$/.test(reference)
const toKobo = (naira: number) => Math.round(naira * 100)
const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())

async function loadInvoice(database: SupabaseClient, invoiceId: string) {
  const { data: row, error } = await database.from('emr_invoices').select(INVOICE_COLUMNS).eq('id', invoiceId).maybeSingle()
  if (error) throw error
  if (!row) return null
  const billIds = (row.items || []).map((item: { financial_record_id: string | null }) => item.financial_record_id).filter(Boolean)
  const { data: bills, error: billError } = billIds.length
    ? await database.from('emr_financial_records').select('id,amount_due,amount_paid,status').in('id', billIds)
    : { data: [], error: null }
  if (billError) throw billError
  return { invoice: mapInvoice(row, (bills || []) as InvoiceBill[]), bills: (bills || []) as Array<{ id: string; amount_due: number | string; amount_paid: number | string; status: string }> }
}

// What can be paid online on each line right now: what the line still owes,
// never more than its bill still owes. Lines whose bill was removed can't be
// paid online.
function payableLines(loaded: NonNullable<Awaited<ReturnType<typeof loadInvoice>>>) {
  return loaded.invoice.items.flatMap((item) => {
    const bill = loaded.bills.find((entry) => entry.id === item.billId)
    if (!bill || ['waived', 'refunded'].includes(bill.status)) return []
    const owed = Math.min(item.amount - item.paid, Number(bill.amount_due) - Number(bill.amount_paid))
    return owed > 0 ? [{ billId: bill.id, description: item.description, owed: Math.round(owed * 100) / 100 }] : []
  })
}

/** Starts paying the patient's own invoice. Returns Paystack's checkout URL. */
export async function startInvoicePayment(database: SupabaseClient, input: { invoiceId: string; patientId: string; email: string; origin: string }) {
  if (!paystackConfigured()) throw new PaymentProblem('Online payment is not available yet. Please pay by bank transfer.')
  const loaded = await loadInvoice(database, input.invoiceId)
  if (!loaded || loaded.invoice.patientId !== input.patientId || loaded.invoice.status !== 'sent') throw new PaymentProblem('This invoice cannot be paid online.')
  if (loaded.invoice.currency !== 'NGN') throw new PaymentProblem('Only invoices in Naira can be paid online. Please contact the clinic.')
  const amount = payableLines(loaded).reduce((sum, line) => sum + line.owed, 0)
  if (amount <= 0) throw new PaymentProblem(loaded.invoice.balance > 0 ? 'Please contact the clinic to pay this invoice.' : 'This invoice is already paid.')

  const reference = newReference('invoice')
  const { error } = await database.from('online_payments').insert({
    reference, kind: 'invoice', invoice_id: loaded.invoice.id, patient_id: input.patientId, email: input.email, amount_kobo: toKobo(amount), currency: 'NGN',
  })
  if (error) throw error
  const checkout = await initializeTransaction({
    email: input.email, amountKobo: toKobo(amount), currency: 'NGN', reference,
    callbackUrl: `${input.origin}/patient-portal?section=billing&payment=${reference}`,
    metadata: { kind: 'invoice', invoice_number: loaded.invoice.number, custom_fields: [{ display_name: 'Invoice', variable_name: 'invoice', value: loaded.invoice.number }] },
  })
  return { url: checkout.authorization_url, reference }
}

/** Starts paying for a new booking. The price comes from the booking, never the browser. */
export async function startBookingPayment(database: SupabaseClient, input: { appointmentId: string; origin: string }) {
  if (!paystackConfigured()) throw new PaymentProblem('Online payment is not set up.')
  const { data: appointment, error } = await database.from('appointments').select('id,email,consultation_type,amount,service_name,payment_status,status,patient_id,first_name').eq('id', input.appointmentId).maybeSingle()
  if (error) throw error
  if (!appointment || appointment.status === 'cancelled') throw new PaymentProblem('This booking cannot be paid online.')
  if (appointment.payment_status === 'paid') throw new PaymentProblem('This booking is already paid.')
  const amount = bookingAmount(appointment)
  if (!appointment.email || amount <= 0) throw new PaymentProblem('This booking cannot be paid online.')

  const reference = newReference('booking')
  const { error: insertError } = await database.from('online_payments').insert({
    reference, kind: 'booking', appointment_id: appointment.id, patient_id: appointment.patient_id || null, email: appointment.email, amount_kobo: toKobo(amount), currency: 'NGN',
  })
  if (insertError) throw insertError
  const checkout = await initializeTransaction({
    email: appointment.email, amountKobo: toKobo(amount), currency: 'NGN', reference,
    callbackUrl: `${input.origin}/booking/payment`,
    metadata: { kind: 'booking', booking: bookingTypeName(appointment), custom_fields: [{ display_name: 'Booking', variable_name: 'booking', value: bookingTypeName(appointment) }] },
  })
  return { url: checkout.authorization_url, reference }
}

export type SettleResult =
  | { ok: true; kind: 'invoice' | 'booking'; already: boolean; amountKobo: number; invoiceId?: string | null; patientId?: string | null }
  | { ok: false; reason: string; kind?: 'invoice' | 'booking'; patientId?: string | null }

/**
 * Verifies a payment with Paystack and records it. Safe to call more than
 * once for the same reference: the redirect back and the webhook both do.
 */
export async function settleOnlinePayment(database: SupabaseClient, reference: string): Promise<SettleResult> {
  const { data: payment, error } = await database.from('online_payments').select('*').eq('reference', reference).maybeSingle()
  if (error) throw error
  if (!payment) return { ok: false, reason: 'unknown_reference' }
  const base = { kind: payment.kind as 'invoice' | 'booking', patientId: payment.patient_id as string | null }
  if (payment.status === 'success') return { ok: true, ...base, already: true, amountKobo: payment.amount_kobo, invoiceId: payment.invoice_id }
  if (payment.status === 'failed') return { ok: false, ...base, reason: 'failed' }

  const transaction = await verifyTransaction(reference)
  const matches = transaction.status === 'success' && transaction.amount === Number(payment.amount_kobo) && transaction.currency === payment.currency
  if (!matches) {
    if (['failed', 'abandoned', 'reversed'].includes(transaction.status) || transaction.status === 'success') {
      await database.from('online_payments').update({ status: 'failed', paystack_payload: transaction, settle_error: transaction.status === 'success' ? 'Amount or currency did not match.' : null }).eq('reference', reference).eq('status', 'pending')
    }
    return { ok: false, ...base, reason: transaction.status === 'success' ? 'amount_mismatch' : transaction.status }
  }

  // Only the first caller to flip pending -> success records the payment.
  const { data: claimed, error: claimError } = await database.from('online_payments')
    .update({ status: 'success', verified_at: new Date().toISOString(), paystack_payload: transaction })
    .eq('reference', reference).eq('status', 'pending').select('reference')
  if (claimError) throw claimError
  if (!claimed?.length) return { ok: true, ...base, already: true, amountKobo: payment.amount_kobo, invoiceId: payment.invoice_id }

  const naira = Number(payment.amount_kobo) / 100
  try {
    if (payment.kind === 'invoice') await recordInvoicePayment(database, payment, naira)
    else await recordBookingPayment(database, payment, naira)
  } catch (problem) {
    // Paystack has the money and the row says so; staff finish the record.
    const message = problem instanceof Error ? problem.message : String(problem)
    console.error('Online payment verified but not recorded:', reference, problem)
    await database.from('online_payments').update({ settle_error: message.slice(0, 500) }).eq('reference', reference)
    emailStaff('An online payment needs recording', `Paystack payment ${reference} (₦${naira.toLocaleString('en-NG')}) was received but could not be recorded automatically. Record it by hand.`, '/admin/clinical?view=patients')
  }
  return { ok: true, ...base, already: false, amountKobo: payment.amount_kobo, invoiceId: payment.invoice_id }
}

/**
 * Splits a payment across an invoice's lines in order, each up to what it
 * still owes. Someone may have paid by transfer meanwhile, so anything beyond
 * what is owed is returned as leftover for staff to refund or apply.
 */
export function splitPayment(lines: Array<{ billId: string; owed: number }>, naira: number) {
  let leftKobo = Math.round(naira * 100)
  const parts: Array<{ billId: string; amount: number }> = []
  for (const line of lines) {
    if (leftKobo <= 0) break
    const kobo = Math.min(leftKobo, Math.round(line.owed * 100))
    if (kobo <= 0) continue
    parts.push({ billId: line.billId, amount: kobo / 100 })
    leftKobo -= kobo
  }
  return { parts, leftoverKobo: Math.max(0, leftKobo) }
}

async function recordInvoicePayment(database: SupabaseClient, payment: Record<string, any>, naira: number) {
  const loaded = payment.invoice_id ? await loadInvoice(database, payment.invoice_id) : null
  const lines = loaded ? payableLines(loaded) : []
  const split = splitPayment(lines, naira)
  const allocations: Array<{ bill_id: string; amount: number; payment_id: string }> = []
  for (const part of split.parts) {
    const { data, error } = await database.from('emr_financial_payments').insert({
      financial_record_id: part.billId, patient_id: payment.patient_id, amount: part.amount, payment_date: lagosToday(),
      payment_method: 'paystack', payment_reference: payment.reference, notes: `Paid online by the patient${loaded ? ` for invoice ${loaded.invoice.number}` : ''}.`,
    }).select('id').single()
    if (error) throw error
    allocations.push({ bill_id: part.billId, amount: part.amount, payment_id: data.id })
  }
  const unallocatedKobo = split.leftoverKobo
  await database.from('online_payments').update({ allocations, unallocated_kobo: unallocatedKobo }).eq('reference', payment.reference)
  const number = loaded?.invoice.number || 'an invoice'
  emailStaff(`Invoice ${number} paid online`, `${formatInvoiceMoney(naira, 'NGN')} received through Paystack (${payment.reference}).${unallocatedKobo ? ` ${formatInvoiceMoney(unallocatedKobo / 100, 'NGN')} was more than the invoice still owed: refund it or apply it to another bill.` : ''}`, `/admin/clinical?view=patients&patient=${payment.patient_id}&chart=financial`)
}

async function recordBookingPayment(database: SupabaseClient, payment: Record<string, any>, naira: number) {
  if (!payment.appointment_id) throw new Error('The booking for this payment no longer exists.')
  const { data, error } = await database.from('appointments')
    .update({ payment_status: 'paid', payment_reference: payment.reference, updated_at: new Date().toISOString() })
    .eq('id', payment.appointment_id).select('consultation_type,amount,service_name,preferred_date').single()
  if (error) throw error
  emailStaff('Booking paid online', `${bookingTypeName(data)} on ${data.preferred_date || 'a requested date'}: ${formatInvoiceMoney(naira, 'NGN')} received through Paystack (${payment.reference}).`, '/admin/inbox/requests')
}

function emailStaff(title: string, detail: string, path: string) {
  const send = async () => {
    try {
      const { html, text } = staffEmail({ title, detail, link: `${siteUrl}${path}` })
      for (const to of staffRecipients()) await sendEmail({ to, subject: title, html, text })
    } catch (problem) {
      console.error('Failed to email the clinic about an online payment:', problem)
    }
  }
  try { after(send) } catch { void send() }
}
