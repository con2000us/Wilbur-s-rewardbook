import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildDualLocalePayload, toCanonicalKey } from '@/app/api/_shared/i18n'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { 
      name,
      description,
      locale,
      rule_key,
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

    const { name: resolvedName, nameZh: resolvedNameZh, nameEn: resolvedNameEn, descriptionZh, descriptionEn } =
      buildDualLocalePayload({
        locale,
        name,
        description,
        name_zh,
        name_en,
        description_zh,
        description_en,
      })

    if (!resolvedName || !required_reward_type_id || !required_amount) {
      return NextResponse.json({ 
        error: 'name, required_reward_type_id, and required_amount are required' 
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

    const resolvedRuleKey = toCanonicalKey(rule_key || resolvedNameEn || resolvedNameZh || resolvedName, 'rule')

    const basePayload: any = {
      name_zh: resolvedNameZh || resolvedName,
      name_en: resolvedNameEn || null,
      description_zh: descriptionZh || null,
      description_en: descriptionEn || null,
      required_reward_type_id,
      required_amount: parseFloat(required_amount),
      reward_type_id: reward_type_id || null,
      reward_amount: reward_amount ? parseFloat(reward_amount) : null,
      reward_item: reward_item || null,
      is_active: is_active !== undefined ? is_active : true,
      display_order: newDisplayOrder,
    }

    const { data, error } = await supabase
      .from('exchange_rules')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        ...basePayload,
        rule_key: resolvedRuleKey,
      } as any)
      .select()
      .single()

    let createdRule = data
    let createError = error

    if (createError && String(createError.message || '').includes('rule_key')) {
      const fallbackResult = await supabase
        .from('exchange_rules')
        // @ts-ignore
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

    const translationsToUpsert: Array<{ rule_id: string; locale: string; name: string; description: string | null }> =
      []

    if (resolvedNameZh) {
      translationsToUpsert.push({
        rule_id: createdRule.id,
        locale: 'zh-TW',
        name: resolvedNameZh,
        description: descriptionZh || null,
      })
    }

    if (resolvedNameEn) {
      translationsToUpsert.push({
        rule_id: createdRule.id,
        locale: 'en',
        name: resolvedNameEn,
        description: descriptionEn || null,
      })
    }

    if (translationsToUpsert.length > 0) {
      const { error: translationError } = await supabase
        .from('exchange_rule_translations')
        .upsert(translationsToUpsert as any, { onConflict: 'rule_id,locale' })

      if (translationError) {
        console.warn('exchange_rule_translations upsert skipped:', translationError.message)
      }
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
