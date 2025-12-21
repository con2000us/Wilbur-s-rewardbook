import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  
  try {
    const body = await req.json()
    const { backup, backup_id, mode = 'full' } = body

    let backupData = backup

    // 如果提供了 backup_id，從資料庫讀取備份
    if (backup_id && !backup) {
      const { data, error } = await supabase
        .from('backups')
        .select('backup_data')
        .eq('id', backup_id)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Backup not found', details: error?.message },
          { status: 404 }
        )
      }

      backupData = data.backup_data
    }

    // 驗證備份格式
    if (!backupData || typeof backupData !== 'object') {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: 'Backup data is not a valid object'
        },
        { status: 400 }
      )
    }

    if (!backupData.version) {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: 'Missing version field. This may not be a valid backup file.'
        },
        { status: 400 }
      )
    }

    if (!backupData.tables || typeof backupData.tables !== 'object') {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: 'Missing or invalid tables field. The backup file structure is incomplete.'
        },
        { status: 400 }
      )
    }

    // 檢查必要的資料表
    const requiredTables = ['students', 'subjects', 'assessments', 'transactions', 'reward_rules', 'site_settings']
    const missingTables = requiredTables.filter(table => !(table in backupData.tables))
    
    if (missingTables.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: `Missing required tables: ${missingTables.join(', ')}`
        },
        { status: 400 }
      )
    }

    // 檢查陣列格式
    const arrayTables = ['students', 'subjects', 'assessments', 'transactions', 'reward_rules', 'site_settings']
    const invalidArrayTables = arrayTables.filter(table => 
      !Array.isArray(backupData.tables[table])
    )
    
    if (invalidArrayTables.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: `The following tables should be arrays: ${invalidArrayTables.join(', ')}`
        },
        { status: 400 }
      )
    }

    // 完整還原：先清空所有資料表（注意外鍵順序）
    if (mode === 'full') {
      // 按外鍵依賴的相反順序刪除（使用級聯刪除，刪除 students 會自動刪除相關資料）
      // 但為了更明確和避免 RLS 問題，我們按順序刪除
      const deleteResults = await Promise.all([
        supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('assessments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('reward_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ])
      
      // 檢查刪除錯誤（警告但不阻止還原）
      const deleteErrors = deleteResults
        .map((result, index) => ({ index, error: result.error }))
        .filter(r => r.error)
      
      if (deleteErrors.length > 0) {
        console.warn('Some tables had errors during deletion:', deleteErrors)
        // 繼續執行，因為可能是 RLS 政策問題，但插入時會覆蓋
      }
    }

    // 按順序插入資料（考慮外鍵依賴）
    const results = {
      students: await supabase
        .from('students')
        .insert(backupData.tables.students || [])
        .select(),
      subjects: await supabase
        .from('subjects')
        .insert(backupData.tables.subjects || [])
        .select(),
      assessments: await supabase
        .from('assessments')
        .insert(backupData.tables.assessments || [])
        .select(),
      transactions: await supabase
        .from('transactions')
        .insert(backupData.tables.transactions || [])
        .select(),
      reward_rules: await supabase
        .from('reward_rules')
        .insert(backupData.tables.reward_rules || [])
        .select(),
      site_settings: await supabase
        .from('site_settings')
        .upsert(backupData.tables.site_settings || [], { onConflict: 'key' })
        .select()
    }

    // 檢查插入錯誤
    const errors = Object.entries(results)
      .filter(([_, result]) => result.error)
      .map(([table, result]) => ({ table, error: result.error?.message }))

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Failed to import some tables',
          details: errors,
          partial_success: true
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Backup imported successfully',
      imported: {
        students: results.students.data?.length || 0,
        subjects: results.subjects.data?.length || 0,
        assessments: results.assessments.data?.length || 0,
        transactions: results.transactions.data?.length || 0,
        reward_rules: results.reward_rules.data?.length || 0,
        site_settings: results.site_settings.data?.length || 0
      }
    })
  } catch (error) {
    console.error('Backup import error:', error)
    return NextResponse.json(
      { error: 'Failed to import backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

