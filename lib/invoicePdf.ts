// The FXMed invoice as a PDF, made in the browser for staff and patients alike.

import { renderReportPdf } from './reportPdf'
import { REPORT_ACCENT, REPORT_INK, pdfType } from './reportTheme'
import { INVOICE_PAYMENT, formatInvoiceDate, formatInvoiceMoney, hasBankDetails, paymentStatusLabels, type Invoice } from './invoices'
import { contact } from './seo'

export type InvoicePatient = { fullName: string; mrn?: string | null; phone?: string | null; email?: string | null; address?: string | null }

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const text = (value: string | null | undefined) => escapeHtml((value || '').trim())

/** `subtitle` goes under the invoice number; `dates: false` leaves out the service date column. */
export type InvoicePdfOptions = { subtitle?: string; dates?: boolean }

function invoiceHtml(invoice: Invoice, patient: InvoicePatient, options: InvoicePdfOptions = {}) {
  const dates = options.dates !== false
  const money = (amount: number) => formatInvoiceMoney(amount, invoice.currency)
  const label = (value: string) => `<div style="font-size:${pdfType('label')};font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">${value}</div>`
  const line = (value: string | null | undefined) => value && value.trim() ? `<div style="font-size:${pdfType('body')};color:#374151;line-height:1.5">${text(value)}</div>` : ''
  const statusTone = invoice.paymentStatus === 'paid' ? 'background:#ecfccb;color:#3f6212' : invoice.paymentStatus === 'overdue' ? 'background:#fee2e2;color:#b91c1c' : invoice.paymentStatus === 'void' ? 'background:#f3f4f6;color:#6b7280' : 'background:#fef3c7;color:#92400e'

  const rows = invoice.items.map((item, index) => `<tr data-pdf-keep-together style="background:${index % 2 ? '#fafafa' : '#fff'}">
    <td style="padding:10px 8px;color:#6b7280;vertical-align:top">${index + 1}</td>
    <td style="padding:10px 8px;color:${REPORT_INK};font-weight:700;vertical-align:top">${text(item.description)}</td>
    ${dates ? `<td style="padding:10px 8px;color:#374151;vertical-align:top;white-space:nowrap">${item.serviceDate ? formatInvoiceDate(item.serviceDate) : '—'}</td>` : ''}
    <td style="padding:10px 8px;color:${REPORT_INK};font-weight:700;text-align:right;vertical-align:top;white-space:nowrap">${money(item.amount)}</td>
  </tr>`).join('')

  const total = (name: string, value: string, strong = false) => `<tr><td style="padding:6px 8px;color:${strong ? REPORT_INK : '#374151'};font-weight:${strong ? 800 : 600};font-size:${pdfType(strong ? 'value' : 'body')}">${name}</td><td style="padding:6px 8px;text-align:right;color:${REPORT_INK};font-weight:800;font-size:${pdfType(strong ? 'value' : 'body')};white-space:nowrap">${value}</td></tr>`

  const payment = invoice.status === 'void'
    ? `<div style="font-size:${pdfType('body')};color:#374151">This invoice has been cancelled. Nothing is owed on it.</div>`
    : invoice.balance <= 0
      ? `<div style="font-size:${pdfType('body')};color:#3f6212;font-weight:700">Paid in full. Thank you.</div>`
      : hasBankDetails()
        ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
            ${INVOICE_PAYMENT.bankName ? `<div>${label('Bank')}<div style="font-size:${pdfType('value')};font-weight:700;color:${REPORT_INK}">${text(INVOICE_PAYMENT.bankName)}</div></div>` : ''}
            ${INVOICE_PAYMENT.accountName ? `<div>${label('Account name')}<div style="font-size:${pdfType('value')};font-weight:700;color:${REPORT_INK}">${text(INVOICE_PAYMENT.accountName)}</div></div>` : ''}
            <div>${label('Account number')}<div style="font-size:${pdfType('value')};font-weight:700;color:${REPORT_INK}">${text(INVOICE_PAYMENT.accountNumber)}</div></div>
          </div>
          <div style="margin-top:12px;font-size:${pdfType('body')};color:#374151">Please use <strong>${text(invoice.number)}</strong> as the payment reference.</div>`
        : `<div style="font-size:${pdfType('body')};color:#374151">Please contact FXMed on ${text(contact.phoneNigeria)} or ${text(contact.email)} to arrange payment, quoting <strong>${text(invoice.number)}</strong>.</div>`

  return `<div style="color:${REPORT_INK}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:22px;border-bottom:3px solid ${REPORT_ACCENT}">
      <div>
        <img src="${window.location.origin}/FXMed_Logo_Black.png" style="height:50px;width:auto;display:block" />
        <div style="margin-top:12px;font-size:${pdfType('fine')};color:#4b5563;line-height:1.6">${text(contact.lagosAddress)}<br/>${text(contact.phoneNigeria)} · ${text(contact.email)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:${pdfType('title')};font-weight:800;letter-spacing:-.02em">Invoice</div>
        <div style="margin-top:4px;font-size:${pdfType('value')};font-weight:700">${text(invoice.number)}</div>
        ${options.subtitle ? `<div style="margin-top:2px;font-size:${pdfType('body')};color:#4b5563;font-weight:600">${text(options.subtitle)}</div>` : ''}
        <div style="display:inline-block;margin-top:10px;border-radius:999px;padding:6px 12px 7px;line-height:1.1;font-size:${pdfType('badge')};font-weight:800;text-transform:uppercase;letter-spacing:.06em;${statusTone}">${paymentStatusLabels[invoice.paymentStatus]}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:20px;margin:24px 0">
      <div>${label('Billed to')}<div style="font-size:${pdfType('value')};font-weight:800">${text(patient.fullName)}</div>${patient.mrn ? line(`Patient number: ${patient.mrn}`) : ''}${line(patient.phone)}${line(patient.email)}${line(patient.address)}</div>
      <div>${label('Issue date')}<div style="font-size:${pdfType('value')};font-weight:700">${formatInvoiceDate(invoice.issueDate)}</div></div>
      <div>${label('Due date')}<div style="font-size:${pdfType('value')};font-weight:700">${invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : 'On receipt'}</div></div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:${pdfType('fine')}">
      <thead><tr style="background:${REPORT_INK};color:#fff;text-align:left">
        <th style="padding:10px 8px;width:28px">#</th><th style="padding:10px 8px">Description</th>${dates ? '<th style="padding:10px 8px;width:150px">Service date</th>' : ''}<th style="padding:10px 8px;width:140px;text-align:right">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div data-pdf-keep-together style="display:flex;justify-content:flex-end;margin-top:14px">
      <table style="min-width:300px;border-collapse:collapse;border-top:2px solid #e5e7eb">
        ${total('Total', money(invoice.total))}
        ${total('Paid to date', money(invoice.paid))}
        ${total('Balance due', money(invoice.status === 'void' ? 0 : invoice.balance), true)}
      </table>
    </div>

    <div data-pdf-keep-together style="margin-top:24px;border-radius:12px;background:#f7f8ed;border-left:4px solid #6b8e23;padding:16px 18px">
      ${label(invoice.balance > 0 && invoice.status !== 'void' ? 'How to pay' : 'Payment')}
      ${payment}
    </div>

    ${invoice.notes && invoice.notes.trim() ? `<div data-pdf-keep-together style="margin-top:18px">${label('Notes')}<div style="font-size:${pdfType('body')};color:#374151;line-height:1.6;white-space:pre-wrap">${text(invoice.notes)}</div></div>` : ''}

    <div style="margin-top:30px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:${pdfType('footer')};color:#6b7280;text-align:center">Thank you for choosing FXMed. Questions about this invoice? Contact us on ${text(contact.phoneNigeria)} or ${text(contact.email)}.</div>
  </div>`
}

export function invoiceFileName(invoice: Invoice) {
  return `fxmed-invoice-${invoice.number.toLowerCase()}.pdf`
}

export async function generateInvoicePdf(invoice: Invoice, patient: InvoicePatient, options: InvoicePdfOptions = {}): Promise<Blob> {
  return renderReportPdf([invoiceHtml(invoice, patient, options)])
}
