'use client'

import { useState, useEffect } from 'react'

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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  created_at: string
  updated_at: string
}

export default function AppointmentCalendar() {
  const [appointments, setAppointments] = useState<WebsiteAppointment[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)

  const fetchAppointments = async () => {
    setAppointmentsLoading(true)
    try {
      const response = await fetch('/api/appointments')
      if (!response.ok) throw new Error('Failed to fetch appointments')
      const { appointments: data } = await response.json()
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setAppointmentsLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-dm-sans font-bold text-green-deep">
            Schedule & Appointments
          </h2>
          <p className="text-text-mid mt-1">
            Manage and view all patient appointments from website bookings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAppointments}
            disabled={appointmentsLoading}
            className="px-4 py-2 bg-green-deep text-white rounded-lg font-dm-sans hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {appointmentsLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button className="px-4 py-2 border border-green-deep/20 rounded-lg font-dm-sans hover:bg-gray-50 transition-colors">
            Export Calendar
          </button>
        </div>
      </div>

      {appointmentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-deep"></div>
          <span className="ml-3 text-gray-600">Loading appointments...</span>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-dm-sans font-semibold text-gray-700 mb-2">No appointments yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            When patients book appointments through the website, they will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(
            appointments.reduce((groups, appointment) => {
              const date = new Date(appointment.preferred_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
              if (!groups[date]) groups[date] = []
              groups[date].push(appointment)
              return groups
            }, {} as Record<string, WebsiteAppointment[]>)
          ).map(([date, dateAppointments]) => (
            <div key={date}>
              <h3 className="font-dm-sans font-semibold text-green-deep mb-3">{date}</h3>
              <div className="space-y-2">
                {dateAppointments.map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            appointment.consultation_type === 'telemedicine'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gold text-green-deep'
                          }`}>
                            {appointment.consultation_type === 'telemedicine' ? 'Telemedicine' : 'Home Visit'}
                          </span>
                          <span className="font-dm-sans font-semibold text-gray-900">
                            {appointment.first_name} {appointment.last_name}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Time:</span>
                            <span className="ml-2 font-medium">{appointment.preferred_time}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-2 font-medium">45 mins</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Phone:</span>
                            <span className="ml-2 font-medium">{appointment.phone}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment:</span>
                            <span className={`ml-2 font-medium ${
                              appointment.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {appointment.payment_status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="text-gray-500">Email:</span> {appointment.email}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="text-gray-500">Address:</span> {appointment.home_address}
                        </div>
                        {appointment.symptoms && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <span className="text-gray-500">Symptoms/Concerns:</span> {appointment.symptoms}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-400">
                          Booked on {new Date(appointment.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={appointment.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            try {
                              const response = await fetch('/api/appointments', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: appointment.id, status: newStatus })
                              })
                              if (response.ok) fetchAppointments()
                            } catch (error) {
                              console.error('Error updating appointment:', error)
                            }
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-deep">{appointments.length}</div>
            <div className="text-sm text-gray-500">Total Appointments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-mid">
              {appointments.filter(a => {
                const today = new Date().toISOString().split('T')[0]
                return a.preferred_date === today
              }).length}
            </div>
            <div className="text-sm text-gray-500">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gold">
              {appointments.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {appointments.filter(a => a.payment_status === 'paid').length}
            </div>
            <div className="text-sm text-gray-500">Paid</div>
          </div>
        </div>
      </div>
    </div>
  )
}
