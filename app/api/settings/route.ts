import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - 獲取所有設定
export async function GET() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 轉換為 key-value 對象
    const settings: Record<string, string> = {}
    // @ts-ignore - Supabase type inference issue with select queries
    data?.forEach((item: any) => {
      settings[item.key] = item.value || ''
    })
    
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// POST - 更新設定
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { key, value } = body
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }
    
    // upsert - 如果存在則更新，不存在則插入
    const { data, error } = await supabase
      .from('site_settings')
      // @ts-ignore - Supabase type inference issue with upsert operations
      .upsert(
        { key, value },
        { onConflict: 'key' }
      )
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}

