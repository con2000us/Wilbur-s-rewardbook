import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  filterTransactionsByTrackingStart,
  sortTransactionsForGoalProgress,
} from '@/lib/utils/goalTracking'
import {
  getEarnedRewardAmount,
  transactionMatchesRewardType,
} from '@/lib/utils/rewardTransactions'

/**
 * POST /api/student-goals/[id]/complete
 * 標記目標完成。
 * - 一般目標（consume_on_complete=true）：消耗對應的 transactions
 * - 里程碑目標（consume_on_complete=false）：不消耗任何交易
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params

  try {
    const body = await request.json()
    const { completed_at, completion_notes, completion_images } = body

    // 取得目標資訊
    const { data: goal, error: goalError } = await supabase
      .from('student_goals')
      .select('*')
      .eq('id', id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 })
    }

    if (goal.status === 'completed') {
      return NextResponse.json({ success: false, error: 'Goal is already completed' }, { status: 400 })
    }

    const isMilestone = goal.consume_on_complete === false
    const { data: rewardTypes } = await supabase
      .from('custom_reward_types')
      .select('id, type_key, display_name')

    // 消耗邏輯：里程碑目標跳過消耗
    if (!isMilestone) {
      const isCompletionCount = goal.tracking_mode === 'completion_count'

      if (isCompletionCount) {
        // 完成次數模式：消耗 target_count 筆最早的 transactions
        if (goal.target_count != null && goal.target_count > 0) {
          let query = supabase
            .from('transactions')
            .select('id, created_at, transaction_date')
            .eq('student_id', goal.student_id)
            .is('consumed_by_goal_id', null)
            .order('created_at', { ascending: true })

          const linkedEventIds = goal.linked_event_ids || []
          if (linkedEventIds.length > 0) {
            query = query.in('achievement_event_id', linkedEventIds)
          } else {
            query = query.not('achievement_event_id', 'is', null)
          }

          const { data: transactionsToConsume } = await query

          if (transactionsToConsume && transactionsToConsume.length > 0) {
            const txnIds = sortTransactionsForGoalProgress(
              filterTransactionsByTrackingStart(transactionsToConsume, goal.tracking_started_at)
            )
              .slice(0, goal.target_count)
              .map((t: { id: string }) => t.id)
            if (txnIds.length > 0) {
              await supabase
                .from('transactions')
                .update({ consumed_by_goal_id: id })
                .in('id', txnIds)
            }
          }
        }
      } else {
        // 累積數量模式：消耗總和達到 target_amount 的最早 transactions
        // 若最後一筆超額，拆分：原交易標記消耗 + 新增一筆「剩餘退還」
        const targetRewardTypeId = goal.tracking_reward_type_id || goal.reward_type_id

        if (targetRewardTypeId && goal.target_amount != null && goal.target_amount > 0) {
          const query = supabase
            .from('transactions')
            .select('id, amount, description, created_at, transaction_date, reward_type_id, category, transaction_type')
            .eq('student_id', goal.student_id)
            .in('transaction_type', ['earn', 'bonus'])
            .is('consumed_by_goal_id', null)
            .order('created_at', { ascending: true })

          const { data: allTxns } = await query

          if (allTxns && allTxns.length > 0) {
            const matchingTxns = allTxns.filter((transaction) =>
              transactionMatchesRewardType(transaction, targetRewardTypeId, rewardTypes || [])
            )
            const trackedTxns = sortTransactionsForGoalProgress(
              filterTransactionsByTrackingStart(matchingTxns, goal.tracking_started_at)
            )
            let sum = 0
            const idsToConsume: string[] = []
            let overflowTxn: typeof trackedTxns[0] | null = null
            let overflowAmount = 0

            for (const txn of trackedTxns) {
              sum += getEarnedRewardAmount(txn)
              idsToConsume.push(txn.id)
              if (sum >= goal.target_amount) {
                // 記錄超額的最後一筆
                if (sum > goal.target_amount) {
                  overflowTxn = txn
                  overflowAmount = sum - goal.target_amount
                }
                break
              }
            }

            if (idsToConsume.length > 0) {
              await supabase
                .from('transactions')
                .update({ consumed_by_goal_id: id })
                .in('id', idsToConsume)
            }

            // 拆分超額：建立一筆「剩餘退還」交易
            if (overflowTxn && overflowAmount > 0) {
              const refundDescription = `↩️ 剩餘退還：原交易「${overflowTxn.description || overflowTxn.id}」(+${overflowTxn.amount})，已用於「${goal.name}」${goal.target_amount - (sum - overflowTxn.amount)}，退還 ${overflowAmount}`
              await supabase
                .from('transactions')
                .insert({
                  student_id: goal.student_id,
                  reward_type_id: targetRewardTypeId,
                  transaction_type: 'bonus',
                  amount: overflowAmount,
                  description: refundDescription,
                  category: 'goal_refund',
                  transaction_date: new Date().toISOString().split('T')[0],
                })
            }
          }
        }
      }
    }

    // 更新目標狀態
    const completionTimestamp = completed_at || new Date().toISOString()
    const transactionDate = new Date(completionTimestamp).toISOString().split('T')[0]

    const { data: updatedGoal, error: updateError } = await supabase
      .from('student_goals')
      .update({
        status: 'completed',
        completed_at: completionTimestamp,
        completion_notes: completion_notes || null,
        completion_images: completion_images || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    // 建立存摺交易記錄
    const createdTransactionIds: string[] = []

    // 1. 發放達成獎勵（reward_on_complete）
    if (goal.reward_on_complete > 0 && goal.reward_type_id) {
      const { data: rewardTxn, error: rewardTxnError } = await supabase
        .from('transactions')
        .insert({
          student_id: goal.student_id,
          reward_type_id: goal.reward_type_id,
          transaction_type: 'earn',
          amount: goal.reward_on_complete,
          description: `🎯 ${goal.name}`,
          category: 'goal_complete',
          transaction_date: transactionDate,
        })
        .select()
        .single()

      if (!rewardTxnError && rewardTxn) {
        createdTransactionIds.push(rewardTxn.id)
      }
    }

    // 2. 完成標記交易（零額度，僅供存摺顯示）
    const markerDescription = isMilestone ? `🏁 ${goal.name} (里程碑)` : `🏁 ${goal.name}`
    const { data: markerTxn, error: markerTxnError } = await supabase
      .from('transactions')
      .insert({
        student_id: goal.student_id,
        reward_type_id: goal.reward_type_id || goal.tracking_reward_type_id,
        transaction_type: 'spend',
        amount: 0,
        description: markerDescription,
        category: 'goal_complete',
        transaction_date: transactionDate,
      })
      .select()
      .single()

    if (!markerTxnError && markerTxn) {
      createdTransactionIds.push(markerTxn.id)
    }

    return NextResponse.json({
      success: true,
      goal: updatedGoal,
      is_milestone: isMilestone,
      completion_transaction_ids: createdTransactionIds
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to complete goal: ' + (err as Error).message
    }, { status: 500 })
  }
}
