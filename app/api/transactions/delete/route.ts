import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type DeleteTransactionPayload = {
  transaction_id?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as DeleteTransactionPayload
    const supabase = createClient()

    if (!body.transaction_id) {
      return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', body.transaction_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted_transaction_ids: [body.transaction_id],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
