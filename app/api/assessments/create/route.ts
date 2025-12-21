import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 準備評量數據
    const assessmentData: any = {
      subject_id: body.subject_id,
      title: body.title,
      assessment_type: body.assessment_type,
      max_score: body.max_score || 100,
      status: body.status || 'upcoming',
      due_date: body.due_date || null,
    }

    // 如果有分數，添加分數和完成日期
    if (body.score !== null && body.score !== undefined) {
      assessmentData.score = body.score
      assessmentData.percentage = (body.score / assessmentData.max_score) * 100
      assessmentData.status = 'completed'
      assessmentData.completed_date = new Date().toISOString()

      // 從數據庫獲取獎金規則並計算獎金
      // 規則優先級：科目+學生 > 科目全局 > 學生全局 > 全局
      const { data: rules } = await supabase
        .from('reward_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })

      // 過濾和排序規則
      let matchedRule = null
      if (rules && rules.length > 0) {
        // 先過濾評量類型匹配的規則
        const typeFilteredRules = rules.filter(r => !r.assessment_type || r.assessment_type === body.assessment_type)
        
        // 按優先級分組
        const subjectStudentRules = typeFilteredRules.filter(r => r.subject_id === body.subject_id && r.student_id === body.student_id)
        const subjectGlobalRules = typeFilteredRules.filter(r => r.subject_id === body.subject_id && !r.student_id)
        const studentGlobalRules = typeFilteredRules.filter(r => !r.subject_id && r.student_id === body.student_id)
        const globalRules = typeFilteredRules.filter(r => !r.subject_id && !r.student_id)

        // 排序函數：按 display_order（如果存在），否則按 priority（升序）
        const sortRules = (ruleList: typeof typeFilteredRules) => {
          return [...ruleList].sort((a, b) => {
            const orderA = (a as any).display_order ?? a.priority ?? 0
            const orderB = (b as any).display_order ?? b.priority ?? 0
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
            scoreMatches = assessmentData.percentage === 100
          } else if (rule.condition === 'score_equals') {
            scoreMatches = assessmentData.percentage === rule.min_score
          } else if (rule.condition === 'score_range') {
            const min = rule.min_score !== null ? rule.min_score : 0
            const max = rule.max_score !== null ? rule.max_score : 100
            scoreMatches = assessmentData.percentage >= min && assessmentData.percentage <= max
          }
          
          if (scoreMatches) {
            matchedRule = rule
            break // 找到第一個匹配的規則
          }
        }
      }

      // 設置獎金金額
      // 如果用戶手動指定了獎金，使用手動值
      if (body.manual_reward !== null && body.manual_reward !== undefined) {
        assessmentData.reward_amount = body.manual_reward
      } else if (matchedRule) {
        // 否則使用匹配的規則
        assessmentData.reward_amount = matchedRule.reward_amount
      } else {
        // 如果沒有匹配的規則，使用預設的硬編碼規則
        if (assessmentData.percentage >= 100) {
          assessmentData.reward_amount = 30 // 滿分
        } else if (assessmentData.percentage >= 90) {
          assessmentData.reward_amount = 10 // 90+
        } else if (assessmentData.percentage >= 80) {
          assessmentData.reward_amount = 5  // 80+
        } else {
          assessmentData.reward_amount = 0
        }
      }
    }

    // 插入評量
    const { data: assessment, error } = await supabase
      .from('assessments')
      .insert(assessmentData)
      .select()
      .single()

    if (error) {
      console.error('Error creating assessment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 如果有獎金，創建交易記錄
    if (assessmentData.reward_amount > 0) {
      await supabase.from('transactions').insert({
        student_id: body.student_id,
        assessment_id: assessment.id,
        transaction_type: 'earn',
        amount: assessmentData.reward_amount,
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

