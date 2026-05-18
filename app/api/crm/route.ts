import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const isMissingSpecifySourceColumnError = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return message.includes('specify_source') && message.includes('column')
}

// GET - Fetch all patients or single patient by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (id) {
      // Fetch single patient
      const { data, error } = await supabase
        .from('crm_patients')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
        }
        throw error
      }
      
      return NextResponse.json({ patient: data })
    }
    
    // Fetch all patients
    const { data, error } = await supabase
      .from('crm_patients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({ patients: data || [] })
  } catch (error: any) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

// POST - Create new patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Generate ID if not provided
    if (!body.id) {
      const { data: existing } = await supabase
        .from('crm_patients')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
      
      const lastNum = existing && existing.length > 0 
        ? parseInt(existing[0].id.replace('FX', '')) 
        : 0
      body.id = `FX${String(lastNum + 1).padStart(3, '0')}`
    }
    
    let { data, error } = await supabase
      .from('crm_patients')
      .insert([body])
      .select()
      .single()

    if (error && body.specify_source && isMissingSpecifySourceColumnError(error)) {
      const { specify_source, ...bodyWithoutSpecifySource } = body
      const retry = await supabase
        .from('crm_patients')
        .insert([bodyWithoutSpecifySource])
        .select()
        .single()

      data = retry.data
      error = retry.error
    }
    
    if (error) throw error
    
    return NextResponse.json({ patient: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating patient:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create patient' },
      { status: 500 }
    )
  }
}

// PATCH - Update patient
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('crm_patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ patient: data })
  } catch (error: any) {
    console.error('Error updating patient:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update patient' },
      { status: 500 }
    )
  }
}

// DELETE - Delete patient
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('crm_patients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting patient:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete patient' },
      { status: 500 }
    )
  }
}
