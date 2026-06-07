import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, createAuthToken, getSitePassword } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const correctPassword = getSitePassword()

    if (!correctPassword) {
      console.error('SITE_PASSWORD is required in production.')
      return NextResponse.json(
        {
          errorCode: 'SITE_PASSWORD_NOT_CONFIGURED',
          error: 'Site password is not configured.',
        },
        { status: 500 },
      )
    }

    if (typeof password !== 'string' || password !== correctPassword) {
      return NextResponse.json(
        { errorCode: 'INVALID_PASSWORD', error: 'Incorrect password.' },
        { status: 401 },
      )
    }

    const cookieStore = await cookies()
    cookieStore.set(AUTH_COOKIE_NAME, await createAuthToken(correctPassword), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { errorCode: 'UNKNOWN_ERROR', error: 'Login failed.' },
      { status: 500 },
    )
  }
}
