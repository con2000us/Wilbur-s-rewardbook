import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // 更新交易記錄
    const { error } = await supabase
      .from('transactions')
      .update({
        transaction_type: body.transaction_type,
        amount: body.amount,
        description: body.description,
        category: body.category,
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

