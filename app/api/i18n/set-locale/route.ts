import { NextRequest, NextResponse } from 'next/server'
import { parseLocale } from '@/app/api/bootstrap/_shared'

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/login'
  return value
}

export function GET(request: NextRequest) {
  const locale = parseLocale(request.nextUrl.searchParams.get('locale') || undefined)
  const redirectPath = safeRedirectPath(request.nextUrl.searchParams.get('redirect'))
  const response = NextResponse.redirect(new URL(redirectPath, request.url), 303)

  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  return response
}
