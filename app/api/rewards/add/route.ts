import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { studentId, rewardTypeId, amount, title, notes } = body

    if (!studentId || !rewardTypeId || !amount || amount <= 0 || !title) {
      return NextResponse.json({ 
        error: 'Student ID, reward type ID, valid amount, and title are required' 
      }, { status: 400 })
    }

    // 獲取獎勵類型
    const { data: rewardType, error: typeError } = await supabase
      .from('custom_reward_types')
      .select('*')
      .eq('id', rewardTypeId)
      .single()

    if (typeError || !rewardType) {
      return NextResponse.json({ error: 'Reward type not found' }, { status: 404 })
    }

    // 創建交易記錄（添加獎勵）
    const displayName = rewardType.display_name || rewardType.display_name_zh || rewardType.type_key
    // 將標題和備註組合為描述
    const earnDescription = notes 
      ? `${title} (${notes})`
      : title
    
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        student_id: studentId,
        assessment_id: null,
        transaction_type: 'earn',
        amount: amount, // 正數表示獲得
        description: earnDescription,
        category: displayName,
        transaction_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating earn transaction:', transactionError)
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Reward added successfully',
      transaction
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
