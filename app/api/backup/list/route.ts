import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - 列出所有備份
export async function GET() {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('backups')
      .select('id, name, description, file_size, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing backups:', error)
      return NextResponse.json(
        { error: 'Failed to list backups', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      backups: data || []
    })
  } catch (error) {
    console.error('List backups error:', error)
    return NextResponse.json(
      { error: 'Failed to list backups', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

