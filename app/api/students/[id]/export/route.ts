import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 匯出單個學生的所有相關記錄
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  try {
    // 獲取學生資料
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found', details: studentError?.message },
        { status: 404 }
      )
    }

    // 獲取該學生的所有科目
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('student_id', id)
      .order('order_index')

    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError)
    }

    // 獲取該學生的所有評量（通過科目關聯）
    // @ts-ignore - Supabase type inference issue with select queries
    const subjectIds = subjects?.map((s: any) => s.id) || []
    const { data: assessments, error: assessmentsError } = subjectIds.length > 0
      ? await supabase
          .from('assessments')
          .select('*')
          .in('subject_id', subjectIds)
          .order('due_date', { ascending: false })
      : { data: [], error: null }

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError)
    }

    // 獲取該學生的所有交易記錄
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('student_id', id)
      .order('transaction_date', { ascending: false })

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
    }

    // 獲取該學生的所有獎勵規則（包括專屬規則和通用規則）
    const { data: rewardRules, error: rewardRulesError } = await supabase
      .from('reward_rules')
      .select('*')
      .or(`student_id.eq.${id},student_id.is.null`)
      .order('priority', { ascending: false })

    if (rewardRulesError) {
      console.error('Error fetching reward rules:', rewardRulesError)
    }

    // 建立學生個人備份物件
    const studentBackup = {
      version: '1.0',
      type: 'student_export',
      exported_at: new Date().toISOString(),
      student_id: id,
      // @ts-ignore - Supabase type inference issue with select queries
      student_name: student.name,
      
      // 學生相關資料
      data: {
        student: student,
        subjects: subjects || [],
        assessments: assessments || [],
        transactions: transactions || [],
        reward_rules: rewardRules || []
      },
      
      // 統計資訊
      metadata: {
        subjects_count: subjects?.length || 0,
        assessments_count: assessments?.length || 0,
        transactions_count: transactions?.length || 0,
        reward_rules_count: rewardRules?.length || 0
      }
    }

    // 回傳 JSON 檔案下載
    // @ts-ignore - Supabase type inference issue with select queries
    const filename = `student-${student.name}-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`
    
    return new NextResponse(JSON.stringify(studentBackup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
      }
    })
  } catch (error) {
    console.error('Student export error:', error)
    return NextResponse.json(
      { error: 'Failed to export student data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

