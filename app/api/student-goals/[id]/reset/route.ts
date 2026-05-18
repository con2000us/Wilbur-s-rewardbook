import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type ResetPayload = {
  tracking_started_at_mode?: 'keep' | 'today' | 'custom'
  tracking_started_at?: string | null
  new_target_amount?: number | null
  new_target_count?: number | null
}

type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isMissingGoalIdColumn(error: SupabaseErrorLike | null | undefined) {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    text.includes('transactions.goal_id') ||
    text.includes("'goal_id' column") ||
    text.includes('goal_id')
  )
}

function toTransactionDate(value: string | null | undefined) {
  if (!value) return new Date().toISOString().split('T')[0]
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split('T')[0]
  return parsed.toISOString().split('T')[0]
}

function toTrackingStartedAt(goalValue: string | null, body: ResetPayload) {
  if (body.tracking_started_at_mode === 'custom') {
    if (!body.tracking_started_at) return null
    const parsed = new Date(body.tracking_started_at)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  if (body.tracking_started_at_mode === 'today') {
    return new Date().toISOString()
  }

  return goalValue || null
}

async function deleteGoalGeneratedTransactions(
  supabase: ReturnType<typeof createClient>,
  goal: {
    id: string
    student_id: string
    name: string
    completed_at: string | null
    reward_type_id: string | null
    tracking_reward_type_id: string | null
    reward_on_complete: number | null
  }
) {
  const { data: linkedRows, error: linkedDeleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('goal_id', goal.id)
    .select('id')

  if (!linkedDeleteError && linkedRows && linkedRows.length > 0) {
    return
  }

  if (linkedDeleteError && !isMissingGoalIdColumn(linkedDeleteError)) {
    console.warn('Failed to delete transactions by goal_id, falling back to legacy matcher:', linkedDeleteError)
  }

  const transactionDate = toTransactionDate(goal.completed_at)
  const namePattern = `%${goal.name}%`

  await supabase
    .from('transactions')
    .delete()
    .eq('student_id', goal.student_id)
    .eq('category', 'goal_complete')
    .eq('transaction_date', transactionDate)
    .like('description', namePattern)

  if (goal.reward_on_complete && goal.reward_on_complete > 0 && goal.reward_type_id) {
    await supabase
      .from('transactions')
      .delete()
      .eq('student_id', goal.student_id)
      .eq('category', 'goal_complete')
      .eq('transaction_type', 'earn')
      .eq('reward_type_id', goal.reward_type_id)
      .eq('amount', goal.reward_on_complete)
      .like('description', namePattern)
  }

  const refundRewardTypeId = goal.tracking_reward_type_id || goal.reward_type_id
  let refundQuery = supabase
    .from('transactions')
    .delete()
    .eq('student_id', goal.student_id)
    .eq('category', 'goal_refund')
    .like('description', namePattern)

  if (refundRewardTypeId) {
    refundQuery = refundQuery.eq('reward_type_id', refundRewardTypeId)
  }

  await refundQuery
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params

  try {
    const body = await request.json() as ResetPayload

    const { data: goal, error: goalError } = await supabase
      .from('student_goals')
      .select('*')
      .eq('id', id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 })
    }

    const isMilestone = goal.consume_on_complete === false

    if (!isMilestone) {
      const { error: releaseError } = await supabase
        .from('transactions')
        .update({ consumed_by_goal_id: null })
        .eq('consumed_by_goal_id', id)

      if (releaseError) {
        return NextResponse.json({ success: false, error: releaseError.message }, { status: 500 })
      }
    }

    await deleteGoalGeneratedTransactions(supabase, {
      id: goal.id,
      student_id: goal.student_id,
      name: goal.name,
      completed_at: goal.completed_at,
      reward_type_id: goal.reward_type_id,
      tracking_reward_type_id: goal.tracking_reward_type_id,
      reward_on_complete: goal.reward_on_complete,
    })

    const updateData: {
      status: 'active'
      completed_at: null
      completion_notes: null
      completion_images: []
      tracking_started_at: string | null
      current_progress: number
      updated_at: string
      target_amount?: number
      target_count?: number
    } = {
      status: 'active',
      completed_at: null,
      completion_notes: null,
      completion_images: [],
      tracking_started_at: toTrackingStartedAt(goal.tracking_started_at, body),
      current_progress: 0,
      updated_at: new Date().toISOString(),
    }

    if (body.new_target_amount != null) {
      updateData.target_amount = body.new_target_amount
    }
    if (body.new_target_count != null) {
      updateData.target_count = body.new_target_count
    }

    const { data: updatedGoal, error: updateError } = await supabase
      .from('student_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, goal: updatedGoal })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to reset goal: ' + (err as Error).message,
    }, { status: 500 })
  }
}
