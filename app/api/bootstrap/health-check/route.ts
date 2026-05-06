import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()

    const eventKeyCheck = await supabase
      .from('achievement_events')
      .select('event_key')
      .limit(1)

    const translationTableCheck = await supabase
      .from('achievement_event_translations')
      .select('id')
      .limit(1)

    const rewardTypeCheck = await supabase
      .from('custom_reward_types')
      .select('type_key, display_name')
      .limit(1)

    const eventCountResult = await supabase
      .from('achievement_events')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({
      hasEventKeyColumn: !eventKeyCheck.error,
      hasTranslationTable: !translationTableCheck.error,
      hasRewardTypes: !rewardTypeCheck.error,
      eventCount: eventCountResult.count ?? 0,
      diagnostics: {
        eventKeyError: eventKeyCheck.error?.message || null,
        translationError: translationTableCheck.error?.message || null,
        rewardTypeError: rewardTypeCheck.error?.message || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Health check failed' }, { status: 500 })
  }
}
