import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale } from './lib/i18n/config'

export function proxy(request: NextRequest) {
  // 從 cookie 獲取語言設定
  const locale = request.cookies.get('NEXT_LOCALE')?.value || defaultLocale
  
  // 檢查是否已通過密碼驗證
  const isAuthenticated = request.cookies.get('site-auth')?.value === 'authenticated'
  
  // 定義公開路徑（不需要認證）
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAuthAPI = request.nextUrl.pathname.startsWith('/api/auth')
  const isPublicAsset = request.nextUrl.pathname.startsWith('/_next') ||
                        request.nextUrl.pathname.startsWith('/favicon.ico') ||
                        /\.(ico|png|jpg|jpeg|svg|css|js)$/.test(request.nextUrl.pathname)
  
  // 如果未認證且不是登入頁面或公開資源，重定向到登入頁
  if (!isAuthenticated && !isLoginPage && !isPublicAsset) {
    const loginUrl = new URL('/login', request.url)
    // 保存原始路徑以便登入後重定向
    if (request.nextUrl.pathname !== '/') {
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    }
    return NextResponse.redirect(loginUrl)
  }
  
  // 如果已認證且訪問登入頁，重定向到首頁
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  // 匹配所有路徑，但排除 API 路由、Next.js 內部文件、靜態資源
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - 靜態資源文件 (.*\\.(ico|png|jpg|jpeg|svg|css|js)$)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|css|js)$).*)',
  ]
}
