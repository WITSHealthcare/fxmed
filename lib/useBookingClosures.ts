import { useCallback, useEffect, useState } from 'react'
import type { BookingClosure } from '@/lib/bookingTimes'

/**
 * The days and times closed to bookings, loaded each time `trigger` changes to
 * a truthy value (such as a booking form opening). If they cannot be loaded the
 * form offers every time, and the server still refuses closed ones.
 */
export function useBookingClosures(trigger: unknown) {
  const [closures, setClosures] = useState<BookingClosure[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!trigger) return
    const controller = new AbortController()
    fetch('/api/booking-closures', { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (Array.isArray(data?.closures)) setClosures(data.closures) })
      .catch(() => {})
    return () => controller.abort()
  }, [trigger, version])

  const reload = useCallback(() => setVersion(current => current + 1), [])
  return { closures, reload }
}
