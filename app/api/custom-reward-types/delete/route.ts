import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function handleDelete(request: NextRequest) {
  const body = await request.json()
  const { type_id } = body
  
  const supabase = createClient()
  
  try {
    // 先检查是否为系统预设类型
    const { data: rewardType, error: fetchError } = await supabase
      .from('custom_reward_types')
      .select('is_system, type_key, display_name')
      .eq('id', type_id)
      .single()
    
    if (fetchError) {
      return NextResponse.json({ 
        success: false,
        error: '找不到该奖励类型'
      }, { status: 404 })
    }
    
    // 如果是系统预设类型，禁止删除
    if (rewardType?.is_system) {
      return NextResponse.json({ 
        success: false,
        error: `系统预设类型「${rewardType.display_name}」不可删除`
      }, { status: 403 })
    }
    
    // 删除非系统预设类型
    const { error: deleteError } = await supabase
      .from('custom_reward_types')
      .delete()
      .eq('id', type_id)
    
    if (deleteError) {
      throw deleteError
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete custom reward type:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete custom reward type'
    }, { status: 500 })
  }
}

// 支持 POST 和 DELETE 方法
export async function POST(request: NextRequest) {
  return handleDelete(request)
}

export async function DELETE(request: NextRequest) {
  return handleDelete(request)
}
