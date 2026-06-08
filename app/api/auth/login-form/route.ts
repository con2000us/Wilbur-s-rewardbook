import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, createAuthToken, getSitePassword } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import {
  appendInitializationLog,
  ensureRewardTypes,
  importDemoSeedData,
  parseLocale,
  upsertSetting,
} from '@/app/api/bootstrap/_shared'

function safeRedirectPath(value: FormDataEntryValue | null) {
  const redirect = typeof value === 'string' ? value : ''
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/'
  return redirect
}

async function initializeIfNeeded(locale: ReturnType<typeof parseLocale>, importDemoData: boolean) {
  const supabase = createClient()
  const { data: initializedSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'system_initialized')
    .maybeSingle()

  if (initializedSetting?.value === 'true') {
    return
  }

  await ensureRewardTypes(supabase, locale)

  if (importDemoData) {
    await importDemoSeedData(supabase)
  }

  await upsertSetting(supabase, 'system_initialized', 'true')
  await upsertSetting(supabase, 'system_locale', locale)
  await upsertSetting(supabase, 'demo_data_imported', importDemoData ? 'true' : 'false')
  await upsertSetting(supabase, 'demo_data_locale', importDemoData ? locale : '')
  await upsertSetting(supabase, 'initialized_at', new Date().toISOString())
  await appendInitializationLog(supabase, 'initialize', locale, importDemoData, true)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const password = formData.get('password')
  const redirectPath = safeRedirectPath(formData.get('redirect'))
  const locale = parseLocale(typeof formData.get('locale') === 'string' ? String(formData.get('locale')) : undefined)
  const importDemoData = formData.get('importDemoData') === 'true'
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', redirectPath)

  const correctPassword = getSitePassword()
  if (!correctPassword) {
    loginUrl.searchParams.set('error', 'server')
    return NextResponse.redirect(loginUrl, 303)
  }

  if (typeof password !== 'string' || password !== correctPassword) {
    loginUrl.searchParams.set('error', 'invalid')
    return NextResponse.redirect(loginUrl, 303)
  }

  try {
    await initializeIfNeeded(locale, importDemoData)
  } catch (error) {
    try {
      const supabase = createClient()
      await appendInitializationLog(
        supabase,
        'initialize',
        locale,
        importDemoData,
        false,
        error instanceof Error ? error.message : 'unknown error'
      )
    } catch {}
    loginUrl.searchParams.set('error', 'init')
    return NextResponse.redirect(loginUrl, 303)
  }

  const response = NextResponse.redirect(new URL(redirectPath, request.url), 303)
  response.cookies.set(AUTH_COOKIE_NAME, await createAuthToken(correctPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
