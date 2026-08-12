import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createBookingAppointment } from '@/lib/microsoftBookings'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// POST - (Re)create the Teams meeting for an appointment. Used from the admin CRM when
// auto-creation failed at booking time, or for appointments booked before this existed.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    const { id } = await params

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (appointment.consultation_type !== 'telemedicine') {
      return NextResponse.json(
        { error: 'Teams meetings are only created for telemedicine appointments' },
        { status: 400 }
      )
    }

    const meeting = await createBookingAppointment({
      firstName: appointment.first_name,
      lastName: appointment.last_name,
      email: appointment.email,
      phone: appointment.phone,
      preferredDate: appointment.preferred_date,
      preferredTime: appointment.preferred_time,
    })

    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({
        teams_meeting_url: meeting.onlineMeetingUrl,
        ms_booking_appointment_id: meeting.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ appointment: updated })
  } catch (error: any) {
    console.error('Error creating Teams meeting:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Teams meeting' },
      { status: 500 }
    )
  }
}
