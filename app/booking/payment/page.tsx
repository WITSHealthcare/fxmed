import { Suspense } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { createMetadata } from '@/lib/seo'
import BookingPaymentStatus from './BookingPaymentStatus'

export const metadata = createMetadata({
  title: 'Booking payment | FXMed',
  description: 'Confirming your FXMed booking payment.',
  path: '/booking/payment',
  noIndex: true,
})

// Paystack sends people here after they pay for a booking (?reference=...).
export default function BookingPaymentPage() {
  return (
    <>
      <Navigation />
      <main className="flex min-h-[70vh] items-start justify-center bg-cream px-4 pb-24 pt-36 sm:pt-40">
        <Suspense><BookingPaymentStatus /></Suspense>
      </main>
      <Footer />
    </>
  )
}
