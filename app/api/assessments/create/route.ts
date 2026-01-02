import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateRewardFromRule } from '@/lib/rewardFormula'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:7',message:'API called - creating assessment',data:{studentId:body.student_id,subjectId:body.subject_id,score:body.score,maxScore:body.max_score,assessmentType:body.assessment_type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const supabase = createClient()
    // #region agent log
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET';
    const supabaseKeyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0,20) + '...' : 'NOT_SET';
    fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:10',message:'Supabase client created',data:{supabaseUrl,supabaseKeyPrefix},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:25',message:'Score calculated',data:{score:assessmentData.score,maxScore:assessmentData.max_score,percentage:assessmentData.percentage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

      // 從數據庫獲取獎金規則並計算獎金
      // 規則優先級：科目+學生 > 科目全局 > 學生全局 > 全局
      
      // 調試：輸出實際使用的 Supabase URL（僅在開發環境）
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Creating assessment - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('[DEBUG] Student ID:', body.student_id, 'Subject ID:', body.subject_id)
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:40',message:'Reward rules fetched from DB',data:{rulesCount:rules?.length||0,allRules:rules?.map((r:any)=>({id:r.id,studentId:r.student_id,subjectId:r.subject_id,condition:r.condition,minScore:r.min_score,maxScore:r.max_score,rewardAmount:r.reward_amount,assessmentType:r.assessment_type}))||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
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
      // #region agent log
      const globalRulesCount = rules?.filter((r: any) => !r.student_id && !r.subject_id).length || 0;
      const rulesWithStudentId = rules?.filter((r: any) => r.student_id).length || 0;
      fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:58',message:'Rules breakdown before validation',data:{totalRules:rules?.length||0,globalRulesCount,rulesWithStudentId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:78',message:'Invalid rules detected',data:{invalidRules,validStudentIds:Array.from(validStudentIds)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            // 過濾掉無效的規則
            rules = rules.filter((r: any) => 
              !r.student_id || validStudentIds.has(r.student_id)
            )
          }
        }
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:85',message:'Rules after validation',data:{rulesCount:rules?.length||0,validatedRules:rules?.map((r:any)=>({id:r.id,studentId:r.student_id,subjectId:r.subject_id,condition:r.condition,minScore:r.min_score,maxScore:r.max_score,rewardAmount:r.reward_amount}))||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
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
            scoreMatches = assessmentData.percentage === 100
          } else if (rule.condition === 'score_equals') {
            scoreMatches = assessmentData.percentage === rule.min_score
          } else if (rule.condition === 'score_range') {
            const min = rule.min_score !== null ? rule.min_score : 0
            const max = rule.max_score !== null ? rule.max_score : 100
            scoreMatches = assessmentData.percentage >= min && assessmentData.percentage <= max
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:128',message:'Rule matching check',data:{ruleId:rule.id,studentId:rule.student_id,subjectId:rule.subject_id,condition:rule.condition,minScore:rule.min_score,maxScore:rule.max_score,percentage:assessmentData.percentage,scoreMatches},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          if (scoreMatches) {
            matchedRule = rule
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:131',message:'Rule matched',data:{ruleId:rule.id,rewardAmount:rule.reward_amount,rewardFormula:rule.reward_formula},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            break // 找到第一個匹配的規則
          }
        }
      }

      // 設置獎金金額
      // 如果用戶手動指定了獎金，使用手動值
      if (body.manual_reward !== null && body.manual_reward !== undefined) {
        assessmentData.reward_amount = Math.max(0, Math.round(Number(body.manual_reward)))
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:139',message:'Using manual reward',data:{manualReward:assessmentData.reward_amount},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } else if (matchedRule) {
        // 否則使用匹配的規則（支援公式）
        assessmentData.reward_amount = calculateRewardFromRule({
          ruleRewardAmount: matchedRule.reward_amount,
          ruleRewardFormula: (matchedRule as any).reward_formula,
          score: Number(assessmentData.score ?? 0),
          percentage: Number(assessmentData.percentage ?? 0),
          maxScore: Number(assessmentData.max_score ?? 100),
        })
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:147',message:'Reward calculated from matched rule',data:{rewardAmount:assessmentData.reward_amount,ruleId:matchedRule.id,ruleRewardAmount:matchedRule.reward_amount,ruleFormula:matchedRule.reward_formula},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } else {
        // 如果查詢到了規則但沒有匹配，返回 0 獎金（不應使用硬編碼規則）
        // 硬編碼規則只在「完全沒有規則」的情況下使用
        if (rules && rules.length > 0) {
          // 有規則但沒有匹配，返回 0
          assessmentData.reward_amount = 0
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:159',message:'No rule matched - returning 0 reward',data:{percentage:assessmentData.percentage,rulesCount:rules.length,rewardAmount:0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        } else {
          // 完全沒有規則，使用預設的硬編碼規則
          if (assessmentData.percentage >= 100) {
            assessmentData.reward_amount = 30 // 滿分
          } else if (assessmentData.percentage >= 90) {
            assessmentData.reward_amount = 10 // 90+
          } else if (assessmentData.percentage >= 80) {
            assessmentData.reward_amount = 5  // 80+
          } else {
            assessmentData.reward_amount = 0
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assessments/create/route.ts:171',message:'Using default hardcoded reward (no rules exist)',data:{percentage:assessmentData.percentage,rewardAmount:assessmentData.reward_amount},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
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

