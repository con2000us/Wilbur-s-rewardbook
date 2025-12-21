import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { data, error} = await supabase
      .from('reward_rules')
      .insert({
        student_id: body.student_id,
        subject_id: body.subject_id,
        rule_name: body.rule_name,
        condition: body.condition || 'score_range',
        description: body.description || null,
        icon: body.icon || '💎',
        color: body.color || '#4a9eff',
        min_score: body.min_score,
        max_score: body.max_score,
        reward_amount: body.reward_amount,
        priority: body.priority || 0,
        is_active: true,
        assessment_type: body.assessment_type || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating reward rule:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message },
      { status: 500 }
    )
  }
}

