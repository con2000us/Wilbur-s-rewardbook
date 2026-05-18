import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body = await request.json()
    const { orderedIds } = body

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ success: false, error: 'orderedIds array is required' }, { status: 400 })
    }

    // 逐筆更新 display_order
    const updates = orderedIds.map((id: string, index: number) =>
      supabase
        .from('goal_templates')
        .update({ display_order: index + 1, updated_at: new Date().toISOString() })
        .eq('id', id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to reorder goal templates: ' + (err as Error).message
    }, { status: 500 })
  }
}
