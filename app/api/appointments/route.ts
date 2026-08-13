import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { writeRequestAdminActivity } from '@/lib/admin-activity'
import { checkRateLimit, cleanPublicString, isEmail } from '@/lib/request-security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseServiceKey: !!supabaseServiceKey
  })
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// GET - Fetch all appointments or filter by patient ID
export async function GET(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'requests')) return NextResponse.json({ error: 'Requests access required' }, { status: 403 })
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let query = supabase
      .from('appointments')
      .select('*')
      .order('preferred_date', { ascending: true })
      .order('preferred_time', { ascending: true })

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (dateFrom) {
      query = query.gte('preferred_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('preferred_date', dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ appointments: data || [] })
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

// POST - Create new appointment
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    const rateLimit = checkRateLimit(request, 'appointment-create', 8, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many appointment requests. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }

    const body = await request.json()
    const firstName = cleanPublicString(body.firstName, 100)
    const lastName = cleanPublicString(body.lastName, 100)
    const email = cleanPublicString(body.email, 180)?.toLowerCase()
    const phone = cleanPublicString(body.phone, 40)
    const consultationType = cleanPublicString(body.consultationType, 40)
    const preferredDate = cleanPublicString(body.preferredDate, 10)
    const preferredTime = cleanPublicString(body.preferredTime, 80)
    if (!firstName || !lastName || !email || !isEmail(email) || !phone || !preferredDate || !preferredTime) {
      return NextResponse.json({ error: 'Complete valid appointment details are required.' }, { status: 400 })
    }
    if (!['telemedicine', 'home-visit'].includes(consultationType || '')) {
      return NextResponse.json({ error: 'A valid consultation type is required.' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || Number.isNaN(Date.parse(`${preferredDate}T00:00:00Z`))) {
      return NextResponse.json({ error: 'A valid appointment date is required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        home_address: cleanPublicString(body.homeAddress, 500),
        consultation_type: consultationType,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        symptoms: cleanPublicString(body.symptoms, 3000),
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ appointment: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

// PATCH - Update appointment status
export async function PATCH(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'requests')) return NextResponse.json({ error: 'Requests access required' }, { status: 403 })
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.status !== undefined) {
      if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(body.status)) {
        return NextResponse.json({ error: 'A valid appointment status is required' }, { status: 400 })
      }
      updateData.status = body.status
    }
    if (body.payment_status !== undefined) {
      if (!['pending', 'paid', 'failed'].includes(body.payment_status)) {
        return NextResponse.json({ error: 'A valid payment status is required' }, { status: 400 })
      }
      updateData.payment_status = body.payment_status
    }
    if (body.patient_id !== undefined) updateData.patient_id = body.patient_id || null
    if (body.encounter_id !== undefined) updateData.encounter_id = body.encounter_id || null
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await writeRequestAdminActivity(supabase, request, {
      action: 'update_appointment',
      module: 'Requests',
      description: `Updated appointment for ${data.first_name || ''} ${data.last_name || ''}`.trim(),
      entityType: 'appointment',
      entityId: data.id,
      metadata: { status: data.status, payment_status: data.payment_status },
    })

    return NextResponse.json({ appointment: data })
  } catch (error: any) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

// DELETE - Delete appointment
export async function DELETE(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'requests')) return NextResponse.json({ error: 'Requests access required' }, { status: 403 })
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) throw error

    await writeRequestAdminActivity(supabase, request, {
      action: 'delete_appointment',
      module: 'Requests',
      description: 'Deleted an appointment request',
      entityType: 'appointment',
      entityId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}
