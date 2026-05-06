import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildDualLocalePayload, toCanonicalKey } from '@/app/api/_shared/i18n'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      locale,
      event_key,
      name_zh,
      name_en,
      description_zh,
      description_en,
      is_active,
      display_order,
      reward_rules,
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

    if (!resolvedName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supabase = createClient()
    const resolvedEventKey = toCanonicalKey(event_key || resolvedNameEn || resolvedNameZh || resolvedName, 'event')

    const baseEventPayload: any = {
      name_zh: resolvedNameZh || resolvedName,
      name_en: resolvedNameEn || null,
      description_zh: descriptionZh || null,
      description_en: descriptionEn || null,
      is_active: is_active ?? true,
      display_order: display_order ?? 0,
    }

    let event: any = null
    let eventError: any = null

    const insertWithEventKey = await supabase
      .from('achievement_events')
      .insert({
        ...baseEventPayload,
        event_key: resolvedEventKey,
      } as any)
      .select()
      .single()

    event = insertWithEventKey.data
    eventError = insertWithEventKey.error

    if (eventError && String(eventError.message || '').includes('event_key')) {
      const fallbackInsert = await supabase
        .from('achievement_events')
        .insert(baseEventPayload as any)
        .select()
        .single()

      event = fallbackInsert.data
      eventError = fallbackInsert.error
    }

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    const createdEvent = event as any
    const translationsToUpsert: Array<{ event_id: string; locale: string; name: string; description: string | null }> = []

    if (resolvedNameZh) {
      translationsToUpsert.push({
        event_id: createdEvent.id,
        locale: 'zh-TW',
        name: resolvedNameZh,
        description: descriptionZh || null,
      })
    }

    if (resolvedNameEn) {
      translationsToUpsert.push({
        event_id: createdEvent.id,
        locale: 'en',
        name: resolvedNameEn,
        description: descriptionEn || null,
      })
    }

    if (translationsToUpsert.length > 0) {
      const { error: translationError } = await supabase
        .from('achievement_event_translations')
        .upsert(translationsToUpsert as any, { onConflict: 'event_id,locale' })

      if (translationError) {
        // Fallback: DB may not have translation table yet.
        console.warn('achievement_event_translations upsert skipped:', translationError.message)
      }
    }

    if (reward_rules && Array.isArray(reward_rules) && reward_rules.length > 0) {
      const rulesToInsert = reward_rules.map((rule: any) => ({
        event_id: createdEvent.id,
        reward_type_id: rule.reward_type_id,
        default_amount: rule.default_amount ?? 0,
        is_default: rule.is_default ?? false,
      }))

      const { error: rulesError } = await supabase
        .from('achievement_event_reward_rules')
        .insert(rulesToInsert as any)

      if (rulesError) {
        console.error('Failed to insert reward rules:', rulesError)
      }
    }

    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
