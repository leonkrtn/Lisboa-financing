import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateMonths } from '@/lib/calculations'
import type { Config, Month, IncomeType, Internship, BalanceItem } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [configRes, monthsRes, incomeTypesRes, internshipsRes, balanceRes] = await Promise.all([
      supabase.from('config').select('*'),
      supabase.from('months').select('*'),
      supabase.from('income_types').select('*'),
      supabase.from('internships').select('*'),
      supabase.from('balance_items').select('*'),
    ])

    if (configRes.error) throw configRes.error
    if (monthsRes.error) throw monthsRes.error
    if (incomeTypesRes.error) throw incomeTypesRes.error
    if (internshipsRes.error) throw internshipsRes.error
    if (balanceRes.error) throw balanceRes.error

    // Convert config rows to object
    const config: Config = {}
    for (const row of (configRes.data ?? [])) {
      config[row.key] = row.value
    }

    const result = calculateMonths(
      config,
      (monthsRes.data ?? []) as Month[],
      (internshipsRes.data ?? []) as Internship[],
      (incomeTypesRes.data ?? []) as IncomeType[],
      (balanceRes.data ?? []) as BalanceItem[]
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('Error calculating months:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
