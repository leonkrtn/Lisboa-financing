import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase.from('expense_categories').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name: body.name,
      type: body.type,
      default_amount: body.default_amount ?? 0,
      once_month: body.once_month ?? null,
      yearly_month: body.yearly_month ?? null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
