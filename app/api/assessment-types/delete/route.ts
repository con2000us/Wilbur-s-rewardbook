import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type DeletePayload = {
  id?: string
  type_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeletePayload
    const supabase = createClient()
    const id = body.id || body.type_id

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assessment_types')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
