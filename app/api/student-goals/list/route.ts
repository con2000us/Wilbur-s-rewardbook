import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { filterTransactionsByTrackingStart } from '@/lib/utils/goalTracking'
import {
  getEarnedRewardAmount,
  transactionMatchesRewardType,
} from '@/lib/utils/rewardTransactions'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 })
    }

    const { data: goals, error } = await supabase
      .from('student_goals')
      .select('*')
      .eq('student_id', studentId)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const { data: rewardTypes } = await supabase
      .from('custom_reward_types')
      .select('id, type_key, display_name')

    // 為每個目標計算即時進度，覆蓋 current_progress（因為原本的 current_progress 從未被同步更新）
    if (goals && goals.length > 0) {
      for (const goal of goals) {
        if (goal.tracking_mode === 'cumulative_amount') {
          const targetRewardTypeId = goal.tracking_reward_type_id || goal.reward_type_id

          if (targetRewardTypeId) {
            let query = supabase
              .from('transactions')
              .select('amount, created_at, transaction_date, reward_type_id, category, transaction_type')
              .eq('student_id', goal.student_id)
              .in('transaction_type', ['earn', 'bonus'])

            if (goal.consume_on_complete !== false) {
              query = query.is('consumed_by_goal_id', null)
            }

            const { data: result, error: sumError } = await query

            if (!sumError && result) {
              const matchingTransactions = result.filter((transaction) =>
                transactionMatchesRewardType(transaction, targetRewardTypeId, rewardTypes || [])
              )
              const trackedTransactions = filterTransactionsByTrackingStart(matchingTransactions, goal.tracking_started_at)
              goal.current_progress = trackedTransactions.reduce(
                (sum: number, t) => sum + getEarnedRewardAmount(t),
                0
              )
            }
          }
        } else if (goal.tracking_mode === 'completion_count') {
          const linkedEventIds = goal.linked_event_ids || []
          let query = supabase
            .from('transactions')
            .select('id, created_at, transaction_date')
            .eq('student_id', goal.student_id)

          if (goal.consume_on_complete !== false) {
            query = query.is('consumed_by_goal_id', null)
          }

          if (linkedEventIds.length > 0) {
            query = query.in('achievement_event_id', linkedEventIds)
          } else {
            query = query.not('achievement_event_id', 'is', null)
          }

          const { data: result, error: countError } = await query

          if (!countError && result) {
            goal.current_progress = filterTransactionsByTrackingStart(result, goal.tracking_started_at).length
          }
        }
      }
    }

    return NextResponse.json({ success: true, goals: goals || [] })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch student goals: ' + (err as Error).message
    }, { status: 500 })
  }
}
