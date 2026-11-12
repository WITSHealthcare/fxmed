// Patient invoices (migration 051). An invoice lists one or more bills from the
// chart's Financial tab. Each line keeps the bill's description and amount from
// when the invoice was made; payments come from the bills, so the balance is
// always current. Shared by the EMR, the patient portal and the invoice PDF.

/**
 * How patients pay an invoice, printed on it and shown in the portal. Leave a
 * field empty to hide it; with no account number, patients are asked to
 * contact the clinic to arrange payment.
 */
export const INVOICE_PAYMENT = {
  bankName: '',
  accountName: '',
  accountNumber: '',
}

export const hasBankDetails = () => Boolean(INVOICE_PAYMENT.accountNumber.trim())

export type InvoiceStatus = 'draft' | 'sent' | 'void'
export type InvoicePaymentStatus = 'unpaid' | 'part_paid' | 'paid' | 'overdue' | 'void'

export type InvoiceItem = {
  id: string
  billId: string | null
  description: string
  serviceDate: string | null
  amount: number
  paid: number
}

export type Invoice = {
  id: string
  number: string
  patientId: string
  currency: string
  issueDate: string
  dueDate: string | null
  notes: string | null
  status: InvoiceStatus
  sentAt: string | null
  createdAt: string
  items: InvoiceItem[]
  total: number
  paid: number
  balance: number
  paymentStatus: InvoicePaymentStatus
}

/** The bill fields an invoice reads payments from. */
export type InvoiceBill = { id: string; amount_paid: number | string | null; status: string | null }

export const INVOICE_COLUMNS = 'id,patient_id,invoice_number,currency,issue_date,due_date,notes,status,sent_at,created_at,items:emr_invoice_items(id,financial_record_id,description,service_date,amount,position)'

const money = (value: unknown) => Math.round((Number(value) || 0) * 100) / 100
const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())

/** An invoice row with its lines, and what has been paid on each from its bill. */
export function mapInvoice(row: Record<string, any>, bills: InvoiceBill[]): Invoice {
  const items: InvoiceItem[] = [...(row.items || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(item => {
      const amount = money(item.amount)
      const bill = bills.find(entry => entry.id === item.financial_record_id)
      // A waived or refunded bill leaves nothing to pay on its line.
      const settled = bill && (bill.status === 'waived' || bill.status === 'refunded')
      const paid = settled ? amount : bill ? Math.min(amount, money(bill.amount_paid)) : 0
      return { id: item.id, billId: item.financial_record_id || null, description: item.description, serviceDate: item.service_date || null, amount, paid }
    })
  const total = money(items.reduce((sum, item) => sum + item.amount, 0))
  const paid = money(items.reduce((sum, item) => sum + item.paid, 0))
  const balance = money(Math.max(0, total - paid))
  const status: InvoiceStatus = row.status
  const paymentStatus: InvoicePaymentStatus = status === 'void' ? 'void'
    : balance <= 0 ? 'paid'
    : row.due_date && row.due_date < lagosToday() ? 'overdue'
    : paid > 0 ? 'part_paid'
    : 'unpaid'
  return {
    id: row.id,
    number: row.invoice_number,
    patientId: row.patient_id,
    currency: row.currency || 'NGN',
    issueDate: row.issue_date,
    dueDate: row.due_date || null,
    notes: row.notes || null,
    status,
    sentAt: row.sent_at || null,
    createdAt: row.created_at,
    items,
    total,
    paid,
    balance,
    paymentStatus,
  }
}

export const paymentStatusLabels: Record<InvoicePaymentStatus, string> = {
  unpaid: 'Unpaid',
  part_paid: 'Part paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Cancelled',
}

export function formatInvoiceMoney(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

export function formatInvoiceDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(`${value.slice(0, 10)}T12:00:00+01:00`))
}
