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

    // 獲取所有交易記錄
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('student_id', studentId)

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: transactionsError.message }, { status: 500 })
    }

    // 獲取所有獎勵類型
    const { data: rewardTypes, error: typesError } = await supabase
      .from('custom_reward_types')
      .select('*')

    if (typesError) {
      console.error('Error fetching reward types:', typesError)
      return NextResponse.json({ error: typesError.message }, { status: 500 })
    }

    // 計算每個獎勵類型的統計
    const stats: Record<string, { totalEarned: number; currentBalance: number }> = {}

    // 初始化所有獎勵類型
    rewardTypes?.forEach(type => {
      stats[type.id] = {
        totalEarned: 0,
        currentBalance: 0
      }
    })

    // 處理每筆交易
    transactions?.forEach(transaction => {
      // 根據category匹配獎勵類型
      // category可能是獎勵類型的display_name或type_key
      const matchingType = rewardTypes?.find(type => {
        const displayName = type.display_name || type.display_name_zh || ''
        const typeKey = type.type_key || ''
        const category = transaction.category || ''
        
        return category === displayName || 
               category === typeKey || 
               category.toLowerCase().includes(typeKey.toLowerCase()) ||
               displayName.toLowerCase().includes(category.toLowerCase())
      })

      if (matchingType) {
        const typeId = matchingType.id
        const amount = Number(transaction.amount) || 0
        const absAmount = Math.abs(amount)

        // 獲得總量：只計算獲得的部分（不計算懲罰或兌換所扣除的部分）
        if (transaction.transaction_type === 'earn' || transaction.transaction_type === 'bonus') {
          stats[typeId].totalEarned += absAmount
          stats[typeId].currentBalance += absAmount
        } else if (transaction.transaction_type === 'penalty' || transaction.transaction_type === 'spend') {
          // 扣除的部分（不計入獲得總量，但會從現有量扣除）
          stats[typeId].currentBalance -= absAmount
        } else if (transaction.transaction_type === 'reset') {
          // reset會重置為指定值
          // 如果amount是正數，表示重置到該值
          if (amount > 0) {
            stats[typeId].currentBalance = amount
          }
        } else {
          // 其他情況，根據amount的正負來處理
          if (amount > 0) {
            stats[typeId].totalEarned += amount
            stats[typeId].currentBalance += amount
          } else {
            stats[typeId].currentBalance += amount // amount已經是負數
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true,
      stats 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
