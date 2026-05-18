import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database, Json } from '@/lib/supabase/types'

type RewardRuleInsert = Database['public']['Tables']['reward_rules']['Insert']

type RewardRuleCreatePayload = {
  student_id?: string | null
  subject_id?: string | null
  rule_name?: string
  condition?: string | null
  description?: string | null
  icon?: string | null
  color?: string | null
  min_score?: number | null
  max_score?: number | null
  reward_amount?: number
  reward_formula?: string | null
  reward_config?: Json | null
  priority?: number
  assessment_type?: string | null
  display_order?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RewardRuleCreatePayload
    const supabase = createClient()

    if (!body.rule_name) {
      return NextResponse.json({ error: 'rule_name is required' }, { status: 400 })
    }

    const insertData: RewardRuleInsert = {
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
      reward_formula: body.reward_formula || null,
      reward_config: body.reward_config || null,
      priority: body.priority || 0,
      is_active: true,
      assessment_type: body.assessment_type || null,
    }

    if (body.display_order !== undefined && body.display_order !== null) {
      insertData.display_order = body.display_order
    }

    const { data, error } = await supabase
      .from('reward_rules')
      .insert(insertData)
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
      { error: '發生錯誤：' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
