import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type ReorderPayload = {
  assessmentTypeOrders?: Array<{ id: string; display_order: number }>
  typeOrders?: Array<{ id: string; display_order: number }>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReorderPayload
    const supabase = createClient()
    const updates = body.assessmentTypeOrders || body.typeOrders || []

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'assessmentTypeOrders is required' }, { status: 400 })
    }

    const results = await Promise.all(
      updates.map((item) =>
        supabase
          .from('assessment_types')
          .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      )
    )

    const failed = results.find((result) => result.error)
    if (failed?.error) {
      return NextResponse.json({ success: false, error: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
