import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const internshipId = searchParams.get('internship_id')

  let query = supabase.from('internship_expense_overrides').select('*')
  if (internshipId) query = query.eq('internship_id', internshipId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { data, error } = await supabase
    .from('internship_expense_overrides')
    .upsert(
      {
        internship_id: body.internship_id,
        expense_category_id: body.expense_category_id,
        amount: body.amount ?? 0,
      },
      { onConflict: 'internship_id,expense_category_id' }
    )
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
