import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - 更新學生顯示順序
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { studentOrders } = body // [{ id: string, display_order: number }]
    
    if (!studentOrders || !Array.isArray(studentOrders)) {
      return NextResponse.json({ error: 'Invalid student orders' }, { status: 400 })
    }
    
    // 批量更新每個學生的 display_order
    const updatePromises = studentOrders.map(({ id, display_order }) =>
      supabase
        .from('students')
        .update({ display_order })
        .eq('id', id)
    )
    
    await Promise.all(updatePromises)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder students:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

