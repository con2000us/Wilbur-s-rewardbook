import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/rewards/use/undo
 * 撤銷使用獎勵交易
 * Body: { transactionId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .in('transaction_type', ['use', 'spend'])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to undo use reward:', err)
    return NextResponse.json({
      error: 'Failed to undo use reward: ' + (err instanceof Error ? err.message : 'Unknown error')
    }, { status: 500 })
  }
}
