import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    // 刪除所有交易記錄
    await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // 獲取所有科目 ID
    const { data: allSubjects } = await supabase
      .from('subjects')
      .select('id')

    if (allSubjects && allSubjects.length > 0) {
      // @ts-ignore - Supabase type inference issue
      const subjectIds = (allSubjects as any[]).map(s => s.id)

      // 刪除所有評量
      await supabase
        .from('assessments')
        .delete()
        .in('subject_id', subjectIds)

      // 刪除所有科目
      await supabase
        .from('subjects')
        .delete()
        .in('id', subjectIds)
    }

    // 刪除所有學生
    await supabase
      .from('students')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // 刪除所有獎勵規則（包括專屬和通用規則）
    await supabase
      .from('reward_rules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // 保留 site_settings（首頁設定）

    return NextResponse.json({ 
      success: true, 
      message: '已刪除所有學生資料（含科目、獎金、評量），首頁設定已保留' 
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message },
      { status: 500 }
    )
  }
}

