import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 確保 avatar_color 是有效的字符串（現在接受 hex 顏色值）
    const avatarColor = body.avatar_color || '#3b82f6'
    
    // 驗證顏色格式（應該是 hex 顏色值，如 #3b82f6）
    // 也支援舊的 Tailwind 類名格式（向後兼容）
    let colorToSave = avatarColor
    if (!avatarColor.startsWith('#') && (!avatarColor.includes('from-') || !avatarColor.includes('to-'))) {
      console.warn('Invalid color format, using default:', avatarColor)
      colorToSave = '#3b82f6' // 預設藍色
    }
    
    // 將 emoji 和顏色組合成一個字符串
    const avatarUrl = `emoji:${body.avatar_emoji}|${colorToSave}`
    
    console.log('Updating student avatar:', {
      student_id: body.student_id,
      avatar_emoji: body.avatar_emoji,
      avatar_color: avatarColor,
      avatar_url: avatarUrl,
      received_body: body
    })

    const { data, error } = await supabase
      .from('students')
      // @ts-ignore - Supabase type inference issue with update operations
      .update({
        name: body.name,
        email: body.email || null,
        avatar_url: avatarUrl,
      })
      .eq('id', body.student_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating student:', error)
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

