import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 構建更新對象，只包含提供的字段
    const updateData: any = {}
    
    if (body.student_id !== undefined) updateData.student_id = body.student_id
    if (body.subject_id !== undefined) updateData.subject_id = body.subject_id
    if (body.rule_name !== undefined) updateData.rule_name = body.rule_name
    if (body.condition !== undefined) updateData.condition = body.condition
    if (body.min_score !== undefined) updateData.min_score = body.min_score
    if (body.max_score !== undefined) updateData.max_score = body.max_score
    if (body.reward_amount !== undefined) updateData.reward_amount = body.reward_amount
    if (body.reward_formula !== undefined) updateData.reward_formula = body.reward_formula || null
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.assessment_type !== undefined) updateData.assessment_type = body.assessment_type

    const { data, error } = await supabase
      .from('reward_rules')
      // @ts-ignore - Supabase type inference issue with update operations
      .update(updateData)
      .eq('id', body.rule_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating reward rule:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 驗證更新是否成功
    if (!data) {
      console.error('Update succeeded but no data returned')
      return NextResponse.json({ error: '更新成功但未返回數據' }, { status: 500 })
    }

    // 記錄更新結果以便調試
    console.log('Reward rule updated:', {
      // @ts-ignore - Supabase type inference issue with select queries
      id: data.id,
      // @ts-ignore - Supabase type inference issue with select queries
      rule_name: data.rule_name,
      // @ts-ignore - Supabase type inference issue with select queries
      is_active: data.is_active,
      // @ts-ignore - Supabase type inference issue with select queries
      student_id: data.student_id,
      // @ts-ignore - Supabase type inference issue with select queries
      subject_id: data.subject_id
    })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message },
      { status: 500 }
    )
  }
}

