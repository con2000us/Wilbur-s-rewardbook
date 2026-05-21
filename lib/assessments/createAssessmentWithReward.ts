import { calculateRewardFromRule } from '@/lib/rewardFormula'
import { gradeToPercentage, gradeToScore } from '@/lib/gradeConverter'
import type { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/types'

type AssessmentInsert = Database['public']['Tables']['assessments']['Insert']
type RewardRuleRow = Database['public']['Tables']['reward_rules']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type SubjectGradeRow = Pick<Database['public']['Tables']['subjects']['Row'], 'grade_mapping'>
type StudentIdRow = Pick<Database['public']['Tables']['students']['Row'], 'id'>
type RewardTypeLookup = Pick<Database['public']['Tables']['custom_reward_types']['Row'], 'id' | 'display_name' | 'type_key'>

type SupabaseClientLike = ReturnType<typeof createClient>

type AssessmentWriteData = AssessmentInsert & {
  image_urls?: unknown[]
}

export type AssessmentCreatePayload = {
  student_id?: string
  subject_id?: string
  title?: string
  assessment_type?: string | null
  max_score?: number | null
  status?: string | null
  due_date?: string | null
  notes?: string | null
  score_type?: string | null
  grade?: string | null
  image_urls?: unknown[]
  score?: number | null
  manual_reward?: number | string | null
  reward_type_id?: string | null
}

export class AssessmentCreateError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AssessmentCreateError'
    this.status = status
  }
}

function shouldRetryWithoutGradeColumns(error: { code?: string; message?: string } | null) {
  return Boolean(
    error?.code === 'PGRST204' &&
    (error.message?.includes('grade') || error.message?.includes('score_type'))
  )
}

function fallbackRewardAmount(percentage: number, hasRules: boolean) {
  if (hasRules) return 0
  if (percentage >= 100) return 30
  if (percentage >= 90) return 10
  if (percentage >= 80) return 5
  return 0
}

function sortRules(ruleList: RewardRuleRow[]) {
  return [...ruleList].sort((a, b) => {
    const orderA = a.display_order ?? a.priority ?? 0
    const orderB = b.display_order ?? b.priority ?? 0
    return orderA - orderB
  })
}

function findMatchingRule(params: {
  rules: RewardRuleRow[]
  assessmentType?: string | null
  subjectId?: string
  studentId?: string
  percentage: number
}) {
  const { rules, assessmentType, subjectId, studentId, percentage } = params
  const typeFilteredRules = rules.filter((rule) => !rule.assessment_type || rule.assessment_type === assessmentType)

  const subjectStudentRules = typeFilteredRules.filter((rule) => rule.subject_id === subjectId && rule.student_id === studentId)
  const subjectGlobalRules = typeFilteredRules.filter((rule) => rule.subject_id === subjectId && !rule.student_id)
  const studentGlobalRules = typeFilteredRules.filter((rule) => !rule.subject_id && rule.student_id === studentId)
  const globalRules = typeFilteredRules.filter((rule) => !rule.subject_id && !rule.student_id)

  const orderedRules = [
    ...sortRules(subjectStudentRules),
    ...sortRules(subjectGlobalRules),
    ...sortRules(studentGlobalRules),
    ...sortRules(globalRules),
  ]

  return orderedRules.find((rule) => {
    if (rule.condition === 'perfect_score') return percentage === 100
    if (rule.condition === 'score_equals') return percentage === rule.min_score
    if (rule.condition === 'score_range') {
      const min = rule.min_score !== null ? rule.min_score : 0
      const max = rule.max_score !== null ? rule.max_score : 100
      return percentage >= min && percentage <= max
    }
    return false
  }) || null
}

