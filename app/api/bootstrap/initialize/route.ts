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
  let importDemoData = false
  try {
    const body = await request.json()
    selectedLocale = parseLocale(body?.locale)
    importDemoData = Boolean(body?.importDemoData)
    const supabase = createClient()
    const force = Boolean(body?.force)

    const { data: initializedSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'system_initialized')
      .maybeSingle()

    if (!force && initializedSetting?.value === 'true') {
      return NextResponse.json({
        success: true,
        alreadyInitialized: true,
      })
    }

    await ensureRewardTypes(supabase, selectedLocale)

    if (importDemoData) {
      await importDemoSeedData(supabase)
    }

    await upsertSetting(supabase, 'system_initialized', 'true')
    await upsertSetting(supabase, 'system_locale', selectedLocale)
    await upsertSetting(supabase, 'demo_data_imported', importDemoData ? 'true' : 'false')
    await upsertSetting(supabase, 'demo_data_locale', importDemoData ? selectedLocale : '')
    await upsertSetting(supabase, 'initialized_at', new Date().toISOString())
    await appendInitializationLog(supabase, 'initialize', selectedLocale, importDemoData, true)

    return NextResponse.json({
      success: true,
      locale: selectedLocale,
      demoDataImported: importDemoData,
    })
  } catch (error: any) {
    try {
      const supabase = createClient()
      await appendInitializationLog(
        supabase,
        'initialize',
        selectedLocale,
        importDemoData,
        false,
        error.message || 'unknown error'
      )
    } catch {}
    return NextResponse.json({ error: error.message || 'Failed to initialize' }, { status: 500 })
  }
}
