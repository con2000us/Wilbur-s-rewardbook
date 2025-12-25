import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type StudentExportBackup = {
  version?: string
  type?: string
  student_id?: string
  data?: {
    student?: Record<string, any>
    subjects?: any[]
    assessments?: any[]
    transactions?: any[]
    reward_rules?: any[]
  }
}

function validateBackupFormat(backup: any): { valid: boolean; error?: string; details?: string } {
  if (!backup || typeof backup !== 'object') {
    return { valid: false, error: 'Invalid backup format', details: 'Backup data is not a valid object' }
  }

  if (!backup.version) {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: 'Missing version field. This may not be a valid backup file.',
    }
  }

  if (backup.type !== 'student_export') {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: `Expected backup type "student_export", but got "${backup.type}".`,
    }
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: 'Missing or invalid data field. The backup file structure is incomplete.',
    }
  }

  const requiredFields = ['student', 'subjects', 'assessments', 'transactions', 'reward_rules'] as const
  const missingFields = requiredFields.filter((field) => !(field in backup.data))
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: `Missing required data fields: ${missingFields.join(', ')}`,
    }
  }

  if (!backup.data.student || typeof backup.data.student !== 'object') {
    return { valid: false, error: 'Invalid backup format', details: 'Student data is missing or invalid' }
  }

  const arrayFields = ['subjects', 'assessments', 'transactions', 'reward_rules'] as const
  const invalidArrayFields = arrayFields.filter((field) => !Array.isArray(backup.data[field]))
  if (invalidArrayFields.length > 0) {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: `These fields must be arrays: ${invalidArrayFields.join(', ')}`,
    }
  }

  return { valid: true }
}

function omitKeys<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
  const copy: any = { ...obj }
  for (const k of keys) delete copy[k]
  return copy
}

