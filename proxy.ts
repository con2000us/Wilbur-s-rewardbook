import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, isValidAuthToken } from './lib/auth/session'
import { absoluteRequestUrl } from './lib/http/requestUrl'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthenticated = await isValidAuthToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  )
  const isLoginPage = pathname === '/login'
  const isAuthApi = pathname === '/api/auth' || pathname.startsWith('/api/auth/')
  const isPublicI18nApi = pathname === '/api/i18n/set-locale'
  const isApiRequest = pathname.startsWith('/api/')

  if (!isAuthenticated && !isLoginPage && !isAuthApi && !isPublicI18nApi) {
    if (isApiRequest) {
      return NextResponse.json(
        { errorCode: 'AUTH_REQUIRED', error: 'Authentication required.' },
        { status: 401 },
      )
    }

    const loginUrl = absoluteRequestUrl(request, '/login')
    const redirectPath = `${pathname}${request.nextUrl.search}`

    if (redirectPath !== '/') {
      loginUrl.searchParams.set('redirect', redirectPath)
    }

    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(absoluteRequestUrl(request, '/'))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|css|js|webp|avif|gif|woff2?|ttf|otf|map)$).*)',
  ],
}
