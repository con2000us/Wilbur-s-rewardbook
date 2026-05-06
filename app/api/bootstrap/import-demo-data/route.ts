import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  appendInitializationLog,
  ensureRewardTypes,
  importDemoSeedData,
  parseLocale,
  upsertSetting,
} from '../_shared'

export async function POST(request: Request) {
  let selectedLocale = parseLocale(undefined)
  try {
    const body = await request.json()
    selectedLocale = parseLocale(body?.locale)
    const supabase = createClient()

    await ensureRewardTypes(supabase, selectedLocale)
    await importDemoSeedData(supabase)

    await upsertSetting(supabase, 'demo_data_imported', 'true')
    await upsertSetting(supabase, 'demo_data_locale', selectedLocale)
    await appendInitializationLog(supabase, 'import_demo_data', selectedLocale, true, true)

    return NextResponse.json({
      success: true,
      locale: selectedLocale,
    })
  } catch (error: any) {
    try {
      const supabase = createClient()
      await appendInitializationLog(
        supabase,
        'import_demo_data',
        selectedLocale,
        true,
        false,
        error.message || 'unknown error'
      )
    } catch {}
    return NextResponse.json({ error: error.message || 'Failed to import demo data' }, { status: 500 })
  }
}
