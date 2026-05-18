import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/rewards/exchange/undo
 * 撤銷兌換交易
 * Body: { deductTransactionId, receiveTransactionId? }
 * - deductTransactionId: 扣除交易 ID（必填）
 * - receiveTransactionId: 獲得交易 ID（類型對類型兌換時才需要）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { deductTransactionId, receiveTransactionId } = body

    if (!deductTransactionId) {
      return NextResponse.json({ error: 'deductTransactionId is required' }, { status: 400 })
    }

    // 刪除扣除交易
    const { error: deductError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', deductTransactionId)
      .in('transaction_type', ['exchange', 'spend'])

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 })
    }

    // 如果有獲得交易，也一併刪除
    if (receiveTransactionId) {
      const { error: receiveError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', receiveTransactionId)
        .in('transaction_type', ['exchange', 'earn'])

      if (receiveError) {
        return NextResponse.json({ error: receiveError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to undo exchange:', err)
    return NextResponse.json({
      error: 'Failed to undo exchange: ' + (err instanceof Error ? err.message : 'Unknown error')
    }, { status: 500 })
  }
}