export async function createAssessmentWithReward(
  supabase: SupabaseClientLike,
  body: AssessmentCreatePayload
) {
  if (!body.subject_id || !body.title) {
    throw new AssessmentCreateError('subject_id and title are required', 400)
  }

  const assessmentData: AssessmentWriteData = {
    subject_id: body.subject_id,
    title: body.title,
    assessment_type: body.assessment_type,
    max_score: body.max_score || 100,
    status: body.status || 'upcoming',
    due_date: body.due_date || null,
    notes: body.notes || null,
    score_type: body.score_type || 'numeric',
    grade: body.grade || null,
    image_urls: body.image_urls || [],
  }

  const { data: subjectData } = await supabase
    .from('subjects')
    .select('grade_mapping')
    .eq('id', body.subject_id)
    .single()

  const subjectGradeMapping = (subjectData as SubjectGradeRow | null)?.grade_mapping || null
  let actualScore: number | null = null
  let actualPercentage: number | null = null
  const maxScore = Number(assessmentData.max_score ?? 100)

  if (assessmentData.score_type === 'letter') {
    if (!body.grade) {
      throw new AssessmentCreateError('grade is required for letter score type', 400)
    }
    actualScore = gradeToScore(body.grade, subjectGradeMapping as Json | null)
    actualPercentage = gradeToPercentage(body.grade, maxScore, subjectGradeMapping as Json | null)
    assessmentData.score = actualScore
    assessmentData.percentage = actualPercentage
    assessmentData.grade = body.grade
  } else if (assessmentData.score_type === 'numeric' && body.score !== null && body.score !== undefined) {
    actualScore = Number(body.score)
    actualPercentage = (actualScore / maxScore) * 100
    assessmentData.score = actualScore
    assessmentData.percentage = actualPercentage
    assessmentData.grade = null
  }

  if (actualScore !== null && actualPercentage !== null) {
    assessmentData.status = 'completed'
    assessmentData.completed_date = new Date().toISOString()

    const { data: rulesData, error: rulesError } = await supabase
      .from('reward_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (rulesError) {
      throw new AssessmentCreateError('Failed to fetch reward rules: ' + rulesError.message, 500)
    }

    let rules = (rulesData as RewardRuleRow[] | null) || []
    const studentIdsInRules = new Set(
      rules
        .map((rule) => rule.student_id)
        .filter((id): id is string => id !== null && id !== undefined)
    )

    if (studentIdsInRules.size > 0) {
      const { data: validStudents } = await supabase
        .from('students')
        .select('id')
        .in('id', Array.from(studentIdsInRules))

      const validStudentIds = new Set(
        ((validStudents as StudentIdRow[] | null) || []).map((student) => student.id)
      )
      rules = rules.filter((rule) => !rule.student_id || validStudentIds.has(rule.student_id))
    }

    const matchedRule = findMatchingRule({
      rules,
      assessmentType: body.assessment_type,
      subjectId: body.subject_id,
      studentId: body.student_id,
      percentage: actualPercentage,
    })

    if (body.manual_reward !== null && body.manual_reward !== undefined) {
      assessmentData.reward_amount = Math.max(0, Math.round(Number(body.manual_reward)))
    } else if (matchedRule) {
      assessmentData.reward_amount = calculateRewardFromRule({
        ruleRewardAmount: matchedRule.reward_amount,
        ruleRewardFormula: matchedRule.reward_formula,
        score: actualScore,
        percentage: actualPercentage,
        maxScore,
      })
    } else {
      assessmentData.reward_amount = fallbackRewardAmount(actualPercentage, rules.length > 0)
    }
  }

  let { data: assessment, error } = await supabase
    .from('assessments')
    .insert(assessmentData)
    .select()
    .single()

  if (shouldRetryWithoutGradeColumns(error)) {
    const fallbackData = { ...assessmentData }
    delete fallbackData.grade
    delete fallbackData.score_type

    const retryResult = await supabase
      .from('assessments')
      .insert(fallbackData)
      .select()
      .single()

    assessment = retryResult.data
    error = retryResult.error
  }

  if (error) {
    let errorMessage = error.message
    if (error.code === 'PGRST204' && error.message.includes('grade')) {
      errorMessage = "Could not find the 'grade' column of 'assessments' in the schema cache"
    }
    throw new AssessmentCreateError(errorMessage, 500)
  }

  if (!assessment) {
    throw new AssessmentCreateError('Failed to create assessment', 500)
  }

  const selectedRewardTypeId = body.reward_type_id || null
  let selectedRewardType: RewardTypeLookup | null = null

  if (selectedRewardTypeId) {
    const { data } = await supabase
      .from('custom_reward_types')
      .select('id, display_name, type_key')
      .eq('id', selectedRewardTypeId)
      .single()
    selectedRewardType = data as RewardTypeLookup | null
  }

  const { data: moneyRewardTypeData } = await supabase
    .from('custom_reward_types')
    .select('id, display_name, type_key')
    .eq('type_key', 'money')
    .single()

  const moneyRewardType = moneyRewardTypeData as RewardTypeLookup | null
  const targetRewardType = selectedRewardType || moneyRewardType
  const rewardCategoryName = targetRewardType?.display_name || 'Reward'
  const rewardAmount = Number(assessmentData.reward_amount ?? 0)
  const createdAssessment = assessment as { id: string }
  let transaction: unknown = null

  if (rewardAmount > 0 && body.student_id) {
    const transactionToInsert: TransactionInsert = {
      student_id: body.student_id,
      assessment_id: createdAssessment.id,
      reward_type_id: targetRewardType?.id || null,
      achievement_event_id: null,
      transaction_type: 'earn',
      amount: rewardAmount,
      description: `${body.title} - ${rewardCategoryName}`,
      category: rewardCategoryName,
      transaction_date: body.due_date || new Date().toISOString().split('T')[0],
    }

    const { data } = await supabase
      .from('transactions')
      .insert(transactionToInsert)
      .select()
      .single()
    transaction = data
  }

  return {
    assessment,
    rewardAmount,
    transaction,
  }
}
