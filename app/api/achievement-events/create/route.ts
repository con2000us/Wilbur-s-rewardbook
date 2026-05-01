import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name_zh, name_en, description_zh, description_en, is_active, display_order, reward_rules } = body

    if (!name_zh) {
      return NextResponse.json({ error: 'name_zh is required' }, { status: 400 })
    }

    const supabase = createClient()

    const { data: event, error: eventError } = await supabase
      .from('achievement_events')
      .insert({
        name_zh,
        name_en: name_en || null,
        description_zh: description_zh || null,
        description_en: description_en || null,
        is_active: is_active ?? true,
        display_order: display_order ?? 0
      })
      .select()
      .single()

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    if (reward_rules && Array.isArray(reward_rules) && reward_rules.length > 0) {
      const rulesToInsert = reward_rules.map((rule: any) => ({
        event_id: event.id,
        reward_type_id: rule.reward_type_id,
        default_amount: rule.default_amount ?? 0,
        is_default: rule.is_default ?? false,
      }))

      const { error: rulesError } = await supabase
        .from('achievement_event_reward_rules')
        .insert(rulesToInsert)

      if (rulesError) {
        console.error('Failed to insert reward rules:', rulesError)
      }
    }

    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
