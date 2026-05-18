import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database, Json } from '@/lib/supabase/types'

type RewardRuleUpdate = Database['public']['Tables']['reward_rules']['Update']

type RewardRuleUpdatePayload = {
  rule_id?: string
  student_id?: string | null
  subject_id?: string | null
  rule_name?: string
  condition?: string | null
  min_score?: number | null
  max_score?: number | null
  reward_amount?: number
  reward_formula?: string | null
  reward_config?: Json | null
  priority?: number
  is_active?: boolean
  assessment_type?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RewardRuleUpdatePayload
    const supabase = createClient()

    if (!body.rule_id) {
      return NextResponse.json({ error: 'rule_id is required' }, { status: 400 })
    }

    const updateData: RewardRuleUpdate = {}

    if (body.student_id !== undefined) updateData.student_id = body.student_id
    if (body.subject_id !== undefined) updateData.subject_id = body.subject_id
    if (body.rule_name !== undefined) updateData.rule_name = body.rule_name
    if (body.condition !== undefined) updateData.condition = body.condition
    if (body.min_score !== undefined) updateData.min_score = body.min_score
    if (body.max_score !== undefined) updateData.max_score = body.max_score
    if (body.reward_amount !== undefined) updateData.reward_amount = body.reward_amount
    if (body.reward_formula !== undefined) updateData.reward_formula = body.reward_formula || null
    if (body.reward_config !== undefined) updateData.reward_config = body.reward_config || null
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.assessment_type !== undefined) updateData.assessment_type = body.assessment_type

    const { data, error } = await supabase
      .from('reward_rules')
      .update(updateData)
      .eq('id', body.rule_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating reward rule:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      console.error('Update succeeded but no data returned')
      return NextResponse.json({ error: '更新成功但未返回數據' }, { status: 500 })
    }

    console.log('Reward rule updated:', {
      id: data.id,
      rule_name: data.rule_name,
      is_active: data.is_active,
      student_id: data.student_id,
      subject_id: data.subject_id,
    })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
