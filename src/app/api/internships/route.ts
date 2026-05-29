import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase.from('internships').select('*').order('start_date')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body.name || !body.start_date || !body.end_date) {
    return NextResponse.json({ error: 'name, start_date, end_date are required' }, { status: 400 })
  }
  if (body.start_date > body.end_date) {
    return NextResponse.json({ error: 'start_date must be before end_date' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('internships')
    .insert({
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      income_mode: body.income_mode ?? 'manual',
      hours_per_week: Number(body.hours_per_week) || 0,
      salary_per_hour: Number(body.salary_per_hour) || 0,
      tax_rate: Number(body.tax_rate) || 0,
      manual_salary: Number(body.manual_salary) || 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
