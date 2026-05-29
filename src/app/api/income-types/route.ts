import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase.from('income_types').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const { data, error } = await supabase
    .from('income_types')
    .insert({
      name: body.name,
      type: body.type ?? 'hourly',
      hours_per_week: Number(body.hours_per_week) || 0,
      salary_per_hour: Number(body.salary_per_hour) || 0,
      tax_rate: Number(body.tax_rate) || 0,
      manual_amount: Number(body.manual_amount) || 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
