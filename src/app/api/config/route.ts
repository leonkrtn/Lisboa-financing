import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase.from('config').select('*')
    if (error) throw error

    const config: Record<string, string> = {}
    for (const row of data ?? []) {
      config[row.key] = row.value
    }

    return NextResponse.json(config)
  } catch (err) {
    console.error('Error fetching config:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Record<string, string> = await request.json()

    const rows = Object.entries(body).map(([key, value]) => ({ key, value }))

    if (rows.length === 0) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('config')
      .upsert(rows, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error updating config:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
