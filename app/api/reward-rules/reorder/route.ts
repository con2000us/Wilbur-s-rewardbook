import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { ruleOrders } = await req.json()

  if (!ruleOrders || !Array.isArray(ruleOrders)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const updates = ruleOrders.map(order => ({
      id: order.id,
      display_order: order.display_order
    }))

    // 批量更新 display_order
    for (const update of updates) {
      const { error } = await supabase
        .from('reward_rules')
        // @ts-ignore - Supabase type inference issue with update operations
        .update({ display_order: update.display_order })
        .eq('id', update.id)

      if (error) {
        console.error('Error updating rule order:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Rules reordered successfully' })
  } catch (error) {
    console.error('Unexpected error during reordering:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

