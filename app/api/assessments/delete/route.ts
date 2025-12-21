import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 驗證評量是否存在且屬於該學生
    const { data: assessment } = await supabase
      .from('assessments')
      .select(`
        *,
        subjects (
          student_id
        )
      `)
      .eq('id', body.assessment_id)
      .single()

    if (!assessment) {
      return NextResponse.json({ error: '評量不存在' }, { status: 404 })
    }

    // @ts-ignore - Supabase type inference issue with join queries
    if (assessment.subjects?.student_id !== body.student_id) {
      return NextResponse.json({ error: '無權刪除此評量' }, { status: 403 })
    }

    // 刪除相關交易記錄
    await supabase
      .from('transactions')
      .delete()
      .eq('assessment_id', body.assessment_id)

    // 刪除評量
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', body.assessment_id)

    if (error) {
      console.error('Error deleting assessment:', error)
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

