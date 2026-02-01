import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  try {
    // 先嘗試按 display_order 排序（如果欄位存在）
    let { data: types, error } = await supabase
      .from('custom_reward_types')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
    
    // 如果錯誤是因為 display_order 欄位不存在，則回退到只按 created_at 排序
    if (error && (error.message?.includes('display_order') || error.message?.includes('column') || error.code === '42703')) {
      console.log('display_order column not found, falling back to created_at sorting')
      const result = await supabase
        .from('custom_reward_types')
        .select('*')
        .order('created_at', { ascending: false })
      
      types = result.data
      error = result.error
    }
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message || 'Failed to fetch custom reward types'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      types: types || []
    })
  } catch (error) {
    console.error('Failed to fetch custom reward types:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch custom reward types: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
