'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircleIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { contact } from '@/lib/seo'

type Status = 'checking' | 'paid' | 'pending' | 'failed' | 'unknown'

// Confirms the payment with the server (which checks with Paystack) and says
// what happens next. Retries a few times, as Paystack can take a moment.
export default function BookingPaymentStatus() {
  const reference = useSearchParams().get('reference') || ''
  const [status, setStatus] = useState<Status>(reference ? 'checking' : 'unknown')

  useEffect(() => {
    if (!reference) return
    let cancelled = false
    let attempts = 0
    const check = async () => {
      attempts += 1
      const response = await fetch('/api/payments/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) }).catch(() => null)
      const result = await response?.json().catch(() => null) as { status?: Status } | null
      if (cancelled) return
      const next = result?.status || 'pending'
      if (next === 'pending' && attempts < 4) { window.setTimeout(check, 2500); return }
      setStatus(next)
    }
    void check()
    return () => { cancelled = true }
  }, [reference])

  const views: Record<Status, { Icon: typeof CheckCircleIcon; tone: string; title: string; text: string }> = {
    checking: { Icon: ClockIcon, tone: 'text-green-mid', title: 'Confirming your payment…', text: 'This takes a few seconds. Please keep this page open.' },
    paid: { Icon: CheckCircleIcon, tone: 'text-green-mid', title: 'Payment received. Thank you!', text: 'Your booking is paid. Our care team will confirm your appointment time by email or phone shortly.' },
    pending: { Icon: ClockIcon, tone: 'text-amber-600', title: 'We are still confirming your payment', text: 'Paystack has not confirmed it yet. If money left your account, there is nothing more to do: we will confirm your booking once it comes through.' },
    failed: { Icon: WarningCircleIcon, tone: 'text-red-600', title: 'The payment did not go through', text: 'Your booking is saved, but it is not paid yet. Our team will contact you about payment, or you can reach us below.' },
    unknown: { Icon: WarningCircleIcon, tone: 'text-amber-600', title: 'We could not find this payment', text: 'If you have paid, please contact us with your Paystack receipt and we will sort it out.' },
  }
  const view = views[status]

  return (
    <div className="w-full max-w-lg rounded-[24px] bg-white p-8 text-center shadow-custom" aria-live="polite">
      <view.Icon size={56} weight="fill" className={`mx-auto ${view.tone}`} />
      <h1 className="mt-4 font-dm-sans text-2xl font-bold text-green-deep">{view.title}</h1>
      <p className="mt-3 font-dm-sans leading-7 text-text-mid">{view.text}</p>
      {status !== 'checking' && <p className="mt-5 font-dm-sans text-sm text-text-mid">Questions? Call <a href={`tel:${contact.phoneNigeria}`} className="font-semibold text-green-mid">{contact.phoneNigeria}</a> or email <a href={`mailto:${contact.email}`} className="font-semibold text-green-mid">{contact.email}</a>.</p>}
      {status !== 'checking' && <Link href="/" className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 font-dm-sans font-bold text-green-deep hover:bg-gold-light">Back to home</Link>}
    </div>
  )
}
