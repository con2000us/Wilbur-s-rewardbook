import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const updateData: any = {
      name: body.name,
      icon: body.icon,
      color: body.color,
      order_index: body.order_index,
    }

    // 如果有 grade_mapping，加入更新資料
    if (body.grade_mapping !== undefined) {
      updateData.grade_mapping = body.grade_mapping
    }

    const { data, error } = await supabase
      .from('subjects')
      // @ts-ignore - Supabase type inference issue with update operations
      .update(updateData)
      .eq('id', body.subject_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subject:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message },
      { status: 500 }
    )
  }
}

