import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()

  try {
    const { data: rules, error } = await supabase
      .from('exchange_rules')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to fetch exchange rules'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rules: rules || []
    })
  } catch (error) {
    console.error('Failed to fetch exchange rules:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch exchange rules: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
