import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      month_date,
      income_type_id,
      manual_salary,
      tuition_fee,
      annual_fee,
      adjustment,
      has_flight,
    } = body

    if (!month_date) {
      return NextResponse.json({ error: 'month_date is required' }, { status: 400 })
    }

    const row = {
      month_date,
      income_type_id: income_type_id ?? null,
      manual_salary: manual_salary !== undefined && manual_salary !== '' ? Number(manual_salary) : null,
      tuition_fee: Number(tuition_fee) || 0,
      annual_fee: Number(annual_fee) || 0,
      adjustment: Number(adjustment) || 0,
      has_flight: Boolean(has_flight),
    }

    const { data, error } = await supabase
      .from('months')
      .upsert(row, { onConflict: 'month_date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error upserting month:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
