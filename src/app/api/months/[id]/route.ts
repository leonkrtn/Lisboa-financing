import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    const updates: Record<string, string | number | boolean | null> = {}
    if (body.income_type_id !== undefined) updates.income_type_id = body.income_type_id ?? null
    if (body.manual_salary !== undefined) {
      updates.manual_salary = body.manual_salary !== null && body.manual_salary !== '' ? Number(body.manual_salary) : null
    }
    if (body.tuition_fee !== undefined) updates.tuition_fee = Number(body.tuition_fee) || 0
    if (body.annual_fee !== undefined) updates.annual_fee = Number(body.annual_fee) || 0
    if (body.adjustment !== undefined) updates.adjustment = Number(body.adjustment) || 0
    if (body.has_flight !== undefined) updates.has_flight = Boolean(body.has_flight)

    const { data, error } = await supabase
      .from('months')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating month:', err)
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
      .from('months')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting month:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
