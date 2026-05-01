import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createClient()
    let category = body.category || null
    let rewardTypeId = body.reward_type_id || null
    let achievementEventId = body.achievement_event_id || null

    const { data: rewardTypes } = await supabase
      .from('custom_reward_types')
      .select('id, type_key, display_name, display_name_zh, display_name_en')

    if (rewardTypes && rewardTypes.length > 0) {
      // 優先以 category 反查 reward_type_id，避免編輯類別後仍沿用舊單位
      if (category) {
        const categoryLc = String(category).toLowerCase()
        const mappedType = rewardTypes.find((type: any) => {
          const displayName = type.display_name || ''
          const displayNameZh = type.display_name_zh || ''
          const displayNameEn = type.display_name_en || ''
          const typeKey = type.type_key || ''
          return (
            category === displayName ||
            category === displayNameZh ||
            category === displayNameEn ||
            categoryLc === String(typeKey).toLowerCase()
          )
        })

        if (mappedType) {
          rewardTypeId = mappedType.id
          category = mappedType.display_name || mappedType.display_name_zh || mappedType.type_key || category
        }
      }

      // 若沒有 category，才用 reward_type_id 反推 category
      if (!category && rewardTypeId) {
        const matchedById = rewardTypes.find((type: any) => type.id === rewardTypeId)
        if (matchedById) {
          category = matchedById.display_name || matchedById.display_name_zh || matchedById.type_key || null
        }
      }
    }

    // 更新交易記錄
    const { error } = await supabase
      .from('transactions')
      // @ts-ignore - Supabase type inference issue with update operations
      .update({
        reward_type_id: rewardTypeId,
        achievement_event_id: achievementEventId,
        transaction_type: body.transaction_type,
        amount: body.amount,
        description: body.description,
        category,
        transaction_date: body.transaction_date,
      })
      .eq('id', body.transaction_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

