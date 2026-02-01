import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  try {
    const { data: types } = await supabase
      .from('custom_reward_types')
      .select('*')
      .order('created_at', { ascending: false })
    
    return NextResponse.json({ 
      success: true,
      types: types || []
    })
  } catch (error) {
    console.error('Failed to fetch custom reward types:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch custom reward types'
    }, { status: 500 })
  }
}
