import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type StudentRow = Database['public']['Tables']['students']['Row']
type StudentInsert = Database['public']['Tables']['students']['Insert']
type SubjectRow = Database['public']['Tables']['subjects']['Row']
type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
type AssessmentRow = Database['public']['Tables']['assessments']['Row']
type AssessmentInsert = Database['public']['Tables']['assessments']['Insert']
type TransactionRow = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type RewardRuleRow = Database['public']['Tables']['reward_rules']['Row']
type RewardRuleInsert = Database['public']['Tables']['reward_rules']['Insert']

type BackupRecord = Record<string, unknown>
type BackupStudent = Partial<StudentRow> & BackupRecord
type BackupSubject = Partial<SubjectRow> & BackupRecord
type BackupAssessment = Partial<AssessmentRow> & BackupRecord
type BackupTransaction = Partial<TransactionRow> & BackupRecord
type BackupRewardRule = Partial<RewardRuleRow> & BackupRecord

type StudentExportBackup = {
  version?: string
  type?: string
  student_id?: string
  data?: {
    student?: BackupStudent
    subjects?: BackupSubject[]
    assessments?: BackupAssessment[]
    transactions?: BackupTransaction[]
    reward_rules?: BackupRewardRule[]
  }
}

type ValidationResult = {
  valid: boolean
  error?: string
  details?: string
}

type ImportedAssessmentInsert = Omit<AssessmentInsert, 'subject_id'> & {
  subject_id: string | null
} & BackupRecord

function validateBackupFormat(backup: unknown): ValidationResult {
  if (!backup || typeof backup !== 'object') {
    return { valid: false, error: 'Invalid backup format', details: 'Backup data is not a valid object' }
  }

  const candidate = backup as StudentExportBackup

  if (!candidate.version) {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: 'Missing version field. This may not be a valid backup file.',
    }
  }

  if (candidate.type !== 'student_export') {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: `Expected backup type "student_export", but got "${candidate.type}".`,
    }
  }

  if (!candidate.data || typeof candidate.data !== 'object') {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: 'Missing or invalid data field. The backup file structure is incomplete.',
    }
  }

  const requiredFields = ['student', 'subjects', 'assessments', 'transactions', 'reward_rules'] as const
  const missingFields = requiredFields.filter((field) => !(field in candidate.data!))
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: `Missing required data fields: ${missingFields.join(', ')}`,
    }
  }

  if (!candidate.data.student || typeof candidate.data.student !== 'object') {
    return { valid: false, error: 'Invalid backup format', details: 'Student data is missing or invalid' }
  }

  const arrayFields = ['subjects', 'assessments', 'transactions', 'reward_rules'] as const
  const invalidArrayFields = arrayFields.filter((field) => !Array.isArray(candidate.data![field]))
  if (invalidArrayFields.length > 0) {
    return {
      valid: false,
      error: 'Invalid backup format',
      details: `These fields must be arrays: ${invalidArrayFields.join(', ')}`,
    }
  }

  return { valid: true }
}

