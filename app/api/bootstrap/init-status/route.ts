import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'system_initialized',
        'system_locale',
        'initialized_at',
        'demo_data_imported',
        'demo_data_locale',
        'initialization_logs',
      ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const settings = (data || []).reduce((acc: Record<string, string>, item: any) => {
      acc[item.key] = item.value || ''
      return acc
    }, {})

    return NextResponse.json({
      initialized: settings.system_initialized === 'true',
      systemLocale: settings.system_locale || null,
      initializedAt: settings.initialized_at || null,
      demoDataImported: settings.demo_data_imported === 'true',
      demoDataLocale: settings.demo_data_locale || null,
      logs: (() => {
        try {
          return JSON.parse(settings.initialization_logs || '[]')
        } catch {
          return []
        }
      })(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load init status' }, { status: 500 })
  }
}
