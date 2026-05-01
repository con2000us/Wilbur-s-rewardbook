import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, name_zh, name_en, description_zh, description_en, is_active, display_order, reward_rules } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createClient()

    const updateData: any = { updated_at: new Date().toISOString() }
    if (name_zh !== undefined) updateData.name_zh = name_zh
    if (name_en !== undefined) updateData.name_en = name_en
    if (description_zh !== undefined) updateData.description_zh = description_zh
    if (description_en !== undefined) updateData.description_en = description_en
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order

    const { data: event, error: eventError } = await supabase
      .from('achievement_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    if (reward_rules && Array.isArray(reward_rules)) {
      await supabase
        .from('achievement_event_reward_rules')
        .delete()
        .eq('event_id', id)

      if (reward_rules.length > 0) {
        const rulesToInsert = reward_rules.map((rule: any) => ({
          event_id: id,
          reward_type_id: rule.reward_type_id,
          default_amount: rule.default_amount ?? 0,
          is_default: rule.is_default ?? false,
        }))

        const { error: rulesError } = await supabase
          .from('achievement_event_reward_rules')
          .insert(rulesToInsert)

        if (rulesError) {
          console.error('Failed to update reward rules:', rulesError)
        }
      }
    }

    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
