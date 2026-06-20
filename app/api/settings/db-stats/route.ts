import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

interface DBStats {
  students: number
  assessments: number
  transactions: number
}

async function count(supabase: ReturnType<typeof createAdminClient>, table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    throw new Error(error.message)
  }
  return count ?? 0
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    const [students, assessments, transactions] = await Promise.all([
      count(supabase, 'students'),
      count(supabase, 'assessments'),
      count(supabase, 'transactions'),
    ])

    const stats: DBStats = { students, assessments, transactions }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch database stats' },
      { status: 500 }
    )
  }
}
