import { NextResponse } from 'next/server'

/**
 * 診斷工具：檢查實際使用的 Supabase 配置
 * 用於排查是否連接到錯誤的 Supabase 專案
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // 只顯示 URL 的前後部分，隱藏中間部分以保護隱私
  const maskedUrl = supabaseUrl 
    ? `${supabaseUrl.substring(0, 20)}...${supabaseUrl.substring(supabaseUrl.length - 10)}`
    : 'NOT SET'
  
  const maskedKey = supabaseKey
    ? `${supabaseKey.substring(0, 20)}...${supabaseKey.substring(supabaseKey.length - 10)}`
    : 'NOT SET'
  
  return NextResponse.json({
    supabaseUrl: maskedUrl,
    supabaseKey: maskedKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseKey?.length || 0,
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    // 在開發環境下顯示完整 URL（不含 key）
    fullUrl: process.env.NODE_ENV === 'development' ? supabaseUrl : maskedUrl,
  })
}
