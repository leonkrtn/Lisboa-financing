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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    const updates: Record<string, string | number> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.start_date !== undefined) updates.start_date = body.start_date
    if (body.end_date !== undefined) updates.end_date = body.end_date
    if (body.rent !== undefined) updates.rent = Number(body.rent) || 0
    if (body.food !== undefined) updates.food = Number(body.food) || 0
    if (body.fun !== undefined) updates.fun = Number(body.fun) || 0
    if (body.gym !== undefined) updates.gym = Number(body.gym) || 0
    if (body.transport !== undefined) updates.transport = Number(body.transport) || 0
    if (body.gross_salary !== undefined) updates.gross_salary = Number(body.gross_salary) || 0
    if (body.net_salary !== undefined) updates.net_salary = Number(body.net_salary) || 0
    if (body.support_papa !== undefined) updates.support_papa = Number(body.support_papa) || 0
    if (body.support_mama !== undefined) updates.support_mama = Number(body.support_mama) || 0

    // If dates are changing, check for overlaps (excluding this internship)
    if (updates.start_date || updates.end_date) {
      // Fetch current row to get current dates
      const { data: current, error: currentErr } = await supabase
        .from('internships')
        .select('start_date, end_date')
        .eq('id', id)
        .single()
      if (currentErr) throw currentErr

      const newStart = (updates.start_date as string) || current.start_date
      const newEnd = (updates.end_date as string) || current.end_date

      if (newStart > newEnd) {
        return NextResponse.json({ error: 'start_date must be before end_date' }, { status: 400 })
      }

      const { data: others, error: othersErr } = await supabase
        .from('internships')
        .select('id, start_date, end_date')
        .neq('id', id)

      if (othersErr) throw othersErr

      for (const intern of others ?? []) {
        if (datesOverlap(newStart, newEnd, intern.start_date, intern.end_date)) {
          return NextResponse.json(
            { error: 'Internship dates overlap with an existing internship.' },
            { status: 409 }
          )
        }
      }
    }

    const { data, error } = await supabase
      .from('internships')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating internship:', err)
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
      .from('internships')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting internship:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
