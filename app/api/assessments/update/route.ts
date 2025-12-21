import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 準備更新數據
    const updateData: any = {
      subject_id: body.subject_id,
      title: body.title,
      assessment_type: body.assessment_type,
      max_score: body.max_score || 100,
      due_date: body.due_date || null,
    }

    // 獲取舊的評量數據（用於比較獎金變化）
    const { data: oldAssessment } = await supabase
      .from('assessments')
      .select('*, subjects(student_id)')
      .eq('id', body.assessment_id)
      .single()

    if (!oldAssessment) {
      return NextResponse.json({ error: '評量不存在' }, { status: 404 })
    }

    // 如果有分數，計算獎金
    if (body.score !== null && body.score !== undefined) {
      updateData.score = body.score
      updateData.percentage = (body.score / updateData.max_score) * 100
      updateData.status = 'completed'
      updateData.completed_date = new Date().toISOString()

      // 從數據庫獲取獎金規則並計算獎金
      const { data: rules } = await supabase
        .from('reward_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })

      // 過濾和排序規則
      let matchedRule = null
      if (rules && rules.length > 0) {
        // 先過濾評量類型匹配的規則
        // @ts-ignore - Supabase type inference issue with select queries
        const typeFilteredRules = rules.filter((r: any) => !r.assessment_type || r.assessment_type === body.assessment_type)
        
        // 按優先級分組
        const subjectStudentRules = typeFilteredRules.filter((r: any) => r.subject_id === body.subject_id && r.student_id === body.student_id)
        const subjectGlobalRules = typeFilteredRules.filter((r: any) => r.subject_id === body.subject_id && !r.student_id)
        const studentGlobalRules = typeFilteredRules.filter((r: any) => !r.subject_id && r.student_id === body.student_id)
        const globalRules = typeFilteredRules.filter((r: any) => !r.subject_id && !r.student_id)

        // 排序函數：按 display_order（如果存在），否則按 priority（升序）
        const sortRules = (ruleList: any[]) => {
          return [...ruleList].sort((a: any, b: any) => {
            const orderA = a.display_order ?? a.priority ?? 0
            const orderB = b.display_order ?? b.priority ?? 0
            return orderA - orderB
          })
        }

        // 按優先級順序合併並排序：專屬 > 科目 > 學生 > 全局
        const orderedRules = [
          ...sortRules(subjectStudentRules),
          ...sortRules(subjectGlobalRules),
          ...sortRules(studentGlobalRules),
          ...sortRules(globalRules)
        ]

        for (const rule of orderedRules) {
          // 檢查分數是否匹配
          let scoreMatches = false
          if (rule.condition === 'perfect_score') {
            scoreMatches = updateData.percentage === 100
          } else if (rule.condition === 'score_equals') {
            scoreMatches = updateData.percentage === rule.min_score
          } else if (rule.condition === 'score_range') {
            const min = rule.min_score !== null ? rule.min_score : 0
            const max = rule.max_score !== null ? rule.max_score : 100
            scoreMatches = updateData.percentage >= min && updateData.percentage <= max
          }
          
          if (scoreMatches) {
            matchedRule = rule
            break
          }
        }
      }

      // 設置獎金
      // 如果用戶手動指定了獎金，使用手動值
      if (body.manual_reward !== null && body.manual_reward !== undefined) {
        updateData.reward_amount = body.manual_reward
      } else if (matchedRule) {
        // 否則使用匹配的規則
        updateData.reward_amount = matchedRule.reward_amount
      } else {
        // 預設規則
        if (updateData.percentage >= 100) {
          updateData.reward_amount = 30
        } else if (updateData.percentage >= 90) {
          updateData.reward_amount = 10
        } else if (updateData.percentage >= 80) {
          updateData.reward_amount = 5
        } else {
          updateData.reward_amount = 0
        }
      }
    } else {
      // 沒有分數，設為待完成
      updateData.score = null
      updateData.percentage = null
      updateData.status = 'upcoming'
      updateData.completed_date = null
      updateData.reward_amount = 0
    }

    // 更新評量
    const { data: assessment, error } = await supabase
      .from('assessments')
      // @ts-ignore - Supabase type inference issue with update operations
      .update(updateData)
      .eq('id', body.assessment_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating assessment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 更新交易記錄
    // 刪除舊的交易記錄
    await supabase
      .from('transactions')
      .delete()
      .eq('assessment_id', body.assessment_id)

    // 如果有新獎金，創建新交易
    if (updateData.reward_amount > 0) {
      // @ts-ignore - Supabase type inference issue with insert operations
      await supabase.from('transactions').insert({
        student_id: body.student_id,
        // @ts-ignore - Supabase type inference issue with select queries
        assessment_id: assessment.id,
        transaction_type: 'earn',
        amount: updateData.reward_amount,
        description: `${body.title} - 獎金`,
        category: '測驗獎金',
        transaction_date: body.due_date || new Date().toISOString().split('T')[0]
      })
    }

    return NextResponse.json({ success: true, data: assessment })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message }, 
      { status: 500 }
    )
  }
}

