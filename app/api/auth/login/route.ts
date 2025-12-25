import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // 從環境變量獲取正確的密碼
    const correctPassword = process.env.SITE_PASSWORD
    
    // 如果沒有設置密碼，使用預設密碼（僅用於開發）
    if (!correctPassword) {
      console.warn('⚠️ SITE_PASSWORD 環境變量未設置，使用預設密碼 "password"')
      const defaultPassword = 'password'
      
      if (password !== defaultPassword) {
        return NextResponse.json(
          { errorCode: 'INVALID_PASSWORD', error: '密碼錯誤' },
          { status: 401 }
        )
      }
    } else {
      // 驗證密碼
      if (password !== correctPassword) {
        return NextResponse.json(
          { errorCode: 'INVALID_PASSWORD', error: '密碼錯誤' },
          { status: 401 }
        )
      }
    }
    
    // 設置認證 cookie（30 天有效）
    const cookieStore = await cookies()
    cookieStore.set('site-auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { errorCode: 'UNKNOWN_ERROR', error: '發生錯誤' },
      { status: 500 }
    )
  }
}

