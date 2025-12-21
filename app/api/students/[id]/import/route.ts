import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 匯入單個學生的記錄
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()

  try {
    const body = await req.json()
    const { backup } = body

    // 驗證備份格式
    if (!backup || typeof backup !== 'object') {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: 'Backup data is not a valid object'
        },
        { status: 400 }
      )
    }

    if (!backup.version) {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: 'Missing version field. This may not be a valid backup file.'
        },
        { status: 400 }
      )
    }

    if (backup.type !== 'student_export') {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: `Expected backup type "student_export", but got "${backup.type}". This file may be a full site backup, not a student-specific backup.`
        },
        { status: 400 }
      )
    }

    if (!backup.data || typeof backup.data !== 'object') {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: 'Missing or invalid data field. The backup file structure is incomplete.'
        },
        { status: 400 }
      )
    }

    // 檢查必要的資料欄位
    const requiredFields = ['student', 'subjects', 'assessments', 'transactions', 'reward_rules']
    const missingFields = requiredFields.filter(field => !(field in backup.data))
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: `Missing required data fields: ${missingFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    // 驗證學生 ID 是否匹配
    if (backup.student_id && backup.student_id !== id) {
      return NextResponse.json(
        { 
          error: 'Student ID mismatch',
          details: `This backup belongs to student ID "${backup.student_id}", but you are trying to import it to student ID "${id}". The backup must match the current student.`
        },
        { status: 400 }
      )
    }

    // 檢查學生資料
    if (!backup.data.student || typeof backup.data.student !== 'object') {
      return NextResponse.json(
        { 
          error: 'Invalid backup format',
          details: 'Student data is missing or invalid'
        },
        { status: 400 }
      )
    }

    // 檢查學生是否存在
    const { data: existingStudent, error: studentCheckError } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', id)
      .single()

    if (studentCheckError || !existingStudent) {
      return NextResponse.json(
        { error: 'Student not found', details: studentCheckError?.message },
        { status: 404 }
      )
    }

    // 先獲取該學生現有的所有科目 ID（用於刪除）
    const { data: existingSubjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('student_id', id)
    
    const existingSubjectIds = existingSubjects?.map(s => s.id) || []
    
    // 刪除該學生現有的相關資料（按外鍵依賴順序）
    // 先刪除交易記錄
    if (existingSubjectIds.length > 0 || backup.data.transactions?.length > 0) {
      // 刪除該學生的所有交易記錄
      await supabase
        .from('transactions')
        .delete()
        .eq('student_id', id)
    }

    // 刪除評量記錄（通過科目關聯）
    if (existingSubjectIds.length > 0) {
      await supabase
        .from('assessments')
        .delete()
        .in('subject_id', existingSubjectIds)
    }

    // 刪除獎勵規則（只刪除該學生的專屬規則）
    await supabase
      .from('reward_rules')
      .delete()
      .eq('student_id', id)

    // 刪除科目
    if (existingSubjectIds.length > 0) {
      await supabase
        .from('subjects')
        .delete()
        .in('id', existingSubjectIds)
    }

    // 按順序插入資料（考慮外鍵依賴）
    const results = {
      // 更新學生資料（如果備份中有）
      student: backup.data.student
        ? await supabase
            .from('students')
            .update({
              name: backup.data.student.name,
              email: backup.data.student.email || null,
              avatar_url: backup.data.student.avatar_url || null,
              display_order: backup.data.student.display_order || 0
            })
            .eq('id', id)
            .select()
        : { data: [existingStudent], error: null },
      
      // 插入科目
      subjects: backup.data.subjects && backup.data.subjects.length > 0
        ? await supabase
            .from('subjects')
            .insert(backup.data.subjects.map((s: any) => ({
              ...s,
              student_id: id // 確保 student_id 正確
            })))
            .select()
        : { data: [], error: null },
      
      // 插入評量
      assessments: backup.data.assessments && backup.data.assessments.length > 0
        ? await supabase
            .from('assessments')
            .insert(backup.data.assessments)
            .select()
        : { data: [], error: null },
      
      // 插入交易記錄
      transactions: backup.data.transactions && backup.data.transactions.length > 0
        ? await supabase
            .from('transactions')
            .insert(backup.data.transactions.map((t: any) => ({
              ...t,
              student_id: id // 確保 student_id 正確
            })))
            .select()
        : { data: [], error: null },
      
      // 插入獎勵規則（只插入該學生的專屬規則）
      reward_rules: backup.data.reward_rules && backup.data.reward_rules.length > 0
        ? await supabase
            .from('reward_rules')
            .upsert(
              backup.data.reward_rules
                .filter((r: any) => r.student_id === id || r.student_id === null)
                .map((r: any) => ({
                  ...r,
                  student_id: r.student_id === id ? id : null // 確保 student_id 正確
                })),
              { onConflict: 'id' }
            )
            .select()
        : { data: [], error: null }
    }

    // 檢查插入錯誤
    const errors = Object.entries(results)
      .filter(([_, result]) => result.error)
      .map(([table, result]) => ({ table, error: result.error?.message }))

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Failed to import some data',
          details: errors,
          partial_success: true
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Student data imported successfully',
      imported: {
        subjects: results.subjects.data?.length || 0,
        assessments: results.assessments.data?.length || 0,
        transactions: results.transactions.data?.length || 0,
        reward_rules: results.reward_rules.data?.length || 0
      }
    })
  } catch (error) {
    console.error('Student import error:', error)
    return NextResponse.json(
      { error: 'Failed to import student data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

