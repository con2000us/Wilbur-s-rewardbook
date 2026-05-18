import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body = await request.json()
    const { goalOrders } = body

    if (!goalOrders || !Array.isArray(goalOrders)) {
      return NextResponse.json({ success: false, error: 'goalOrders array is required' }, { status: 400 })
    }

    const updates = goalOrders.map((item: { id: string; display_order: number }) =>
      supabase
        .from('student_goals')
        .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to reorder student goals: ' + (err as Error).message
    }, { status: 500 })
  }
}
