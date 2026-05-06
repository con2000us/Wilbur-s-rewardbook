import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()
    let category = body.category || null
    let rewardTypeId = body.reward_type_id || null
    let achievementEventId = body.achievement_event_id || null

    const { data: rewardTypes } = await supabase
      .from('custom_reward_types')
      .select('id, type_key, display_name')

    if (rewardTypes && rewardTypes.length > 0) {
      if (category) {
        const categoryLc = String(category).toLowerCase()
        const mappedType = rewardTypes.find((type: any) => {
          const displayName = type.display_name || ''
          const typeKey = type.type_key || ''
          return (
            category === displayName ||
            categoryLc === String(typeKey).toLowerCase()
          )
        })
        if (mappedType) {
          rewardTypeId = mappedType.id
          category = mappedType.display_name || mappedType.type_key || category
        }
      }

      if (!category && rewardTypeId) {
        const matchedById = rewardTypes.find((type: any) => type.id === rewardTypeId)
        if (matchedById) {
          category = matchedById.display_name || matchedById.type_key || null
        }
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        student_id: body.student_id,
        assessment_id: body.assessment_id || null,
        reward_type_id: rewardTypeId,
        achievement_event_id: achievementEventId,
        transaction_type: body.transaction_type,
        amount: body.amount,
        description: body.description,
        category,
        transaction_date: body.transaction_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: '發生錯誤：' + (err as Error).message },
      { status: 500 }
    )
  }
}

