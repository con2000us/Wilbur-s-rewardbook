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

    // 獲取學生當前的獎勵統計
    const statsResponse = await fetch(`${request.nextUrl.origin}/api/students/${studentId}/reward-stats`)
    if (!statsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch reward stats' }, { status: 500 })
    }

    const statsData = await statsResponse.json()
    if (!statsData.success || !statsData.stats) {
      return NextResponse.json({ error: 'Failed to get reward stats' }, { status: 500 })
    }

    const currentBalance = statsData.stats[rewardTypeId]?.currentBalance || 0

    // 檢查餘額是否足夠
    if (currentBalance < amount) {
      return NextResponse.json({ 
        error: `Insufficient balance. Need ${amount} ${rewardType.display_name || rewardType.display_name_zh || rewardType.type_key}, but only have ${currentBalance}` 
      }, { status: 400 })
    }

    // 創建交易記錄（使用獎勵）
    const displayName = rewardType.display_name || rewardType.display_name_zh || rewardType.type_key
    // 將標題和備註組合為描述
    const useDescription = notes 
      ? `${title} (${notes})`
      : title
    
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        student_id: studentId,
        assessment_id: null,
        transaction_type: 'use',
        amount: -amount, // 負數表示扣除
        description: useDescription,
        category: displayName,
        transaction_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating use transaction:', transactionError)
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    // 計算新的餘額
    const newBalance = currentBalance - amount

    return NextResponse.json({ 
      success: true,
      message: 'Reward used successfully',
      newBalance,
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
