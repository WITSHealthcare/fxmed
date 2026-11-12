import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanText, emrErrorMessage, getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'
import { INVOICE_COLUMNS, formatInvoiceMoney, mapInvoice, type InvoiceBill } from '@/lib/invoices'
import { invoiceNotice, notifyPatient } from '@/lib/patient-portal'

export const runtime = 'nodejs'

// A patient's invoices, made from bills on the chart's Financial tab. See
// lib/invoices.ts and migration 051.

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status })
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

function serverError(error: unknown) {
  console.error('EMR invoices error:', error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === '42P01' || code === 'PGRST205') return fail('Invoices need migration 051 to be run in Supabase first.', 503)
  return fail(emrErrorMessage(error), 500)
}

async function loadInvoices(database: SupabaseClient, patientId: string, id?: string) {
  let query = database.from('emr_invoices').select(INVOICE_COLUMNS).eq('patient_id', patientId)
  if (id) query = query.eq('id', id)
  const [{ data: rows, error }, { data: bills, error: billsError }] = await Promise.all([
    query.order('created_at', { ascending: false }),
    database.from('emr_financial_records').select('id,amount_paid,status').eq('patient_id', patientId),
  ])
  if (error) throw error
  if (billsError) throw billsError
  return (rows || []).map(row => mapInvoice(row, (bills || []) as InvoiceBill[]))
}

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_financial_records')
  if (!context) return fail('Financial access required.', 403)
  const patientId = request.nextUrl.searchParams.get('patientId')
  if (!isUuid(patientId)) return fail('A valid patient is required.')
  try {
    return NextResponse.json({ invoices: await loadInvoices(context.database, patientId) })
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: NextRequest) {
  const context = await getEmrContext(request, 'manage_financial_records')
  if (!context) return fail('Financial access required.', 403)
  const { database, user } = context
  const body = await request.json().catch(() => null) as Record<string, any> | null
  if (!body) return fail('A request body is required.')

  try {
    if (body.action === 'create') {
      const patientId = body.patientId
      if (!isUuid(patientId)) return fail('A valid patient is required.')
      const billIds = Array.from(new Set((Array.isArray(body.billIds) ? body.billIds : []).filter(isUuid))).slice(0, 50) as string[]
      if (!billIds.length) return fail('Choose at least one bill to invoice.')
      if (body.dueDate && !isDate(body.dueDate)) return fail('Choose a valid due date.')

      const { data: bills, error: billsError } = await database.from('emr_financial_records')
        .select('id,patient_id,description,amount_due,currency,service_date').in('id', billIds)
      if (billsError) throw billsError
      if (!bills || bills.length !== billIds.length || bills.some(bill => bill.patient_id !== patientId)) return fail('One of the bills could not be found for this patient.', 404)
      const currencies = Array.from(new Set(bills.map(bill => bill.currency || 'NGN')))
      if (currencies.length > 1) return fail('An invoice can only include bills in one currency.')

      // A bill goes on one invoice at a time; voiding an invoice frees its bills.
      const { data: taken, error: takenError } = await database.from('emr_invoice_items')
        .select('financial_record_id,invoice:emr_invoices!inner(invoice_number,status)')
        .in('financial_record_id', billIds).neq('invoice.status', 'void')
      if (takenError) throw takenError
      if (taken?.length) {
        const first = taken[0] as any
        const bill = bills.find(item => item.id === first.financial_record_id)
        return fail(`"${bill?.description || 'A bill'}" is already on invoice ${first.invoice?.invoice_number}. Void that invoice first to invoice it again.`, 409)
      }

      const send = body.send === true
      const now = new Date().toISOString()
      const { data: invoice, error } = await database.from('emr_invoices').insert({
        patient_id: patientId,
        currency: currencies[0],
        due_date: body.dueDate || null,
        notes: cleanText(body.notes, 2000),
        status: send ? 'sent' : 'draft',
        sent_at: send ? now : null,
        created_by: user.id,
        created_by_email: user.email,
      }).select('id,invoice_number').single()
      if (error) throw error

      // Lines in the order the bills were chosen.
      const ordered = billIds.map(id => bills.find(bill => bill.id === id)!)
      const { error: itemsError } = await database.from('emr_invoice_items').insert(ordered.map((bill, position) => ({
        invoice_id: invoice.id, financial_record_id: bill.id, description: bill.description, service_date: bill.service_date, amount: bill.amount_due, position,
      })))
      if (itemsError) {
        await database.from('emr_invoices').delete().eq('id', invoice.id)
        throw itemsError
      }

      const [saved] = await loadInvoices(database, patientId, invoice.id)
      await writeEmrAudit(database, user, { action: send ? 'create_and_send_invoice' : 'create_invoice', entityType: 'emr_invoices', entityId: invoice.id, patientId, metadata: { invoiceNumber: invoice.invoice_number, bills: billIds.length, total: saved.total, currency: saved.currency } })
      if (send) await notifyPatient(database, patientId, invoiceNotice(saved.number, formatInvoiceMoney(saved.total, saved.currency)))
      return NextResponse.json({ invoice: saved }, { status: 201 })
    }

    if (!isUuid(body.id)) return fail('A valid invoice is required.')
    const { data: current, error: findError } = await database.from('emr_invoices').select('id,patient_id,invoice_number,status').eq('id', body.id).maybeSingle()
    if (findError) throw findError
    if (!current) return fail('Invoice not found.', 404)

    if (body.action === 'send') {
      if (current.status !== 'draft') return fail(current.status === 'sent' ? 'This invoice has already been sent.' : 'A cancelled invoice cannot be sent.', 409)
      const { error } = await database.from('emr_invoices').update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', current.id)
      if (error) throw error
      const [saved] = await loadInvoices(database, current.patient_id, current.id)
      await writeEmrAudit(database, user, { action: 'send_invoice', entityType: 'emr_invoices', entityId: current.id, patientId: current.patient_id, metadata: { invoiceNumber: current.invoice_number } })
      await notifyPatient(database, current.patient_id, invoiceNotice(saved.number, formatInvoiceMoney(saved.total, saved.currency)))
      return NextResponse.json({ invoice: saved })
    }

    if (body.action === 'void') {
      if (current.status === 'void') return fail('This invoice is already cancelled.', 409)
      const { error } = await database.from('emr_invoices').update({ status: 'void', voided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', current.id)
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'void_invoice', entityType: 'emr_invoices', entityId: current.id, patientId: current.patient_id, metadata: { invoiceNumber: current.invoice_number } })
      return NextResponse.json({ success: true })
    }

    // Only drafts can be deleted: a sent invoice is cancelled instead, so the patient's copy stays explained.
    if (body.action === 'delete') {
      if (current.status !== 'draft') return fail('Only draft invoices can be deleted. Cancel a sent invoice instead.', 409)
      const { error } = await database.from('emr_invoices').delete().eq('id', current.id)
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'delete_draft_invoice', entityType: 'emr_invoices', entityId: current.id, patientId: current.patient_id, metadata: { invoiceNumber: current.invoice_number } })
      return NextResponse.json({ success: true })
    }

    return fail('Unknown invoice action.')
  } catch (error) {
    return serverError(error)
  }
}
