import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()

    const { data: events, error: eventsError } = await supabase
      .from('achievement_events')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    const { data: rules, error: rulesError } = await supabase
      .from('achievement_event_reward_rules')
      .select('*')

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      rules: rules || []
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
