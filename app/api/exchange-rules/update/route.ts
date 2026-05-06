import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildDualLocalePayload, toCanonicalKey } from '@/app/api/_shared/i18n'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { 
      id,
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

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { locale: preferredLocale, nameZh: resolvedNameZh, nameEn: resolvedNameEn, descriptionZh, descriptionEn } =
      buildDualLocalePayload({
        locale,
        name,
        description,
        name_zh,
        name_en,
        description_zh,
        description_en,
      })

    const updateData: any = {}
    if (rule_key !== undefined && rule_key !== null && String(rule_key).trim() !== '') {
      updateData.rule_key = toCanonicalKey(String(rule_key), 'rule')
    }
    if (name_zh !== undefined || (preferredLocale === 'zh-TW' && name !== undefined)) updateData.name_zh = resolvedNameZh
    if (name_en !== undefined || (preferredLocale === 'en' && name !== undefined)) updateData.name_en = resolvedNameEn || null
    if (description_zh !== undefined || (preferredLocale === 'zh-TW' && description !== undefined)) {
      updateData.description_zh = descriptionZh || null
    }
    if (description_en !== undefined || (preferredLocale === 'en' && description !== undefined)) {
      updateData.description_en = descriptionEn || null
    }
    if (required_reward_type_id !== undefined) updateData.required_reward_type_id = required_reward_type_id
    if (required_amount !== undefined) updateData.required_amount = parseFloat(required_amount)
    if (reward_type_id !== undefined) updateData.reward_type_id = reward_type_id || null
    if (reward_amount !== undefined) updateData.reward_amount = reward_amount ? parseFloat(reward_amount) : null
    if (reward_item !== undefined) updateData.reward_item = reward_item || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order
    updateData.updated_at = new Date().toISOString()

    const runUpdate = async (payload: any) =>
      supabase
        .from('exchange_rules')
        // @ts-ignore - Supabase type inference issue with update operations
        .update(payload)
        .eq('id', id)
        .select()
        .single()

    let { data, error } = await runUpdate(updateData)

    if (error && String(error.message || '').includes('rule_key')) {
      const { rule_key: _ruleKey, ...fallbackData } = updateData
      const fallback = await runUpdate(fallbackData)
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('Error updating exchange rule:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const translationsToUpsert: Array<{ rule_id: string; locale: string; name: string; description: string | null }> =
      []

    if (resolvedNameZh) {
      translationsToUpsert.push({
        rule_id: id,
        locale: 'zh-TW',
        name: resolvedNameZh,
        description: descriptionZh || null,
      })
    }

    if (resolvedNameEn) {
      translationsToUpsert.push({
        rule_id: id,
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

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
