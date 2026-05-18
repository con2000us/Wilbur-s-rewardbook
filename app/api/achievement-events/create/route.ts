import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type AchievementEventInsert = Database['public']['Tables']['achievement_events']['Insert']
type AchievementEventRewardRuleInsert = Database['public']['Tables']['achievement_event_reward_rules']['Insert']

type RewardRuleInput = {
  reward_type_id: string
  default_amount?: number | null
  is_default?: boolean
}

type AchievementEventCreatePayload = {
  name?: string
  description?: string | null
  is_active?: boolean
  display_order?: number
  reward_rules?: RewardRuleInput[]
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as AchievementEventCreatePayload
    const {
      name,
      description,
      is_active,
      display_order,
      reward_rules,
    } = body

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supabase = createClient()

    const eventToInsert: AchievementEventInsert = {
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() || null : null,
      is_active: is_active ?? true,
      display_order: display_order ?? 0,
    }

    const { data: event, error } = await supabase
      .from('achievement_events')
      .insert(eventToInsert)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ error: 'Failed to create achievement event' }, { status: 500 })
    }

    if (reward_rules && Array.isArray(reward_rules) && reward_rules.length > 0) {
      const rulesToInsert: AchievementEventRewardRuleInsert[] = reward_rules.map((rule) => ({
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
