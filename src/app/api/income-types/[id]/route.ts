import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    const updates: Record<string, string | number> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.hours_per_week !== undefined) updates.hours_per_week = Number(body.hours_per_week)
    if (body.salary_per_hour !== undefined) updates.salary_per_hour = Number(body.salary_per_hour)
    if (body.tax_rate !== undefined) updates.tax_rate = Number(body.tax_rate)

    const { data, error } = await supabase
      .from('income_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating income type:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { error } = await supabase
      .from('income_types')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting income type:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
