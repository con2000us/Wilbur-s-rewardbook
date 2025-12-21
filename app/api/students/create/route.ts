import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 確保 avatar_color 是有效的字符串（現在接受 hex 顏色值）
    let avatarColor = body.avatar_color || '#3b82f6'
    
    // 驗證顏色格式（應該是 hex 顏色值，如 #3b82f6）
    // 也支援舊的 Tailwind 類名格式（向後兼容）
    let colorToSave = avatarColor
    if (!avatarColor.startsWith('#') && (!avatarColor.includes('from-') || !avatarColor.includes('to-'))) {
      console.warn('Invalid color format, using default:', avatarColor)
      colorToSave = '#3b82f6' // 預設藍色
    }
    
    // 將 emoji 和顏色組合成一個字符串
    const avatarUrl = `emoji:${body.avatar_emoji}|${colorToSave}`
    
    // 獲取當前最大的 display_order，新學生排在最後
    const { data: maxOrderData } = await supabase
      .from('students')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // @ts-ignore - Supabase type inference issue with select queries
    const nextDisplayOrder = (maxOrderData as any)?.display_order !== null && (maxOrderData as any)?.display_order !== undefined
      ? (maxOrderData as any).display_order + 1
      : 0

    const { data, error } = await supabase
      .from('students')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        name: body.name,
        email: body.email || null,
        avatar_url: avatarUrl,
        display_order: nextDisplayOrder,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating student:', error)
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

