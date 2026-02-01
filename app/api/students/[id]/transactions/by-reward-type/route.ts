import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient()
    const { id: studentId } = await params

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // 獲取查詢參數
    const searchParams = request.nextUrl.searchParams
    const rewardTypeId = searchParams.get('rewardTypeId')
    const transactionType = searchParams.get('transactionType') // earn, use, exchange, etc.

    if (!rewardTypeId) {
      return NextResponse.json({ error: 'rewardTypeId is required' }, { status: 400 })
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

    // 獲取交易記錄
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('student_id', studentId)

    // 根據獎勵類型過濾（通過 category 欄位匹配）
    const displayName = rewardType.display_name || rewardType.display_name_zh || rewardType.type_key
    query = query.eq('category', displayName)

    // 如果指定了交易類型，則進一步過濾
    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }

    // 按時間排序（最新的在前）
    query = query.order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: transactionsError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      transactions: transactions || [],
      rewardType: {
        id: rewardType.id,
        display_name: displayName,
        type_key: rewardType.type_key
      }
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
