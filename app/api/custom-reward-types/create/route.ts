import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type CustomRewardTypeInsert = Database['public']['Tables']['custom_reward_types']['Insert']

type CustomRewardTypeCreatePayload = {
  type_key?: string
  display_name?: string
  icon?: string
  color?: string | null
  default_unit?: string | null
  is_accumulable?: boolean
  description?: string | null
}

/**
 * 從顯示名稱自動生成 type_key
 * 例："讀書獎勵" → "reading_rewards"（英文）/ "du_shu_jiang_li"（中文拼音備用）
 * 若無 display_name 則使用 UUID
 */
function generateTypeKey(displayName: string): string {
  if (!displayName || displayName.trim() === '') {
    return 'custom_' + Math.random().toString(36).substring(2, 10)
  }

  // 嘗試移除 emoji 並 trim
  const cleaned = displayName
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}]/gu, '')
    .trim()

  if (cleaned.length === 0) {
    return 'custom_' + Math.random().toString(36).substring(2, 10)
  }

  // 檢查是否為純中文
  const hasChinese = /[\u4e00-\u9fff]/.test(cleaned)
  
  if (!hasChinese) {
    // 英文/混合：轉小寫、非字母數字替換為底線
    return cleaned
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50)
  }

  // 中文：使用拼音轉換或降級為 custom_ 後綴
  // 簡易處理：取前幾個字的 unicode code 組合成唯一 key
  const codes = cleaned
    .split('')
    .slice(0, 4)
    .map(c => c.codePointAt(0)?.toString(36) || '')
    .join('')
  return 'custom_' + codes
}

/**
 * 確保 type_key 唯一：若已存在則追加遞增數字
 */
async function ensureUniqueTypeKey(
  supabase: ReturnType<typeof createClient>,
  baseKey: string
): Promise<string> {
  let candidate = baseKey
  let suffix = 1

  while (true) {
    const { data: existing } = await supabase
      .from('custom_reward_types')
      .select('id')
      .eq('type_key', candidate)
      .maybeSingle()

    if (!existing) return candidate
    candidate = `${baseKey}_${suffix}`
    suffix++
    if (suffix > 100) {
      // 極端情況：改用亂數
      return baseKey + '_' + Math.random().toString(36).substring(2, 8)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CustomRewardTypeCreatePayload
    const supabase = createClient()
    
    const displayName = body.display_name || 'Unnamed Reward Type'

    // 自動生成 type_key（若前端未提供）
    let typeKey: string
    if (body.type_key && typeof body.type_key === 'string' && body.type_key.trim() !== '') {
      // 前端有提供 type_key（向後兼容）
      typeKey = body.type_key.trim()
    } else {
      typeKey = generateTypeKey(displayName)
    }

    // 確保唯一性
    typeKey = await ensureUniqueTypeKey(supabase, typeKey)
    
    // 构建插入数据
    const insertData: CustomRewardTypeInsert = {
      type_key: typeKey,
      icon: body.icon || '🎁',
      color: body.color || '#3b82f6',
      default_unit: body.default_unit || null,
      is_accumulable: body.is_accumulable !== false,
      display_name: displayName,
      description: body.description || null
    }

    const { data, error } = await supabase
      .from('custom_reward_types')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create custom reward type:', error)
      const errorMessage = error.message || ''
      const errorCode = error.code || ''
      const errorDetails = error.details || ''
      
      if (
        errorMessage.includes('duplicate key') ||
        errorMessage.includes('unique constraint') ||
        errorCode === '23505'
      ) {
        return NextResponse.json({ 
          success: false,
          error: `無法建立獎勵類型：識別碼衝突，請稍後再試或更換名稱。`
        }, { status: 400 })
      }
      
      if (
        errorMessage.includes('display_name') || 
        (errorMessage.includes('column') && errorMessage.includes('does not exist')) ||
        errorCode === '42703' ||
        errorDetails?.includes('display_name')
      ) {
        return NextResponse.json({ 
          success: false,
          error: `資料庫欄位缺失。請執行 migration：database/migrations/merge-reward-type-display-names.sql。錯誤：${errorMessage}`
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: false,
        error: errorMessage || 'Failed to create custom reward type'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      data
    })
  } catch (err) {
    console.error('Error creating custom reward type:', err)
    return NextResponse.json({ 
      success: false,
      error: 'Error creating custom reward type: ' + (err as Error).message
    }, { status: 500 })
  }
}
