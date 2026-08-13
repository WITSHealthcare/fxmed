'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarXIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

type WebsiteAppointment = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  home_address: string
  consultation_type: 'telemedicine' | 'home-visit'
  preferred_date: string
  preferred_time: string
  symptoms: string
  status: AppointmentStatus
  payment_status: 'pending' | 'paid' | 'failed'
  created_at: string
  updated_at: string
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function appointmentDateKey(value: string) {
  return value.slice(0, 10)
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

function calendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

const statusStyles: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export default function AppointmentCalendar() {
  const [appointments, setAppointments] = useState<WebsiteAppointment[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    setAppointmentsLoading(true)
    setLoadError('')
    try {
      const response = await fetch('/api/appointments')
      if (!response.ok) throw new Error('Failed to fetch appointments')
      const { appointments: data } = await response.json()
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
      setLoadError('Appointments could not be loaded. Please try again.')
    } finally {
      setAppointmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    if (!selectedDate) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDate(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedDate])

  const appointmentsByDate = useMemo(() => {
    return appointments.reduce<Record<string, WebsiteAppointment[]>>((groups, appointment) => {
      const key = appointmentDateKey(appointment.preferred_date)
      if (!groups[key]) groups[key] = []
      groups[key].push(appointment)
      return groups
    }, {})
  }, [appointments])

  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth])
  const selectedAppointments = selectedDate ? appointmentsByDate[selectedDate] || [] : []
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    return appointments.filter((appointment) => {
      const patient = `${appointment.first_name} ${appointment.last_name}`.toLowerCase()
      return patient.includes(query)
        || appointment.email.toLowerCase().includes(query)
        || appointment.phone.toLowerCase().includes(query)
    })
  }, [appointments, searchQuery])
  const todayKey = dateKey(new Date())
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const key = appointmentDateKey(appointment.preferred_date)
        return key >= todayKey && appointment.status !== 'cancelled' && appointment.status !== 'completed'
      })
      .sort((first, second) => {
        const firstDateTime = `${appointmentDateKey(first.preferred_date)}T${first.preferred_time}`
        const secondDateTime = `${appointmentDateKey(second.preferred_date)}T${second.preferred_time}`
        return firstDateTime.localeCompare(secondDateTime)
      })
  }, [appointments, todayKey])

  const changeMonth = (amount: number) => {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const openSearchResult = (appointment: WebsiteAppointment) => {
    const key = appointmentDateKey(appointment.preferred_date)
    const [year, month] = key.split('-').map(Number)
    setVisibleMonth(new Date(year, month - 1, 1))
    setSelectedDate(key)
    setSearchQuery('')
  }

  const updateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    setUpdatingId(appointmentId)
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, status }),
      })
      if (!response.ok) throw new Error('Failed to update appointment')
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, status } : appointment
        )
      )
    } catch (error) {
      console.error('Error updating appointment:', error)
      window.alert('Failed to update the appointment. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (appointment: WebsiteAppointment) => {
    const confirmed = window.confirm(
      `Delete the request from ${appointment.first_name} ${appointment.last_name}? This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(appointment.id)
    try {
      const response = await fetch(`/api/appointments?id=${appointment.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete appointment')
      setAppointments((current) => current.filter((item) => item.id !== appointment.id))
    } catch (error) {
      console.error('Error deleting appointment:', error)
      window.alert('Failed to delete the request. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-[20px] bg-white shadow-lg">
      <div className="flex flex-col gap-5 border-b border-gray-100 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-mid">Appointment calendar</p>
          <h2 className="font-dm-sans text-2xl font-bold text-green-deep">Schedule & Appointments</h2>
          <p className="mt-1 text-sm text-text-mid">Select a day to view and manage its booking requests.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={fetchAppointments}
            disabled={appointmentsLoading}
            className="rounded-lg bg-green-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {appointmentsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-100 px-5 py-4 sm:px-7">
        <div className="relative mx-auto max-w-2xl">
          <label htmlFor="appointment-search" className="sr-only">Search for a patient</label>
          <MagnifyingGlassIcon aria-hidden="true" size={20} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="appointment-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search patient by name, email, or phone…"
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-10 text-sm text-gray-900 outline-none transition focus:border-green-mid focus:bg-white focus:ring-2 focus:ring-green-mid/15"
          />

          {searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              {searchResults.length > 0 ? (
                <>
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {searchResults.length} appointment{searchResults.length === 1 ? '' : 's'} found
                  </p>
                  {searchResults.map((appointment) => {
                    const appointmentKey = appointmentDateKey(appointment.preferred_date)
                    return (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => openSearchResult(appointment)}
                        className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-left transition hover:bg-green-50 focus:bg-green-50 focus:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-dm-sans text-sm font-semibold text-gray-900">
                            {appointment.first_name} {appointment.last_name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {appointment.email} · {appointment.phone}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold text-green-deep">
                            {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${appointmentKey}T12:00:00`))}
                          </span>
                          <span className="block text-xs text-gray-500">{formatTime(appointment.preferred_time)}</span>
                        </span>
                      </button>
                    )
                  })}
                </>
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="font-medium text-gray-700">No patient appointments found</p>
                  <p className="mt-1 text-xs text-gray-500">Try another name, email address, or phone number.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-7">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-xl text-green-deep transition hover:border-green-deep hover:bg-green-deep hover:text-white"
        >
          ‹
        </button>
        <h3 className="min-w-48 text-center font-dm-sans text-xl font-bold text-green-deep sm:text-2xl">
          {monthFormatter.format(visibleMonth)}
        </h3>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-xl text-green-deep transition hover:border-green-deep hover:bg-green-deep hover:text-white"
        >
          ›
        </button>
      </div>

      {loadError && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">
          <span>{loadError}</span>
          <button type="button" onClick={fetchAppointments} className="font-semibold underline">Try again</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="p-4 sm:p-6" style={{ minWidth: '760px' }}>
          <div
            className="overflow-hidden rounded-t-xl border border-b-0 border-gray-200 bg-gray-50"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
          >
            {weekdays.map((weekday) => (
              <div key={weekday} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                {weekday}
              </div>
            ))}
          </div>
          <div
            className="overflow-hidden rounded-b-xl border-l border-t border-gray-200 bg-gray-200"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
          >
            {days.map((day) => {
              const key = dateKey(day)
              const dayAppointments = appointmentsByDate[key] || []
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()
              const isToday = key === todayKey

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  aria-label={`${dayFormatter.format(day)}, ${dayAppointments.length} appointment${dayAppointments.length === 1 ? '' : 's'}`}
                  className={`group relative min-h-32 border-b border-r border-gray-200 p-3 text-left transition-colors hover:z-10 hover:bg-green-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-mid ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50/90'
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? 'bg-green-deep text-white'
                      : isCurrentMonth
                        ? 'text-gray-800 group-hover:text-green-deep'
                        : 'text-gray-400'
                  }`}>
                    {day.getDate()}
                  </span>
                  {dayAppointments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {dayAppointments.slice(0, 2).map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`truncate rounded-md border px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}
                        >
                          {formatTime(appointment.preferred_time)} · {appointment.first_name} {appointment.last_name}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <p className="px-1 text-xs font-semibold text-green-deep">+{dayAppointments.length - 2} more</p>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <section className="border-t border-gray-100 px-5 py-6 sm:px-7" aria-labelledby="upcoming-appointments-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-mid">Next on the schedule</p>
            <h3 id="upcoming-appointments-title" className="font-dm-sans text-xl font-bold text-green-deep">
              Upcoming Appointments
            </h3>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-deep">
            {upcomingAppointments.length} upcoming
          </span>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <p className="font-dm-sans font-semibold text-gray-700">No upcoming appointments</p>
            <p className="mt-1 text-sm text-gray-500">New active bookings will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {upcomingAppointments.map((appointment) => {
              const appointmentKey = appointmentDateKey(appointment.preferred_date)
              return (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => openSearchResult(appointment)}
                  className="grid w-full gap-3 bg-white px-4 py-4 text-left transition hover:bg-green-50 focus:bg-green-50 focus:outline-none sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center sm:px-5"
                >
                  <span>
                    <span className="block text-sm font-bold text-green-deep">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${appointmentKey}T12:00:00`))}
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-500">{formatTime(appointment.preferred_time)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-dm-sans font-semibold text-gray-900">
                      {appointment.first_name} {appointment.last_name}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-gray-500">
                      {appointment.consultation_type === 'telemedicine' ? 'Telemedicine' : 'Home visit'} · {appointment.phone}
                    </span>
                  </span>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[appointment.status]}`}>
                    {appointment.status}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-4">
        {[
          ['Total appointments', appointments.length, 'text-green-deep'],
          ['Today', appointmentsByDate[todayKey]?.length || 0, 'text-green-mid'],
          ['Pending', appointments.filter((item) => item.status === 'pending').length, 'text-amber-600'],
          ['Paid', appointments.filter((item) => item.payment_status === 'paid').length, 'text-blue-600'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="bg-white px-4 py-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs font-medium text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedDate(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-dialog-title"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-5 sm:px-7">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-mid">Daily schedule</p>
                <h3 id="appointment-dialog-title" className="font-dm-sans text-xl font-bold text-green-deep sm:text-2xl">
                  {dayFormatter.format(new Date(`${selectedDate}T12:00:00`))}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedAppointments.length} appointment{selectedAppointments.length === 1 ? '' : 's'} booked
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                aria-label="Close appointment details"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200"
              >
                <XIcon size={19} weight="bold" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-7">
              {selectedAppointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                  <CalendarXIcon size={42} weight="duotone" className="mx-auto mb-3 text-green-mid" />
                  <p className="font-dm-sans text-lg font-semibold text-gray-700">No appointments on this day</p>
                  <p className="mt-1 text-sm text-gray-500">Choose another date to view its schedule.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedAppointments.map((appointment) => (
                    <article key={appointment.id} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-dm-sans text-lg font-bold text-gray-900">
                              {appointment.first_name} {appointment.last_name}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[appointment.status]}`}>
                              {appointment.status}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            <span className="font-semibold text-green-deep">{formatTime(appointment.preferred_time)}</span>
                            <span>{appointment.consultation_type === 'telemedicine' ? 'Telemedicine' : 'Home visit'}</span>
                            <span>45 mins</span>
                            <span className={appointment.payment_status === 'paid' ? 'font-medium text-green-600' : 'font-medium text-amber-600'}>
                              Payment: {appointment.payment_status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <select
                            aria-label={`Status for ${appointment.first_name} ${appointment.last_name}`}
                            value={appointment.status}
                            disabled={updatingId === appointment.id}
                            onChange={(event) => updateStatus(appointment.id, event.target.value as AppointmentStatus)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDelete(appointment)}
                            disabled={deletingId === appointment.id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === appointment.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <dl className="mt-4 grid gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</dt><dd className="mt-1 text-gray-700">{appointment.phone || 'Not provided'}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</dt><dd className="mt-1 break-all text-gray-700">{appointment.email || 'Not provided'}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Address</dt><dd className="mt-1 text-gray-700">{appointment.home_address || 'Not provided'}</dd></div>
                        {appointment.symptoms && (
                          <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Symptoms / concerns</dt><dd className="mt-1 rounded-lg bg-gray-50 p-3 text-gray-700">{appointment.symptoms}</dd></div>
                        )}
                      </dl>
                      <p className="mt-3 text-xs text-gray-400">Booked {new Date(appointment.created_at).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
