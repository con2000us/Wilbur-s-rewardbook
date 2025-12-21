import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 建立備份資料的共用函數
async function createBackupData(supabase: ReturnType<typeof createClient>) {
  // 匯出所有資料表（按外鍵依賴順序）
  const [
    students,
    subjects,
    assessments,
    transactions,
    rewardRules,
    siteSettings
  ] = await Promise.all([
    supabase.from('students').select('*').order('created_at'),
    supabase.from('subjects').select('*').order('order_index'),
    supabase.from('assessments').select('*').order('created_at'),
    supabase.from('transactions').select('*').order('created_at'),
    supabase.from('reward_rules').select('*').order('priority'),
    supabase.from('site_settings').select('*')
  ])

  // 檢查錯誤
  const results = [
    { table: 'students', result: students },
    { table: 'subjects', result: subjects },
    { table: 'assessments', result: assessments },
    { table: 'transactions', result: transactions },
    { table: 'reward_rules', result: rewardRules },
    { table: 'site_settings', result: siteSettings }
  ]

  const errors = results.filter(r => r.result.error)
  if (errors.length > 0) {
    throw new Error(`Failed to export some tables: ${errors.map(e => `${e.table}: ${e.result.error?.message}`).join(', ')}`)
  }

  // 建立備份物件
  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    exported_by: 'system',
    
    // 所有資料表
    tables: {
      students: students.data || [],
      subjects: subjects.data || [],
      assessments: assessments.data || [],
      transactions: transactions.data || [],
      reward_rules: rewardRules.data || [],
      site_settings: siteSettings.data || []
    },
    
    // 統計資訊
    metadata: {
      total_students: students.data?.length || 0,
      total_subjects: subjects.data?.length || 0,
      total_assessments: assessments.data?.length || 0,
      total_transactions: transactions.data?.length || 0,
      total_reward_rules: rewardRules.data?.length || 0,
      total_settings: siteSettings.data?.length || 0,
      
      // 詳細統計
      // @ts-ignore - Supabase type inference issue with select queries
      students_detail: students.data?.map((s: any) => ({
        id: s.id,
        name: s.name,
        // @ts-ignore - Supabase type inference issue with select queries
        subjects_count: subjects.data?.filter((sub: any) => sub.student_id === s.id).length || 0,
        // @ts-ignore - Supabase type inference issue with select queries
        assessments_count: assessments.data?.filter((a: any) =>
          // @ts-ignore - Supabase type inference issue with select queries
          subjects.data?.some((sub: any) => sub.id === a.subject_id && sub.student_id === s.id)
        ).length || 0,
        // @ts-ignore - Supabase type inference issue with select queries
        transactions_count: transactions.data?.filter((t: any) => t.student_id === s.id).length || 0
      })) || []
    }
  }
}

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

