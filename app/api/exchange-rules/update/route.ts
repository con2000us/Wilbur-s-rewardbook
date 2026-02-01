import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { 
      id,
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

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (name_zh !== undefined) updateData.name_zh = name_zh
    if (name_en !== undefined) updateData.name_en = name_en || null
    if (description_zh !== undefined) updateData.description_zh = description_zh || null
    if (description_en !== undefined) updateData.description_en = description_en || null
    if (required_reward_type_id !== undefined) updateData.required_reward_type_id = required_reward_type_id
    if (required_amount !== undefined) updateData.required_amount = parseFloat(required_amount)
    if (reward_type_id !== undefined) updateData.reward_type_id = reward_type_id || null
    if (reward_amount !== undefined) updateData.reward_amount = reward_amount ? parseFloat(reward_amount) : null
    if (reward_item !== undefined) updateData.reward_item = reward_item || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('exchange_rules')
      // @ts-ignore - Supabase type inference issue with update operations
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating exchange rule:', error)
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
