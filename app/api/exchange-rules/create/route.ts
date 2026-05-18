import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { toCanonicalKey } from '@/app/api/_shared/i18n'
import type { Database } from '@/lib/supabase/types'

type ExchangeRuleInsert = Database['public']['Tables']['exchange_rules']['Insert']

type ExchangeRuleCreatePayload = {
  name?: string
  description?: string
  rule_key?: string
  required_reward_type_id?: string
  required_amount?: string | number
  reward_type_id?: string | null
  reward_amount?: string | number | null
  reward_item?: string | null
  is_active?: boolean
  display_order?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExchangeRuleCreatePayload
    const supabase = createClient()

    const {
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

    if (!name || !name.trim()) {
      return NextResponse.json({
        error: 'name is required'
      }, { status: 400 })
    }

    if (!required_reward_type_id || !required_amount) {
      return NextResponse.json({
        error: 'required_reward_type_id and required_amount are required'
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

    const resolvedRuleKey = toCanonicalKey(rule_key || name.trim(), 'rule')

    const basePayload: ExchangeRuleInsert = {
      name: name.trim(),
      description: description?.trim() || null,
      required_reward_type_id,
      required_amount: Number(required_amount),
      reward_type_id: reward_type_id || null,
      reward_amount: reward_amount ? Number(reward_amount) : null,
      reward_item: reward_item || null,
      is_active: is_active !== undefined ? is_active : true,
      display_order: newDisplayOrder,
    }

    const { data, error } = await supabase
      .from('exchange_rules')
      .insert({
        ...basePayload,
        rule_key: resolvedRuleKey,
      })
      .select()
      .single()

    let createdRule = data
    let createError = error

    if (createError && String(createError.message || '').includes('rule_key')) {
      const fallbackResult = await supabase
        .from('exchange_rules')
        .insert(basePayload)
        .select()
        .single()
      createdRule = fallbackResult.data
      createError = fallbackResult.error
    }

    if (createError) {
      console.error('Error creating exchange rule:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: createdRule })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
