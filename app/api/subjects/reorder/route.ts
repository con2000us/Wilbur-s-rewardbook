import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { subjectOrders } = await req.json()

  if (!subjectOrders || !Array.isArray(subjectOrders)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    // 批量更新 order_index
    for (const order of subjectOrders) {
      const { error } = await supabase
        .from('subjects')
        .update({ order_index: order.order_index })
        .eq('id', order.id)

      if (error) {
        console.error('Error updating subject order:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Subjects reordered successfully' })
  } catch (error) {
    console.error('Unexpected error during reordering:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

