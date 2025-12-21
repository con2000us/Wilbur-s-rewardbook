import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 刪除科目（級聯刪除會自動刪除評量和相關數據）
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', body.subject_id)

    if (error) {
      console.error('Error deleting subject:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message },
      { status: 500 }
    )
  }
}

