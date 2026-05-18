import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()

  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, avatar_url, display_order')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, students: students || [] })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch students: ' + (err as Error).message,
    }, { status: 500 })
  }
}
