'use client'

import { useCallback, useEffect, useState } from 'react'
import { GiftIcon } from '@phosphor-icons/react'
import { visitTimes } from '@/lib/festive-offer'

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
type PaymentStatus = 'pending' | 'paid' | 'failed'

type FestiveBooking = {
  id: string
  package_name: string
  package_price: number
  booked_for: 'self' | 'gift'
  buyer_first_name: string
  buyer_last_name: string
  buyer_email: string
  buyer_phone: string
  recipient_name: string
  recipient_phone: string
  visit_address: string
  preferred_date: string | null
  preferred_time: string | null
  gift_message: string | null
  status: BookingStatus
  payment_status: PaymentStatus
  created_at: string
}

const statusStyles: Record<BookingStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })

function visitWhen(booking: FestiveBooking) {
  if (!booking.preferred_date) return 'FXMed to arrange'
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${booking.preferred_date}T12:00:00`))
  const time = visitTimes.find((slot) => slot.value === booking.preferred_time)?.label || booking.preferred_time
  return [date, time].filter(Boolean).join(' · ')
}

export default function FestiveBookings() {
  const [bookings, setBookings] = useState<FestiveBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch('/api/festive-bookings')
      if (!response.ok) throw new Error('Failed to fetch festive bookings')
      const { bookings: data } = await response.json()
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching festive bookings:', error)
      setLoadError('Festive bookings could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const updateBooking = async (id: string, change: { status?: BookingStatus; payment_status?: PaymentStatus }) => {
    setUpdatingId(id)
    try {
      const response = await fetch('/api/festive-bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...change }),
      })
      if (!response.ok) throw new Error('Failed to update festive booking')
      setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, ...change } : booking)))
    } catch (error) {
      console.error('Error updating festive booking:', error)
      window.alert('Failed to update the booking. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  const open = bookings.filter((booking) => booking.status !== 'completed' && booking.status !== 'cancelled')

  return (
    <section className="mb-6 overflow-hidden rounded-[20px] bg-white shadow-lg" aria-labelledby="festive-bookings-title">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-mid">Festive wellness collection</p>
          <h2 id="festive-bookings-title" className="font-dm-sans text-2xl font-bold text-green-deep">Festive Package Bookings</h2>
          <p className="mt-1 text-sm text-text-mid">Health-Hamper bookings from the website. Mark a booking paid once the payment shows in Paystack.</p>
        </div>
        <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-deep">{open.length} open</span>
      </div>

      <div className="px-5 py-6 sm:px-7">
        {loading ? (
          <p className="text-sm text-gray-500">Loading festive bookings…</p>
        ) : loadError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
            <button type="button" onClick={fetchBookings} className="font-semibold underline underline-offset-2">Retry</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <GiftIcon size={40} weight="duotone" className="mx-auto mb-3 text-green-mid" />
            <p className="font-dm-sans font-semibold text-gray-700">No festive bookings yet</p>
            <p className="mt-1 text-sm text-gray-500">Bookings made from the home page or the festive popup will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const buyer = `${booking.buyer_first_name} ${booking.buyer_last_name}`
              return (
                <article key={booking.id} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-dm-sans text-lg font-bold text-gray-900">{booking.recipient_name}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[booking.status]}`}>{booking.status}</span>
                        {booking.booked_for === 'gift' && <span className="rounded-full bg-[#e3edc6] px-2.5 py-1 text-xs font-semibold text-green-deep">Gift from {buyer}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="font-semibold text-green-deep">{booking.package_name} · {naira.format(booking.package_price)}</span>
                        <span>{visitWhen(booking)}</span>
                        <span className={booking.payment_status === 'paid' ? 'font-medium text-green-600' : 'font-medium text-amber-600'}>Payment: {booking.payment_status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        aria-label={`Status for ${booking.recipient_name}`}
                        value={booking.status}
                        disabled={updatingId === booking.id}
                        onChange={(event) => updateBooking(booking.id, { status: event.target.value as BookingStatus })}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <select
                        aria-label={`Payment for ${booking.recipient_name}`}
                        value={booking.payment_status}
                        disabled={updatingId === booking.id}
                        onChange={(event) => updateBooking(booking.id, { payment_status: event.target.value as PaymentStatus })}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                      >
                        <option value="pending">Payment pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Payment failed</option>
                      </select>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{booking.booked_for === 'gift' ? 'Recipient phone' : 'Phone'}</dt><dd className="mt-1 text-gray-700">{booking.recipient_phone}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Visit address</dt><dd className="mt-1 text-gray-700">{booking.visit_address}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{booking.booked_for === 'gift' ? 'Booked and paid by' : 'Name'}</dt><dd className="mt-1 text-gray-700">{buyer}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{booking.booked_for === 'gift' ? 'Buyer contact' : 'Email'}</dt><dd className="mt-1 break-all text-gray-700">{booking.booked_for === 'gift' ? `${booking.buyer_phone} · ${booking.buyer_email}` : booking.buyer_email}</dd></div>
                    {booking.gift_message && (
                      <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Gift message</dt><dd className="mt-1 rounded-lg bg-gray-50 p-3 text-gray-700">{booking.gift_message}</dd></div>
                    )}
                  </dl>
                  <p className="mt-3 text-xs text-gray-400">Booked {new Date(booking.created_at).toLocaleString()}</p>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
