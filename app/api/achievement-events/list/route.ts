import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parsePreferredLocale, resolveLocalizedText } from '@/app/api/_shared/i18n'

export async function GET() {
  try {
    const supabase = createClient()
    const cookieStore = await cookies()
    const preferredLocale = parsePreferredLocale(cookieStore.get('NEXT_LOCALE')?.value)

    const { data: events, error: eventsError } = await supabase
      // @ts-ignore - Supabase type inference issue for newly added tables
      .from('achievement_events')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    const eventIds = (events || []).map((event: any) => event.id)
    let translationsByEventId = new Map<string, any[]>()

    if (eventIds.length > 0) {
      const { data: translations, error: translationsError } = await supabase
        // @ts-ignore - Supabase type inference issue for newly added tables
        .from('achievement_event_translations')
        .select('event_id, locale, name, description')
        .in('event_id', eventIds)
        .in('locale', ['zh-TW', 'en'])

      if (translationsError) {
        // Fallback: DB may not have translation table yet.
        translationsByEventId = new Map<string, any[]>()
      } else {
        translationsByEventId = (translations || []).reduce((map: Map<string, any[]>, translation: any) => {
          const current = map.get(translation.event_id) || []
          current.push(translation)
          map.set(translation.event_id, current)
          return map
        }, new Map<string, any[]>())
      }
    }

    const eventsWithTranslations = (events || []).map((event: any) => {
      const translations = translationsByEventId.get(event.id) || []
      const localized = resolveLocalizedText({
        locale: preferredLocale,
        translations,
        fallbackZhName: event.name_zh,
        fallbackEnName: event.name_en,
        fallbackZhDescription: event.description_zh,
        fallbackEnDescription: event.description_en,
      })

      return {
        ...event,
        ...localized,
      }
    })

    const { data: rules, error: rulesError } = await supabase
      // @ts-ignore - Supabase type inference issue for newly added tables
      .from('achievement_event_reward_rules')
      .select('*')

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      events: eventsWithTranslations,
      rules: rules || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
