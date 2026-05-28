import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('balance_items')
      .select('*')
      .order('category', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('Error fetching balance items:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, amount, category, direction, internship_id } = body

    if (!name || !category || !direction) {
      return NextResponse.json({ error: 'name, category, direction are required' }, { status: 400 })
    }

    if (!['Cash', 'Receivables', 'Provision'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!['+', '-'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('balance_items')
      .insert({
        name,
        amount: Number(amount) || 0,
        category,
        direction,
        internship_id: internship_id ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Error creating balance item:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
