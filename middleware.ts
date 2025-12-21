import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale } from './lib/i18n/config'

export function middleware(request: NextRequest) {
  // 從 cookie 獲取語言設定
  const locale = request.cookies.get('NEXT_LOCALE')?.value || defaultLocale
  
  // 可以在這裡添加其他邏輯
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
}

