import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type AchievementEventUpdate = Database['public']['Tables']['achievement_events']['Update']
type AchievementEventRewardRuleInsert = Database['public']['Tables']['achievement_event_reward_rules']['Insert']

type RewardRuleInput = {
  reward_type_id: string
  default_amount?: number | null
  is_default?: boolean
}

type AchievementEventUpdatePayload = {
  id?: string
  name?: string
  description?: string | null
  is_active?: boolean
  display_order?: number
  reward_rules?: RewardRuleInput[]
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as AchievementEventUpdatePayload
    const {
      id,
      name,
      description,
      is_active,
      display_order,
      reward_rules,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supabase = createClient()

    const updateData: AchievementEventUpdate = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = typeof description === 'string' ? description.trim() || null : null
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order

    const { error: eventError } = await supabase
      .from('achievement_events')
      .update(updateData)
      .eq('id', id)

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    if (reward_rules && Array.isArray(reward_rules)) {
      await supabase
        .from('achievement_event_reward_rules')
        .delete()
        .eq('event_id', id)

      if (reward_rules.length > 0) {
        const rulesToInsert: AchievementEventRewardRuleInsert[] = reward_rules.map((rule) => ({
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

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
