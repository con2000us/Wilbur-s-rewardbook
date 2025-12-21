import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - 取得特定備份的資料
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = createClient()
  const { id } = params instanceof Promise ? await params : params

  try {
    const { data, error } = await supabase
      .from('backups')
      .select('id, name, description, backup_data, file_size, created_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching backup:', error)
      return NextResponse.json(
        { error: 'Failed to fetch backup', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      backup: {
        // @ts-ignore - Supabase type inference issue with select queries
        id: data.id,
        // @ts-ignore - Supabase type inference issue with select queries
        name: data.name,
        // @ts-ignore - Supabase type inference issue with select queries
        description: data.description,
        // @ts-ignore - Supabase type inference issue with select queries
        backup_data: data.backup_data,
        // @ts-ignore - Supabase type inference issue with select queries
        file_size: data.file_size,
        // @ts-ignore - Supabase type inference issue with select queries
        created_at: data.created_at
      }
    })
  } catch (error) {
    console.error('Get backup error:', error)
    return NextResponse.json(
      { error: 'Failed to get backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - 刪除備份
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = createClient()
  const { id } = params instanceof Promise ? await params : params

  try {
    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting backup:', error)
      return NextResponse.json(
        { error: 'Failed to delete backup', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Backup deleted successfully'
    })
  } catch (error) {
    console.error('Delete backup error:', error)
    return NextResponse.json(
      { error: 'Failed to delete backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

