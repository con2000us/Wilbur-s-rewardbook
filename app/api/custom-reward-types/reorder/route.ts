import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { rewardTypeOrders } = await req.json()

  if (!rewardTypeOrders || !Array.isArray(rewardTypeOrders)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    // 批量更新 display_order
    for (const order of rewardTypeOrders) {
      const { error } = await supabase
        .from('custom_reward_types')
        // @ts-ignore - Supabase type inference issue with update operations
        .update({ display_order: order.display_order })
        .eq('id', order.id)

      if (error) {
        console.error('Error updating reward type order:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Reward types reordered successfully' })
  } catch (error) {
    console.error('Unexpected error during reordering:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
