import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildDualLocalePayload, toCanonicalKey } from '@/app/api/_shared/i18n'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      id,
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

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createClient()

    const updateData: any = { updated_at: new Date().toISOString() }

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

    if (event_key !== undefined && event_key !== null && String(event_key).trim() !== '') {
      updateData.event_key = toCanonicalKey(String(event_key), 'event')
    }
    if (name_zh !== undefined || (preferredLocale === 'zh-TW' && name !== undefined)) updateData.name_zh = resolvedNameZh
    if (name_en !== undefined || (preferredLocale === 'en' && name !== undefined)) updateData.name_en = resolvedNameEn || null
    if (description_zh !== undefined || (preferredLocale === 'zh-TW' && description !== undefined)) {
      updateData.description_zh = descriptionZh || null
    }
    if (description_en !== undefined || (preferredLocale === 'en' && description !== undefined)) {
      updateData.description_en = descriptionEn || null
    }
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order

    const runUpdate = async (payload: any) =>
      supabase
        .from('achievement_events')
        // @ts-ignore - Supabase type inference issue for newly added tables
        .update(payload as any)
        .eq('id', id)
        .select()
        .single()

    let { data: event, error: eventError } = await runUpdate(updateData)

    if (eventError && String(eventError.message || '').includes('event_key')) {
      const { event_key: _eventKey, ...fallbackUpdateData } = updateData
      const fallbackResult = await runUpdate(fallbackUpdateData)
      event = fallbackResult.data
      eventError = fallbackResult.error
    }

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    const translationsToUpsert: Array<{ event_id: string; locale: string; name: string; description: string | null }> = []
    if (resolvedNameZh) {
      translationsToUpsert.push({
        event_id: id,
        locale: 'zh-TW',
        name: resolvedNameZh,
        description: descriptionZh || null,
      })
    }
    if (resolvedNameEn) {
      translationsToUpsert.push({
        event_id: id,
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

    if (reward_rules && Array.isArray(reward_rules)) {
      await supabase
        .from('achievement_event_reward_rules')
        // @ts-ignore - Supabase type inference issue for newly added tables
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
          // @ts-ignore - Supabase type inference issue for newly added tables
          .insert(rulesToInsert as any)

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
