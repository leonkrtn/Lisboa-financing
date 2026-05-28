import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('income_types')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('Error fetching income types:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, hours_per_week, salary_per_hour, tax_rate } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('income_types')
      .insert({
        name,
        hours_per_week: Number(hours_per_week) || 0,
        salary_per_hour: Number(salary_per_hour) || 0,
        tax_rate: Number(tax_rate) || 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Error creating income type:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
