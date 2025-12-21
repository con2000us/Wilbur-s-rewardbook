import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        student_id: body.student_id,
        assessment_id: body.assessment_id || null,
        transaction_type: body.transaction_type,
        amount: body.amount,
        description: body.description,
        category: body.category || null,
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