function omitKeys<T extends BackupRecord>(obj: T, keys: string[]): Partial<T> {
  const copy: Partial<T> = { ...obj }
  for (const key of keys) {
    delete copy[key]
  }
  return copy
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function numberOrFallback(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export async function POST(req: NextRequest) {
  const supabase = createClient()

  try {
    const body = await req.json() as { backup?: unknown }
    const backupCandidate = body.backup

    const validation = validateBackupFormat(backupCandidate)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      )
    }

    const backup = backupCandidate as StudentExportBackup
    const backupData = backup.data!
    const studentData = backupData.student!
    const oldStudentId = backup.student_id || (typeof studentData.id === 'string' ? studentData.id : undefined)

    const { data: maxOrderData } = await supabase
      .from('students')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const maxOrder = maxOrderData as Pick<StudentRow, 'display_order'> | null
    const nextDisplayOrder =
      maxOrder?.display_order !== null && maxOrder?.display_order !== undefined
        ? maxOrder.display_order + 1
        : 0

    const studentToInsert: StudentInsert = {
      name: stringOrFallback(studentData.name, 'Imported student'),
      email: typeof studentData.email === 'string' ? studentData.email : null,
      avatar_url: typeof studentData.avatar_url === 'string' ? studentData.avatar_url : null,
      display_order: nextDisplayOrder,
    }

    const { data: newStudent, error: createStudentError } = await supabase
      .from('students')
      .insert(studentToInsert)
      .select()
      .single()

    if (createStudentError || !newStudent) {
      return NextResponse.json(
        { error: 'Failed to create student', details: createStudentError?.message },
        { status: 500 }
      )
    }

    const newStudentId = (newStudent as Pick<StudentRow, 'id'>).id

    const subjectsIn = backupData.subjects || []
    const oldSubjectIds = subjectsIn
      .map((subject) => subject.id)
      .filter((id): id is string => typeof id === 'string')
    const subjectsToInsert: Array<SubjectInsert & BackupRecord> = subjectsIn.map((subject) => ({
      ...omitKeys(subject, ['id', 'student_id', 'created_at', 'updated_at']),
      student_id: newStudentId,
      name: stringOrFallback(subject.name, 'Imported subject'),
    }))

    const { data: insertedSubjects, error: subjectsError } =
      subjectsToInsert.length > 0
        ? await supabase
            .from('subjects')
            .insert(subjectsToInsert)
            .select()
        : { data: [], error: null }

    if (subjectsError) {
      return NextResponse.json(
        { error: 'Failed to import subjects', details: subjectsError.message, created_student_id: newStudentId },
        { status: 500 }
      )
    }

    const insertedSubjectRows = insertedSubjects as Array<Pick<SubjectRow, 'id'>>
    const subjectIdMap = new Map<string, string>()
    if (oldSubjectIds.length > 0 && insertedSubjectRows.length === oldSubjectIds.length) {
      insertedSubjectRows.forEach((row, idx) => {
        const oldId = oldSubjectIds[idx]
        if (oldId && row.id) subjectIdMap.set(oldId, row.id)
      })
    }

    const assessmentsIn = backupData.assessments || []
    const oldAssessmentIds = assessmentsIn
      .map((assessment) => assessment.id)
      .filter((id): id is string => typeof id === 'string')
    const assessmentsToInsert: ImportedAssessmentInsert[] = assessmentsIn.map((assessment) => {
      const mappedSubjectId = typeof assessment.subject_id === 'string'
        ? subjectIdMap.get(assessment.subject_id)
        : null

      return {
        ...omitKeys(assessment, ['id', 'created_at', 'updated_at']),
        subject_id: mappedSubjectId || null,
        title: stringOrFallback(assessment.title, 'Imported assessment'),
      }
    })

    const { data: insertedAssessments, error: assessmentsError } =
      assessmentsToInsert.length > 0
        ? await supabase
            .from('assessments')
            .insert(assessmentsToInsert)
            .select()
        : { data: [], error: null }

    if (assessmentsError) {
      return NextResponse.json(
        { error: 'Failed to import assessments', details: assessmentsError.message, created_student_id: newStudentId },
        { status: 500 }
      )
    }

    const insertedAssessmentRows = insertedAssessments as Array<Pick<AssessmentRow, 'id'>>
    const assessmentIdMap = new Map<string, string>()
    if (oldAssessmentIds.length > 0 && insertedAssessmentRows.length === oldAssessmentIds.length) {
      insertedAssessmentRows.forEach((row, idx) => {
        const oldId = oldAssessmentIds[idx]
        if (oldId && row.id) assessmentIdMap.set(oldId, row.id)
      })
    }

    const transactionsIn = backupData.transactions || []
    const transactionsToInsert: Array<TransactionInsert & BackupRecord> = transactionsIn.map((transaction) => {
      const mappedAssessmentId = typeof transaction.assessment_id === 'string'
        ? assessmentIdMap.get(transaction.assessment_id)
        : null

      return {
        ...omitKeys(transaction, ['id', 'student_id', 'created_at', 'updated_at']),
        student_id: newStudentId,
        assessment_id: mappedAssessmentId || null,
        transaction_type: stringOrFallback(transaction.transaction_type, 'earn'),
        amount: numberOrFallback(transaction.amount, 0),
      }
    })

    const { error: transactionsError } =
      transactionsToInsert.length > 0
        ? await supabase
            .from('transactions')
            .insert(transactionsToInsert)
        : { error: null }

    if (transactionsError) {
      return NextResponse.json(
        { error: 'Failed to import transactions', details: transactionsError.message, created_student_id: newStudentId },
        { status: 500 }
      )
    }

    const rewardRulesIn = backupData.reward_rules || []
    const rewardRulesToInsert: Array<RewardRuleInsert & BackupRecord> = rewardRulesIn
      .filter((rule) => (oldStudentId ? rule.student_id === oldStudentId : Boolean(rule.student_id)))
      .map((rule) => {
        const mappedSubjectId = typeof rule.subject_id === 'string'
          ? subjectIdMap.get(rule.subject_id)
          : null

        return {
          ...omitKeys(rule, ['id', 'student_id', 'created_at', 'updated_at']),
          student_id: newStudentId,
          subject_id: mappedSubjectId || null,
          rule_name: stringOrFallback(rule.rule_name, 'Imported reward rule'),
        }
      })

    const { error: rewardRulesError } =
      rewardRulesToInsert.length > 0
        ? await supabase
            .from('reward_rules')
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
        subjects: insertedSubjectRows.length,
        assessments: insertedAssessmentRows.length,
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
