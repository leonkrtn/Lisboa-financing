import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    const updates: Record<string, string | number | null> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.amount !== undefined) updates.amount = Number(body.amount) || 0
    if (body.category !== undefined) {
      if (!['Cash', 'Receivables', 'Provision'].includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      updates.category = body.category
    }
    if (body.direction !== undefined) {
      if (!['+', '-'].includes(body.direction)) {
        return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
      }
      updates.direction = body.direction
    }
    if (body.internship_id !== undefined) updates.internship_id = body.internship_id ?? null

    const { data, error } = await supabase
      .from('balance_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating balance item:', err)
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
      .from('balance_items')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting balance item:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
