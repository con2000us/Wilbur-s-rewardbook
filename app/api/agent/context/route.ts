import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  findMatchingRewardType,
  getTransactionAmount,
} from '@/lib/utils/rewardTransactions'

/**
 * GET /api/agent/context?student_id={uuid}
 *
 * 統合型前置資料端點：外部 AI Agent（Hermes）啟動評量操作前，
 * 只需一次 HTTP 呼叫就拿到所有參考資料。
 *
 * 回應格式：
 * - students:         所有學生
 * - subjects:         目標學生的科目
 * - reward_balances:  獎勵餘額（以 type_key 為 key）
 * - assessment_types: 所有啟用中的評量類型
 * - recent_assessments: 目標學生最近 10 筆評量
 * - subject_aliases:  科目別名對照（暫回空陣列）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' },
        { status: 400 },
      )
    }

    // ── 平行查詢六組資料 ──
    const [
      studentsResult,
      subjectsResult,
      transactionsResult,
      rewardTypesResult,
      assessmentTypesResult,
      recentAssessmentsResult,
    ] = await Promise.allSettled([
      // 1. 所有學生
      supabase
        .from('students')
        .select('id, name, avatar_url, display_order')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),

      // 2. 目標學生的科目
      supabase
        .from('subjects')
        .select('id, name, order_index')
        .eq('student_id', studentId)
        .order('order_index', { ascending: true }),

      // 3. 目標學生的交易記錄
      supabase
        .from('transactions')
        .select('*')
        .eq('student_id', studentId),

      // 4. 所有獎勵類型
      supabase
        .from('custom_reward_types')
        .select('id, type_key'),

      // 5. 所有啟用中的評量類型
      supabase
        .from('assessment_types')
        .select('id, type_key, display_name, icon, color, display_order, is_system')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),

      // 6. 目標學生最近評量（先取科目 ID，再查評量）
      supabase
        .from('subjects')
        .select('id')
        .eq('student_id', studentId),
    ])

    // ── 組裝 students ──
    const students =
      studentsResult.status === 'fulfilled' && !studentsResult.value.error
        ? (studentsResult.value.data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            avatar_url: s.avatar_url,
            display_order: s.display_order,
          }))
        : []

    // ── 組裝 subjects ──
    const subjects =
      subjectsResult.status === 'fulfilled' && !subjectsResult.value.error
        ? (subjectsResult.value.data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            display_order: s.order_index ?? 0,
          }))
        : []

    const subjectIds = subjects.map((s: any) => s.id)

    // ── 組裝 reward_balances ──
    const rewardTypes =
      rewardTypesResult.status === 'fulfilled' && !rewardTypesResult.value.error
        ? rewardTypesResult.value.data || []
        : []

    const transactions =
      transactionsResult.status === 'fulfilled' && !transactionsResult.value.error
        ? transactionsResult.value.data || []
        : []

    const balances: Record<string, number> = {}
    for (const rt of rewardTypes) {
      balances[rt.type_key] = 0
    }

    for (const txn of transactions) {
      const matchingType = findMatchingRewardType(txn, rewardTypes)
      if (!matchingType) continue

      const amount = getTransactionAmount(txn)
      balances[matchingType.type_key] = (balances[matchingType.type_key] || 0) + amount
    }

    // ── 組裝 assessment_types ──
    const assessmentTypes =
      assessmentTypesResult.status === 'fulfilled' && !assessmentTypesResult.value.error
        ? (assessmentTypesResult.value.data || []).map((at: any) => ({
            id: at.id,
            type_key: at.type_key,
            display_name: at.display_name,
            icon: at.icon,
            color: at.color,
            display_order: at.display_order,
            is_system: at.is_system,
          }))
        : []

    // ── 組裝 recent_assessments ──
    let recentAssessments: any[] = []
    if (subjectIds.length > 0) {
      const subjectNameMap = new Map(subjects.map((subj: any) => [subj.id, subj.name]))

      if (
        recentAssessmentsResult.status === 'fulfilled' &&
        !recentAssessmentsResult.value.error
      ) {
        // 用科目 ID 查最近 10 筆評量
        const { data: assessments } = await supabase
          .from('assessments')
          .select(
            'id, subject_id, title, assessment_type, score, max_score, percentage, scoring_mode, completed_date, image_urls, created_at',
          )
          .in('subject_id', subjectIds)
          .order('created_at', { ascending: false })
          .limit(10)

        recentAssessments = (assessments || []).map((a: any) => ({
          id: a.id,
          subject_id: a.subject_id,
          subject_name: subjectNameMap.get(a.subject_id) || null,
          title: a.title,
          assessment_type: a.assessment_type,
          score: a.score,
          max_score: a.max_score,
          percentage: a.percentage,
          scoring_mode: a.scoring_mode,
          completed_date: a.completed_date,
          image_urls: a.image_urls,
          created_at: a.created_at,
        }))
      }
    }

    return NextResponse.json({
      success: true,
      students,
      subjects,
      reward_balances: balances,
      assessment_types: assessmentTypes,
      recent_assessments: recentAssessments,
      subject_aliases: [],
    })
  } catch (error) {
    console.error('Agent context error:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to build agent context: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 },
    )
  }
}
