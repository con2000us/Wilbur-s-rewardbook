import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { type } = body // 'assessments', 'transactions', 'subjects', 'all'
    const supabase = createClient()

    // 驗證學生是否存在
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', id)
      .single()

    if (!student) {
      return NextResponse.json({ error: '學生不存在' }, { status: 404 })
    }

    if (type === 'assessments') {
      // 刪除所有評量（通過科目關聯）
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('student_id', id)

      if (subjects && subjects.length > 0) {
        const subjectIds = subjects.map(s => s.id)
        
        // 先獲取所有評量 ID
        const { data: assessments } = await supabase
          .from('assessments')
          .select('id')
          .in('subject_id', subjectIds)

        if (assessments && assessments.length > 0) {
          const assessmentIds = assessments.map(a => a.id)
          
          // 刪除相關的交易記錄（評量相關的）
          await supabase
            .from('transactions')
            .delete()
            .in('assessment_id', assessmentIds)
        }

        // 刪除評量
        const { error } = await supabase
          .from('assessments')
          .delete()
          .in('subject_id', subjectIds)

        if (error) {
          console.error('Error deleting assessments:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true, message: '已刪除所有評量' })
    }

    if (type === 'transactions') {
      // 刪除所有存摺收支（不包括評量相關的交易）
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('student_id', id)
        .is('assessment_id', null)

      if (error) {
        console.error('Error deleting transactions:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '已刪除所有存摺收支' })
    }

    if (type === 'subjects') {
      // 先獲取所有科目 ID
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('student_id', id)

      if (subjects && subjects.length > 0) {
        const subjectIds = subjects.map(s => s.id)

        // 先獲取所有評量 ID
        const { data: assessments } = await supabase
          .from('assessments')
          .select('id')
          .in('subject_id', subjectIds)

        if (assessments && assessments.length > 0) {
          const assessmentIds = assessments.map(a => a.id)
          
          // 刪除相關的交易記錄（評量相關的）
          await supabase
            .from('transactions')
            .delete()
            .in('assessment_id', assessmentIds)
        }

        // 刪除評量
        await supabase
          .from('assessments')
          .delete()
          .in('subject_id', subjectIds)

        // 刪除科目
        const { error } = await supabase
          .from('subjects')
          .delete()
          .in('id', subjectIds)

        if (error) {
          console.error('Error deleting subjects:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true, message: '已刪除所有科目' })
    }

    if (type === 'all') {
      // 清空所有記錄（只保留學生設定）
      // 1. 刪除所有交易記錄
      await supabase
        .from('transactions')
        .delete()
        .eq('student_id', id)

      // 2. 獲取所有科目 ID
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('student_id', id)

      if (subjects && subjects.length > 0) {
        const subjectIds = subjects.map(s => s.id)

        // 3. 刪除所有評量
        await supabase
          .from('assessments')
          .delete()
          .in('subject_id', subjectIds)

        // 4. 刪除所有科目
        await supabase
          .from('subjects')
          .delete()
          .in('id', subjectIds)
      }

      // 5. 刪除該學生的專屬獎勵規則
      await supabase
        .from('reward_rules')
        .delete()
        .eq('student_id', id)

      return NextResponse.json({ success: true, message: '已清空所有記錄' })
    }

    return NextResponse.json({ error: '無效的操作類型' }, { status: 400 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message },
      { status: 500 }
    )
  }
}

