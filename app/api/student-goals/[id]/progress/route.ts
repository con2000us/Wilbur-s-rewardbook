import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { filterTransactionsByTrackingStart } from '@/lib/utils/goalTracking'
import {
  getEarnedRewardAmount,
  transactionMatchesRewardType,
} from '@/lib/utils/rewardTransactions'

/**
 * GET /api/student-goals/[id]/progress
 * 回傳目標的即時進度
 * - 一般目標：扣除已被其他目標消耗的事件
 * - 里程碑目標（consume_on_complete=false）：計算所有歷史紀錄，不排除已消耗交易
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params

  try {
    // 取得目標資訊
    const { data: goal, error: goalError } = await supabase
      .from('student_goals')
      .select('*')
      .eq('id', id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 })
    }

    const isMilestone = goal.consume_on_complete === false
    let progress = 0
    let percentage = 0

    const { data: rewardTypes } = await supabase
      .from('custom_reward_types')
      .select('id, type_key, display_name')

    if (goal.tracking_mode === 'cumulative_amount') {
      // 累積數量模式
      const targetRewardTypeId = goal.tracking_reward_type_id || goal.reward_type_id

      if (!targetRewardTypeId) {
        progress = 0
        percentage = 0
      } else {
        let query = supabase
          .from('transactions')
          .select('amount, created_at, transaction_date, reward_type_id, category, transaction_type')
          .eq('student_id', goal.student_id)
          .in('transaction_type', ['earn', 'bonus'])

        // 一般目標：排除已被其他目標消耗的交易
        if (!isMilestone) {
          query = query.is('consumed_by_goal_id', null)
        }

        const { data: result, error: sumError } = await query

        if (!sumError && result) {
          const matchingTransactions = result.filter((transaction) =>
            transactionMatchesRewardType(transaction, targetRewardTypeId, rewardTypes || [])
          )
          const trackedTransactions = filterTransactionsByTrackingStart(matchingTransactions, goal.tracking_started_at)
          progress = trackedTransactions.reduce((sum: number, transaction) => sum + getEarnedRewardAmount(transaction), 0)
        }
        percentage = goal.target_amount && goal.target_amount > 0
          ? Math.round((progress / goal.target_amount) * 100)
          : 0
      }
    } else {
      // 完成次數模式
      const linkedEventIds = goal.linked_event_ids || []
      let query = supabase
        .from('transactions')
        .select('id, created_at, transaction_date')
        .eq('student_id', goal.student_id)

      // 一般目標：排除已被其他目標消耗的交易
      if (!isMilestone) {
        query = query.is('consumed_by_goal_id', null)
      }

      if (linkedEventIds.length > 0) {
        query = query.in('achievement_event_id', linkedEventIds)
      } else {
        query = query.not('achievement_event_id', 'is', null)
      }

      const { data: result, error: countError } = await query

      if (!countError && result) {
        progress = filterTransactionsByTrackingStart(result, goal.tracking_started_at).length
      }
      percentage = goal.target_count && goal.target_count > 0
        ? Math.round((progress / goal.target_count) * 100)
        : 0
    }

    return NextResponse.json({
      success: true,
      progress,
      percentage,
      is_milestone: isMilestone,
      target: goal.tracking_mode === 'cumulative_amount' ? goal.target_amount : goal.target_count,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate progress: ' + (err as Error).message
    }, { status: 500 })
  }
}
