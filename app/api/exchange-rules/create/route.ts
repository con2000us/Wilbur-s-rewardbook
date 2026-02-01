import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { 
      name_zh, 
      name_en, 
      description_zh, 
      description_en, 
      required_reward_type_id, 
      required_amount, 
      reward_type_id,
      reward_amount,
      reward_item,
      is_active,
      display_order
    } = body

    if (!name_zh || !required_reward_type_id || !required_amount) {
      return NextResponse.json({ 
        error: 'name_zh, required_reward_type_id, and required_amount are required' 
      }, { status: 400 })
    }

    // 獲取當前最大的 display_order
    const { data: existingRules } = await supabase
      .from('exchange_rules')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)

    const newDisplayOrder = display_order !== undefined 
      ? display_order 
      : ((existingRules?.[0]?.display_order || 0) + 1)

    const { data, error } = await supabase
      .from('exchange_rules')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        name_zh,
        name_en: name_en || null,
        description_zh: description_zh || null,
        description_en: description_en || null,
        required_reward_type_id,
        required_amount: parseFloat(required_amount),
        reward_type_id: reward_type_id || null,
        reward_amount: reward_amount ? parseFloat(reward_amount) : null,
        reward_item: reward_item || null,
        is_active: is_active !== undefined ? is_active : true,
        display_order: newDisplayOrder
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating exchange rule:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
