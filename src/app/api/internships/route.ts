import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function datesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 <= end2 && end1 >= start2
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('internships')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('Error fetching internships:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      start_date,
      end_date,
      rent,
      food,
      fun,
      gym,
      transport,
      gross_salary,
      net_salary,
      support_papa,
      support_mama,
    } = body

    if (!name || !start_date || !end_date) {
      return NextResponse.json({ error: 'name, start_date, end_date are required' }, { status: 400 })
    }

    if (start_date > end_date) {
      return NextResponse.json({ error: 'start_date must be before end_date' }, { status: 400 })
    }

    // Check for overlaps
    const { data: existing, error: fetchError } = await supabase
      .from('internships')
      .select('id, name, start_date, end_date')

    if (fetchError) throw fetchError

    for (const intern of existing ?? []) {
      if (datesOverlap(start_date, end_date, intern.start_date, intern.end_date)) {
        return NextResponse.json(
          { error: 'Internship dates overlap with an existing internship.' },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from('internships')
      .insert({
        name,
        start_date,
        end_date,
        rent: Number(rent) || 0,
        food: Number(food) || 0,
        fun: Number(fun) || 0,
        gym: Number(gym) || 0,
        transport: Number(transport) || 0,
        gross_salary: Number(gross_salary) || 0,
        net_salary: Number(net_salary) || 0,
        support_papa: Number(support_papa) || 0,
        support_mama: Number(support_mama) || 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Error creating internship:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
