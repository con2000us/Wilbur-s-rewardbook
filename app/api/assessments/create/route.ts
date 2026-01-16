import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateRewardFromRule } from '@/lib/rewardFormula'
import { gradeToScore, gradeToPercentage } from '@/lib/gradeConverter'

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
      // 只有在資料庫有這些欄位時才設定（向後兼容）
      // 如果 migration 尚未執行，這些欄位會導致錯誤
      // 我們先嘗試插入，如果失敗會返回錯誤訊息
      score_type: body.score_type || 'numeric',
      grade: body.grade || null,
    }
    
    // 如果使用等級制但資料庫可能沒有欄位，先檢查
    // 注意：這只是為了更好的錯誤訊息，實際檢查會在插入時進行

    // 獲取科目的等級對應設定
    let subjectGradeMapping = null
    if (body.subject_id) {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('grade_mapping')
        .eq('id', body.subject_id)
        .single()
      
      if (subjectData?.grade_mapping) {
        subjectGradeMapping = subjectData.grade_mapping
      }
    }

    // 計算實際用於獎金計算的分數和百分比
    let actualScore: number | null = null
    let actualPercentage: number | null = null

    if (assessmentData.score_type === 'letter') {
      // 等級制：必須有等級
      if (!body.grade) {
        return NextResponse.json({ error: '等級制評量必須選擇等級' }, { status: 400 })
      }
      actualScore = gradeToScore(body.grade, subjectGradeMapping)
      actualPercentage = gradeToPercentage(body.grade, assessmentData.max_score, subjectGradeMapping)
      // 等級制時，score 只作為內部計算用（用於獎金計算），顯示時應該使用 grade
      assessmentData.score = actualScore
      assessmentData.percentage = actualPercentage
      assessmentData.grade = body.grade
    } else if (assessmentData.score_type === 'numeric' && body.score !== null && body.score !== undefined) {
      actualScore = body.score
      actualPercentage = (body.score / assessmentData.max_score) * 100
      assessmentData.score = body.score
      assessmentData.percentage = actualPercentage
      assessmentData.grade = null
    }

    // 如果有分數或等級，標記為完成
    if (actualScore !== null && actualPercentage !== null) {
      assessmentData.status = 'completed'
      assessmentData.completed_date = new Date().toISOString()

      // 從數據庫獲取獎金規則並計算獎金
      // 規則優先級：科目+學生 > 科目全局 > 學生全局 > 全局
      
      let { data: rules, error: rulesError } = await supabase
        .from('reward_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
      
      if (rulesError) {
        console.error('[ERROR] Failed to fetch reward_rules:', rulesError)
        return NextResponse.json({ error: '無法獲取獎金規則：' + rulesError.message }, { status: 500 })
      }
      
      // 驗證：確保查詢到的資料屬於正確的專案
      // 檢查是否有任何 rule 的 student_id 對應到當前專案的 students 表
      if (rules && rules.length > 0) {
        const studentIdsInRules = new Set(
          rules
            .map((r: any) => r.student_id)
            .filter((id: any) => id !== null && id !== undefined)
        )
        
        if (studentIdsInRules.size > 0) {
          const { data: validStudents } = await supabase
            .from('students')
            .select('id')
            .in('id', Array.from(studentIdsInRules))
          
          const validStudentIds = new Set(validStudents?.map((s: any) => s.id) || [])
          const invalidRules = Array.from(studentIdsInRules).filter(id => !validStudentIds.has(id))
          
          if (invalidRules.length > 0) {
            console.error('[WARNING] Found reward_rules with student_ids not in current project:', invalidRules)
            console.error('[WARNING] This may indicate connection to wrong Supabase project!')
            // 過濾掉無效的規則
            rules = rules.filter((r: any) => 
              !r.student_id || validStudentIds.has(r.student_id)
            )
          }
        }
      }
      
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
          // 檢查分數是否匹配（使用實際百分比）
          let scoreMatches = false
          if (actualPercentage !== null) {
            if (rule.condition === 'perfect_score') {
              scoreMatches = actualPercentage === 100
            } else if (rule.condition === 'score_equals') {
              scoreMatches = actualPercentage === rule.min_score
            } else if (rule.condition === 'score_range') {
              const min = rule.min_score !== null ? rule.min_score : 0
              const max = rule.max_score !== null ? rule.max_score : 100
              scoreMatches = actualPercentage >= min && actualPercentage <= max
            }
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
        assessmentData.reward_amount = Math.max(0, Math.round(Number(body.manual_reward)))
      } else if (matchedRule && actualScore !== null && actualPercentage !== null) {
        // 否則使用匹配的規則（支援公式）
        assessmentData.reward_amount = calculateRewardFromRule({
          ruleRewardAmount: matchedRule.reward_amount,
          ruleRewardFormula: (matchedRule as any).reward_formula,
          score: actualScore,
          percentage: actualPercentage,
          maxScore: Number(assessmentData.max_score ?? 100),
        })
      } else {
        // 如果查詢到了規則但沒有匹配，返回 0 獎金（不應使用硬編碼規則）
        // 硬編碼規則只在「完全沒有規則」的情況下使用
        if (rules && rules.length > 0) {
          // 有規則但沒有匹配，返回 0
          assessmentData.reward_amount = 0
        } else if (actualPercentage !== null) {
          // 完全沒有規則，使用預設的硬編碼規則
          if (actualPercentage >= 100) {
            assessmentData.reward_amount = 30 // 滿分
          } else if (actualPercentage >= 90) {
            assessmentData.reward_amount = 10 // 90+
          } else if (actualPercentage >= 80) {
            assessmentData.reward_amount = 5  // 80+
          } else {
            assessmentData.reward_amount = 0
          }
        } else {
          assessmentData.reward_amount = 0
        }
      }
    }

    // 插入評量
    let { data: assessment, error } = await supabase
      .from('assessments')
      .insert(assessmentData)
      .select()
      .single()

    // 如果錯誤是因為缺少 grade 或 score_type 欄位，移除這些欄位重試（向後兼容）
    if (error && error.code === 'PGRST204' && (error.message.includes('grade') || error.message.includes('score_type'))) {
      // 移除新欄位，只使用現有欄位
      // 注意：等級制評量會失去等級資訊，只保留轉換後的分數
      const fallbackData = { ...assessmentData }
      delete fallbackData.grade
      delete fallbackData.score_type
      
      const retryResult = await supabase
        .from('assessments')
        .insert(fallbackData)
        .select()
        .single()
      
      assessment = retryResult.data
      error = retryResult.error
    }

    if (error) {
      console.error('Error creating assessment:', error)
      // 如果錯誤是因為缺少欄位，提供更清楚的錯誤訊息
      let errorMessage = error.message
      if (error.code === 'PGRST204' && error.message.includes('grade')) {
        errorMessage = "Could not find the 'grade' column of 'assessments' in the schema cache"
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    // 如果有獎金，創建交易記錄
    if (assessmentData.reward_amount > 0) {
      // @ts-ignore - Supabase type inference issue with insert operations
      await supabase.from('transactions').insert({
        student_id: body.student_id,
        // @ts-ignore - Supabase type inference issue with select queries
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

