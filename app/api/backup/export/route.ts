import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createBackupData } from '../_shared'

// GET - 下載備份檔案
export async function GET() {
  const supabase = createClient()

  try {
    const backup = await createBackupData(supabase)

    // 回傳 JSON 檔案下載
    const filename = `backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`
    
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Backup export error:', error)
    return NextResponse.json(
      { error: 'Failed to export backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - 保存備份到資料庫
export async function POST(req: Request) {
  const supabase = createClient()

  try {
    const body = await req.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Backup name is required' },
        { status: 400 }
      )
    }

    // 建立備份資料
    const backupData = await createBackupData(supabase)
    const backupJson = JSON.stringify(backupData)
    const fileSize = new Blob([backupJson]).size

    // 保存到資料庫
    const { data, error } = await supabase
      .from('backups')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        backup_data: backupData,
        file_size: fileSize
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving backup:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to save backup', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Backup saved successfully',
      backup: {
        // @ts-ignore - Supabase type inference issue with select queries
        id: data.id,
        // @ts-ignore - Supabase type inference issue with select queries
        name: data.name,
        // @ts-ignore - Supabase type inference issue with select queries
        description: data.description,
        // @ts-ignore - Supabase type inference issue with select queries
        file_size: data.file_size,
        // @ts-ignore - Supabase type inference issue with select queries
        created_at: data.created_at
      }
    })
  } catch (error) {
    console.error('Backup save error:', error)
    return NextResponse.json(
      { error: 'Failed to save backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

