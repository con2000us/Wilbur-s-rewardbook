import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 獲取單個學生資料
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !student) {
      return NextResponse.json(
        { error: 'Student not found', details: error?.message },
        { status: 404 }
      )
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Get student error:', error)
    return NextResponse.json(
      { error: 'Failed to get student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

