import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { type, dateMode, startDate, endDate } = body // 'assessments', 'transactions', 'subjects', 'all'
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

    // 日期範圍過濾函數
    const filterByDateRange = (query: any, dateField: string) => {
      if (dateMode === 'range' && startDate && endDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return query.gte(dateField, start.toISOString()).lte(dateField, end.toISOString())
      }
      return query
    }

    if (type === 'assessments') {
      // 刪除所有評量（通過科目關聯）
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('student_id', id)

      if (subjects && subjects.length > 0) {
        const subjectIds = subjects.map(s => s.id)
        
        // 構建評量查詢
        let assessmentQuery = supabase
          .from('assessments')
          .select('id, due_date, completed_date')
          .in('subject_id', subjectIds)

        // 如果有日期範圍，需要先獲取所有評量，然後在應用層過濾
        const { data: allAssessments } = await assessmentQuery

        let assessmentsToDelete = allAssessments || []
        
        // 如果有日期範圍，過濾評量
        if (dateMode === 'range' && startDate && endDate && allAssessments) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          
          assessmentsToDelete = allAssessments.filter((a: any) => {
            const assessmentDate = a.due_date || a.completed_date
            if (!assessmentDate) return false
            const date = new Date(assessmentDate)
            return date >= start && date <= end
          })
        }

        if (assessmentsToDelete.length > 0) {
          const assessmentIds = assessmentsToDelete.map((a: any) => a.id)
          
          // 刪除相關的交易記錄（評量相關的）
          await supabase
            .from('transactions')
            .delete()
            .in('assessment_id', assessmentIds)

          // 刪除評量
          const { error } = await supabase
            .from('assessments')
            .delete()
            .in('id', assessmentIds)

          if (error) {
            console.error('Error deleting assessments:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }
        }
      }

      const message = dateMode === 'range' 
        ? `已刪除 ${startDate} 至 ${endDate} 期間的評量`
        : '已刪除所有評量'
      return NextResponse.json({ success: true, message })
    }

    if (type === 'transactions') {
      // 刪除所有存摺收支（不包括評量相關的交易）
      let transactionQuery = supabase
        .from('transactions')
        .select('id, transaction_date')
        .eq('student_id', id)
        .is('assessment_id', null)

      // 應用日期範圍過濾
      if (dateMode === 'range' && startDate && endDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        transactionQuery = transactionQuery
          .gte('transaction_date', start.toISOString())
          .lte('transaction_date', end.toISOString())
      }

      const { data: transactions } = await transactionQuery

      if (transactions && transactions.length > 0) {
        const transactionIds = transactions.map((t: any) => t.id)
        const { error } = await supabase
          .from('transactions')
          .delete()
          .in('id', transactionIds)

        if (error) {
          console.error('Error deleting transactions:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      const message = dateMode === 'range'
        ? `已刪除 ${startDate} 至 ${endDate} 期間的存摺收支`
        : '已刪除所有存摺收支'
      return NextResponse.json({ success: true, message })
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
      if (dateMode === 'range' && startDate && endDate) {
        // 日期範圍模式：只刪除該日期範圍內的評量和交易
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        // 1. 刪除該日期範圍內的所有交易記錄
        await supabase
          .from('transactions')
          .delete()
          .eq('student_id', id)
          .gte('transaction_date', start.toISOString())
          .lte('transaction_date', end.toISOString())

        // 2. 獲取所有科目 ID
        const { data: subjects } = await supabase
          .from('subjects')
          .select('id')
          .eq('student_id', id)

        if (subjects && subjects.length > 0) {
          const subjectIds = subjects.map(s => s.id)

          // 3. 獲取該日期範圍內的評量
          const { data: allAssessments } = await supabase
            .from('assessments')
            .select('id, due_date, completed_date')
            .in('subject_id', subjectIds)

          if (allAssessments) {
            const assessmentsToDelete = allAssessments.filter((a: any) => {
              const assessmentDate = a.due_date || a.completed_date
              if (!assessmentDate) return false
              const date = new Date(assessmentDate)
              return date >= start && date <= end
            })

            if (assessmentsToDelete.length > 0) {
              const assessmentIds = assessmentsToDelete.map((a: any) => a.id)
              
              // 刪除相關的交易記錄
              await supabase
                .from('transactions')
                .delete()
                .in('assessment_id', assessmentIds)

              // 刪除評量
              await supabase
                .from('assessments')
                .delete()
                .in('id', assessmentIds)
            }
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: `已清空 ${startDate} 至 ${endDate} 期間的所有記錄` 
        })
      } else {
        // 全部模式：清空所有記錄（只保留學生設定）
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

