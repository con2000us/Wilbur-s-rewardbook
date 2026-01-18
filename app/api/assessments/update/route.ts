import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateRewardFromRule } from '@/lib/rewardFormula'
import { gradeToScore, gradeToPercentage } from '@/lib/gradeConverter'

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
      score_type: body.score_type || 'numeric',
      grade: body.grade || null,
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

    // 獲取科目的等級對應設定
    let subjectGradeMapping = null
    if (body.subject_id) {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('grade_mapping')
        .eq('id', body.subject_id)
        .single()

      // Type assertion to handle Supabase type inference
      const subjectDataTyped = subjectData as any
      if (subjectDataTyped?.grade_mapping) {
        subjectGradeMapping = subjectDataTyped.grade_mapping
      }
    }

    // 計算實際用於獎金計算的分數和百分比
    let actualScore: number | null = null
    let actualPercentage: number | null = null

    if (updateData.score_type === 'letter') {
      // 等級制：必須有等級
      if (!body.grade) {
        return NextResponse.json({ error: '等級制評量必須選擇等級' }, { status: 400 })
      }
      actualScore = gradeToScore(body.grade, subjectGradeMapping)
      actualPercentage = gradeToPercentage(body.grade, updateData.max_score, subjectGradeMapping)
      // 等級制時，score 只作為內部計算用（用於獎金計算），顯示時應該使用 grade
      updateData.score = actualScore
      updateData.percentage = actualPercentage
      updateData.grade = body.grade
    } else if (updateData.score_type === 'numeric') {
      // 數字制：清除等級，使用數字分數
      updateData.grade = null
    if (body.score !== null && body.score !== undefined) {
        actualScore = body.score
        actualPercentage = (body.score / updateData.max_score) * 100
      updateData.score = body.score
        updateData.percentage = actualPercentage
      } else {
        updateData.score = null
        updateData.percentage = null
      }
    }

    // 如果有分數或等級，計算獎金
    if (actualScore !== null && actualPercentage !== null) {
      updateData.status = 'completed'
      updateData.completed_date = new Date().toISOString()

      // 從數據庫獲取獎金規則並計算獎金
      
      // 調試：輸出實際使用的 Supabase URL（僅在開發環境）
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Updating assessment - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('[DEBUG] Assessment ID:', body.assessment_id, 'Student ID:', body.student_id, 'Subject ID:', body.subject_id)
      }
      
      let { data: rules, error: rulesError } = await supabase
        .from('reward_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
      
      if (rulesError) {
        console.error('[ERROR] Failed to fetch reward_rules:', rulesError)
        return NextResponse.json({ error: '無法獲取獎金規則：' + rulesError.message }, { status: 500 })
      }
      
      // 調試：輸出查詢到的規則數量
      if (process.env.NODE_ENV === 'development' && rules) {
        console.log('[DEBUG] Fetched reward_rules count:', rules.length)
        if (rules.length > 0) {
          // @ts-ignore - Supabase type inference issue
          console.log('[DEBUG] Sample rule student_id:', (rules[0] as any).student_id, 'subject_id:', (rules[0] as any).subject_id)
        }
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
            break
          }
        }
      }

      // 設置獎金
      // 如果用戶手動指定了獎金，使用手動值
      if (body.manual_reward !== null && body.manual_reward !== undefined) {
        updateData.reward_amount = Math.max(0, Math.round(Number(body.manual_reward)))
      } else if (matchedRule && actualScore !== null && actualPercentage !== null) {
        // 否則使用匹配的規則（支援公式）
        updateData.reward_amount = calculateRewardFromRule({
          ruleRewardAmount: matchedRule.reward_amount,
          ruleRewardFormula: (matchedRule as any).reward_formula,
          score: actualScore,
          percentage: actualPercentage,
          maxScore: Number(updateData.max_score ?? 100),
        })
      } else {
        // 如果查詢到了規則但沒有匹配，返回 0 獎金（不應使用硬編碼規則）
        // 硬編碼規則只在「完全沒有規則」的情況下使用
        if (rules && rules.length > 0) {
          // 有規則但沒有匹配，返回 0
          updateData.reward_amount = 0
        } else if (actualPercentage !== null) {
          // 完全沒有規則，使用預設的硬編碼規則
          if (actualPercentage >= 100) {
            updateData.reward_amount = 30
          } else if (actualPercentage >= 90) {
            updateData.reward_amount = 10
          } else if (actualPercentage >= 80) {
            updateData.reward_amount = 5
          } else {
            updateData.reward_amount = 0
          }
        } else {
          updateData.reward_amount = 0
        }
      }
    } else {
      // 沒有分數或等級，設為待完成
      updateData.score = null
      updateData.percentage = null
      updateData.grade = null
      updateData.status = 'upcoming'
      updateData.completed_date = null
      updateData.reward_amount = 0
    }

    // 更新評量
    let { data: assessment, error } = await supabase
      .from('assessments')
      // @ts-ignore - Supabase type inference issue with update operations
      .update(updateData)
      .eq('id', body.assessment_id)
      .select()
      .single()

    // 如果錯誤是因為缺少 grade 或 score_type 欄位，移除這些欄位重試（向後兼容）
    if (error && error.code === 'PGRST204' && (error.message.includes('grade') || error.message.includes('score_type'))) {
      // 移除新欄位，只使用現有欄位
      const fallbackData = { ...updateData }
      delete fallbackData.grade
      delete fallbackData.score_type
      
      const retryResult = await supabase
        .from('assessments')
        // @ts-ignore - Supabase type inference issue with update operations
        .update(fallbackData)
        .eq('id', body.assessment_id)
        .select()
        .single()
      
      assessment = retryResult.data
      error = retryResult.error
    }

    if (error) {
      console.error('Error updating assessment:', error)
      // 如果錯誤是因為缺少欄位，提供更清楚的錯誤訊息
      let errorMessage = error.message
      if (error.code === 'PGRST204' && error.message.includes('grade')) {
        errorMessage = "Could not find the 'grade' column of 'assessments' in the schema cache"
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 })
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

