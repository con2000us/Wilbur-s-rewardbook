import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/student-goals/recent-activity?student_id=XXX
 * 取得進行中目標的最近活動記錄
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()

  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 })
    }

    // 取得進行中的目標
    const { data: goals, error: goalsError } = await supabase
      .from('student_goals')
      .select('id, name')
      .eq('student_id', studentId)
      .neq('status', 'completed')

    if (goalsError) {
      console.error('Failed to fetch goals:', goalsError)
      return NextResponse.json({ success: true, activities: {} })
    }

    if (!goals || goals.length === 0) {
      return NextResponse.json({ success: true, activities: {} })
    }

    const activities: Record<string, { description: string; created_at: string; amount: number } | null> = {}

    for (const goal of goals) {
      try {
        // 查詢最近一筆關聯到此目標的交易
        const { data: recentTxns, error: txnError } = await supabase
          .from('transactions')
          .select('description, created_at, amount')
          .eq('student_id', studentId)
          .eq('consumed_by_goal_id', goal.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (txnError) {
          console.error(`Failed to fetch transactions for goal ${goal.id}:`, txnError)
          activities[goal.id] = null
          continue
        }

        if (recentTxns && recentTxns.length > 0) {
          activities[goal.id] = {
            description: recentTxns[0].description || '',
            created_at: recentTxns[0].created_at,
            amount: recentTxns[0].amount || 0,
          }
        } else {
          activities[goal.id] = null
        }
      } catch (innerErr) {
        console.error(`Error processing goal ${goal.id}:`, innerErr)
        activities[goal.id] = null
      }
    }

    return NextResponse.json({ success: true, activities })
  } catch (err) {
    console.error('recent-activity error:', err)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recent activity: ' + (err as Error).message
    }, { status: 500 })
  }
}
