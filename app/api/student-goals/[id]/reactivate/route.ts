import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/student-goals/[id]/reactivate
 * 重新啟用已完成的目標
 * - 一般目標：清除 consumed_by_goal_id、刪除完成交易
 * - 里程碑目標：沒有 consumed_by_goal_id 需清除，僅刪除完成交易
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params

  try {
    const body = await request.json() as {
      new_target_amount?: number | null
      new_target_count?: number | null
    }
    const { new_target_amount, new_target_count } = body

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

    // 一般目標：清除此目標之前消耗的交易標記
    if (!isMilestone) {
      await supabase
        .from('transactions')
        .update({ consumed_by_goal_id: null })
        .eq('consumed_by_goal_id', id)
    }

    // 刪除完成時建立的存摺交易記錄（達成獎勵 + 完成標記 + 剩餘退還）
    await supabase
      .from('transactions')
      .delete()
      .eq('category', 'goal_complete')
      .eq('description', `🎯 ${goal.name}`)

    // 刪除剩餘退還交易
    await supabase
      .from('transactions')
      .delete()
      .eq('category', 'goal_refund')
      .like('description', `%「${goal.name}」%`)

    // 刪除完成標記（一般 + 里程碑兩種格式）
    await supabase
      .from('transactions')
      .delete()
      .eq('category', 'goal_complete')
      .eq('description', `🏁 ${goal.name}`)

    if (isMilestone) {
      await supabase
        .from('transactions')
        .delete()
        .eq('category', 'goal_complete')
        .eq('description', `🏁 ${goal.name} (里程碑)`)
    }

    // 更新目標狀態
    const updateData: {
      status: 'active'
      completed_at: null
      completion_notes: null
      completion_images: []
      tracking_started_at: string
      current_progress: number
      updated_at: string
      target_amount?: number
      target_count?: number
    } = {
      status: 'active',
      completed_at: null,
      completion_notes: null,
      completion_images: [],
      tracking_started_at: new Date().toISOString(),
      current_progress: 0,
      updated_at: new Date().toISOString(),
    }

    if (new_target_amount != null) {
      updateData.target_amount = new_target_amount
    }
    if (new_target_count != null) {
      updateData.target_count = new_target_count
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
      error: 'Failed to reactivate goal: ' + (err as Error).message
    }, { status: 500 })
  }
}
