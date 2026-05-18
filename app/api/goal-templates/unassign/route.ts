import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type UnassignPayload = {
  goal_id?: string
  template_id?: string
  student_id?: string
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body = await request.json() as UnassignPayload

    let query = supabase
      .from('student_goals')
      .select('id, status, is_active')
      .limit(1)

    if (body.goal_id) {
      query = query.eq('id', body.goal_id)
    } else if (body.template_id && body.student_id) {
      query = query
        .eq('template_id', body.template_id)
        .eq('student_id', body.student_id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'goal_id or template_id + student_id is required',
      }, { status: 400 })
    }

    const { data: goals, error: findError } = await query

    if (findError) {
      return NextResponse.json({ success: false, error: findError.message }, { status: 500 })
    }

    const goal = (goals || []).find((row) => row.status !== 'completed' && row.is_active !== false)
    if (!goal) {
      return NextResponse.json({
        success: false,
        error: 'Active assigned goal not found',
      }, { status: 404 })
    }

    const { data: updatedGoal, error: updateError } = await supabase
      .from('student_goals')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, goal: updatedGoal })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to unassign goal template: ' + (err as Error).message,
    }, { status: 500 })
  }
}
