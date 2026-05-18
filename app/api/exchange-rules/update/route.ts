import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { toCanonicalKey } from '@/app/api/_shared/i18n'
import type { Database } from '@/lib/supabase/types'

type ExchangeRuleUpdate = Database['public']['Tables']['exchange_rules']['Update']

type ExchangeRuleUpdatePayload = ExchangeRuleUpdate & {
  id?: string
  required_amount?: string | number
  reward_amount?: string | number | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExchangeRuleUpdatePayload
    const supabase = createClient()

    const {
      id,
      name,
      description,
      rule_key,
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

    const updateData: ExchangeRuleUpdate = {}
    if (rule_key !== undefined && rule_key !== null && String(rule_key).trim() !== '') {
      updateData.rule_key = toCanonicalKey(String(rule_key), 'rule')
    }
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (required_reward_type_id !== undefined) updateData.required_reward_type_id = required_reward_type_id
    if (required_amount !== undefined) updateData.required_amount = Number(required_amount)
    if (reward_type_id !== undefined) updateData.reward_type_id = reward_type_id || null
    if (reward_amount !== undefined) updateData.reward_amount = reward_amount ? Number(reward_amount) : null
    if (reward_item !== undefined) updateData.reward_item = reward_item || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order
    updateData.updated_at = new Date().toISOString()

    const runUpdate = async (payload: ExchangeRuleUpdate) =>
      supabase
        .from('exchange_rules')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

    let { data, error } = await runUpdate(updateData)

    if (error && String(error.message || '').includes('rule_key')) {
      const fallbackData = { ...updateData }
      delete fallbackData.rule_key
      const fallback = await runUpdate(fallbackData)
      data = fallback.data
      error = fallback.error
    }

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