export async function POST(req: NextRequest) {
  const supabase = createClient()

  try {
    const body = await req.json()
    const backup = body?.backup as StudentExportBackup

    const validation = validateBackupFormat(backup)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      )
    }

    const oldStudentId = backup.student_id || (backup.data?.student as any)?.id
    const studentData = backup.data!.student as any

    // 建立新學生（display_order 排最後）
    const { data: maxOrderData } = await supabase
      .from('students')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    // @ts-ignore - Supabase type inference issue with select queries
    const nextDisplayOrder =
      (maxOrderData as any)?.display_order !== null && (maxOrderData as any)?.display_order !== undefined
        ? (maxOrderData as any).display_order + 1
        : 0

    const { data: newStudent, error: createStudentError } = await supabase
      .from('students')
      // @ts-ignore - Supabase type inference issue with insert operations
      .insert({
        name: studentData.name,
        email: studentData.email || null,
        avatar_url: studentData.avatar_url || null,
        display_order: nextDisplayOrder,
      })
      .select()
      .single()

    if (createStudentError || !newStudent) {
      return NextResponse.json(
        { error: 'Failed to create student', details: createStudentError?.message },
        { status: 500 }
      )
    }

    const newStudentId = (newStudent as any).id as string

    // 匯入 subjects（建立 old->new subject_id 映射）
    const subjectsIn = (backup.data!.subjects || []) as any[]
    const oldSubjectIds = subjectsIn.map((s) => s?.id).filter(Boolean)
    const subjectsToInsert = subjectsIn.map((s) => ({
      ...omitKeys(s, ['id', 'student_id', 'created_at', 'updated_at']),
      student_id: newStudentId,
    }))

    const { data: insertedSubjects, error: subjectsError } =
      subjectsToInsert.length > 0
        ? await supabase
            .from('subjects')
            // @ts-ignore - Supabase type inference issue with insert operations
            .insert(subjectsToInsert)
            .select()
        : { data: [], error: null }

    if (subjectsError) {
      return NextResponse.json(
        { error: 'Failed to import subjects', details: subjectsError.message, created_student_id: newStudentId },
        { status: 500 }
      )
    }

    const subjectIdMap = new Map<string, string>()
    // 插入順序通常與輸入一致，若不一致仍以 index 對應（同一批 insert）
    if (oldSubjectIds.length > 0 && (insertedSubjects as any[])?.length === oldSubjectIds.length) {
      ;(insertedSubjects as any[]).forEach((row, idx) => {
        const oldId = oldSubjectIds[idx]
        if (oldId && row?.id) subjectIdMap.set(oldId, row.id)
      })
    }

    // 匯入 assessments（建立 old->new assessment_id 映射，並 remap subject_id）
    const assessmentsIn = (backup.data!.assessments || []) as any[]
    const oldAssessmentIds = assessmentsIn.map((a) => a?.id).filter(Boolean)
    const assessmentsToInsert = assessmentsIn.map((a) => {
      const mappedSubjectId = a.subject_id && subjectIdMap.get(a.subject_id)
      return {
        ...omitKeys(a, ['id', 'created_at', 'updated_at']),
        subject_id: mappedSubjectId || null,
      }
    })

    const { data: insertedAssessments, error: assessmentsError } =
      assessmentsToInsert.length > 0
        ? await supabase
            .from('assessments')
            // @ts-ignore - Supabase type inference issue with insert operations
            .insert(assessmentsToInsert)
            .select()
        : { data: [], error: null }

    if (assessmentsError) {
      return NextResponse.json(
        { error: 'Failed to import assessments', details: assessmentsError.message, created_student_id: newStudentId },
        { status: 500 }
      )
    }

    const assessmentIdMap = new Map<string, string>()
    if (oldAssessmentIds.length > 0 && (insertedAssessments as any[])?.length === oldAssessmentIds.length) {
      ;(insertedAssessments as any[]).forEach((row, idx) => {
        const oldId = oldAssessmentIds[idx]
        if (oldId && row?.id) assessmentIdMap.set(oldId, row.id)
      })
    }

    // 匯入 transactions（remap student_id & assessment_id）
    const transactionsIn = (backup.data!.transactions || []) as any[]
    const transactionsToInsert = transactionsIn.map((t) => {
      const mappedAssessmentId = t.assessment_id ? assessmentIdMap.get(t.assessment_id) : null
      return {
        ...omitKeys(t, ['id', 'student_id', 'created_at', 'updated_at']),
        student_id: newStudentId,
        assessment_id: mappedAssessmentId || null,
      }
    })

    const { error: transactionsError } =
      transactionsToInsert.length > 0
        ? await supabase
            .from('transactions')
            // @ts-ignore - Supabase type inference issue with insert operations
            .insert(transactionsToInsert)
        : { error: null }

    if (transactionsError) {
      return NextResponse.json(
        { error: 'Failed to import transactions', details: transactionsError.message, created_student_id: newStudentId },
        { status: 500 }
      )
    }

    // 匯入 reward_rules（只匯入學生專屬規則，並 remap student_id & subject_id）
    const rewardRulesIn = (backup.data!.reward_rules || []) as any[]
    const rewardRulesToInsert = rewardRulesIn
      .filter((r) => (oldStudentId ? r.student_id === oldStudentId : r.student_id))
      .map((r) => {
        const mappedSubjectId = r.subject_id ? subjectIdMap.get(r.subject_id) : null
        return {
          ...omitKeys(r, ['id', 'student_id', 'created_at', 'updated_at']),
          student_id: newStudentId,
          subject_id: mappedSubjectId || null,
        }
      })

    const { error: rewardRulesError } =
      rewardRulesToInsert.length > 0
        ? await supabase
            .from('reward_rules')
            // @ts-ignore - Supabase type inference issue with insert operations
            .insert(rewardRulesToInsert)
        : { error: null }

    if (rewardRulesError) {
      return NextResponse.json(
        { error: 'Failed to import reward rules', details: rewardRulesError.message, created_student_id: newStudentId },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Student created from backup successfully',
      student_id: newStudentId,
      imported: {
        subjects: (insertedSubjects as any[])?.length || 0,
        assessments: (insertedAssessments as any[])?.length || 0,
        transactions: transactionsToInsert.length,
        reward_rules: rewardRulesToInsert.length,
      },
    })
  } catch (error) {
    console.error('Student import-create error:', error)
    return NextResponse.json(
      { error: 'Failed to create student from backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


