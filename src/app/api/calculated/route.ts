import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateMonths, calculateNetCapital } from '@/lib/calculations'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [configRes, monthDataRes, internshipsRes, incomeTypesRes, expCatsRes, intOverridesRes, capitalRes, monthExpRes] =
    await Promise.all([
      supabase.from('config').select('*'),
      supabase.from('month_data').select('*'),
      supabase.from('internships').select('*').order('start_date'),
      supabase.from('income_types').select('*').order('name'),
      supabase.from('expense_categories').select('*'),
      supabase.from('internship_expense_overrides').select('*'),
      supabase.from('capital_items').select('*'),
      supabase.from('month_expense_overrides').select('*'),
    ])

  if (configRes.error) return NextResponse.json({ error: configRes.error.message }, { status: 500 })

  const config: Record<string, string> = {}
  for (const row of configRes.data ?? []) config[row.key] = row.value

  const capitalItems = capitalRes.data ?? []
  const expenseCategories = expCatsRes.data ?? []

  const months = calculateMonths(
    config,
    monthDataRes.data ?? [],
    internshipsRes.data ?? [],
    incomeTypesRes.data ?? [],
    expenseCategories,
    intOverridesRes.data ?? [],
    capitalItems,
    (monthExpRes.error ? [] : (monthExpRes.data ?? []))
  )

  return NextResponse.json({
    months,
    expense_categories: expenseCategories,
    net_capital: calculateNetCapital(capitalItems),
    default_income_type_id: config.default_income_type_id ?? null,
  })
}
