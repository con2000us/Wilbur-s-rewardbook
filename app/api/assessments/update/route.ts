import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateRewardOutputsFromRule, type CalculatedRewardItem } from '@/lib/rewardFormula'
import { insertAssessmentRewardTransactions } from '@/lib/assessments/rewardTransactions'
import { gradeToScore, gradeToPercentage } from '@/lib/gradeConverter'
import type { Database, Json } from '@/lib/supabase/types'

type AssessmentUpdate = Database['public']['Tables']['assessments']['Update']
type RewardRuleRow = Database['public']['Tables']['reward_rules']['Row']
type SubjectGradeRow = Pick<Database['public']['Tables']['subjects']['Row'], 'grade_mapping'>
type StudentIdRow = Pick<Database['public']['Tables']['students']['Row'], 'id'>
type AssessmentScoringMode = 'scored' | 'record_only'

type AssessmentWriteData = Omit<AssessmentUpdate, 'image_urls'> & {
  image_urls?: Json | null
}

type AssessmentUpdatePayload = {
  assessment_id?: string
  student_id?: string
  subject_id?: string
  title?: string
  assessment_type?: string | null
  max_score?: number | null
  due_date?: string | null
  notes?: string | null
  score_type?: string | null
  grade?: string | null
  image_urls?: Json[] | null
  scoring_mode?: string | null
  counts_toward_average?: boolean | null
  counts_toward_reward?: boolean | null
  score?: number | null
  manual_reward?: number | string | null
  reward_type_id?: string | null
}

function shouldRetryWithoutGradeColumns(error: { code?: string; message?: string } | null) {
  return Boolean(
    error?.code === 'PGRST204' &&
    (error.message?.includes('grade') || error.message?.includes('score_type'))
  )
}

function normalizeScoringMode(value: string | null | undefined, fallback: AssessmentScoringMode): AssessmentScoringMode {
  if (!value) return fallback
  if (value === 'scored' || value === 'record_only') return value
  throw new Error('INVALID_SCORING_MODE')
}

function booleanOrDefault(value: boolean | null | undefined, defaultValue: boolean) {
  return typeof value === 'boolean' ? value : defaultValue
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AssessmentUpdatePayload
    const supabase = createClient()

    if (!body.assessment_id) {
      return NextResponse.json({ error: 'assessment_id is required' }, { status: 400 })
    }

    const { data: oldAssessment } = await supabase
      .from('assessments')
      .select('id, scoring_mode, counts_toward_average, counts_toward_reward')
      .eq('id', body.assessment_id)
      .single()

    if (!oldAssessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    let scoringMode: AssessmentScoringMode
    try {
      scoringMode = normalizeScoringMode(
        body.scoring_mode,
        ((oldAssessment as { scoring_mode?: string | null }).scoring_mode as AssessmentScoringMode) || 'scored'
      )
    } catch {
      return NextResponse.json({ error: 'Invalid scoring_mode' }, { status: 400 })
    }

    const isRecordOnly = scoringMode === 'record_only'
    const countsTowardAverage = isRecordOnly
      ? false
      : booleanOrDefault(
          body.counts_toward_average,
          (oldAssessment as { counts_toward_average?: boolean | null }).counts_toward_average ?? true
        )
    const countsTowardReward = isRecordOnly
      ? false
      : booleanOrDefault(
          body.counts_toward_reward,
          (oldAssessment as { counts_toward_reward?: boolean | null }).counts_toward_reward ?? true
        )

    const updateData: AssessmentWriteData = {
      subject_id: body.subject_id,
      title: body.title,
      assessment_type: body.assessment_type,
      max_score: body.max_score || 100,
      due_date: body.due_date || null,
      notes: body.notes || null,
      score_type: isRecordOnly ? 'numeric' : body.score_type || 'numeric',
      grade: isRecordOnly ? null : body.grade || null,
      image_urls: body.image_urls || [],
      scoring_mode: scoringMode,
      counts_toward_average: countsTowardAverage,
      counts_toward_reward: countsTowardReward,
      reward_amount: 0,
    }

    let subjectGradeMapping: Json | null = null
    if (!isRecordOnly && body.subject_id) {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('grade_mapping')
        .eq('id', body.subject_id)
        .single()

      subjectGradeMapping = (subjectData as SubjectGradeRow | null)?.grade_mapping || null
    }

    let actualScore: number | null = null
    let actualPercentage: number | null = null
    let rewardItemsForTransactions: CalculatedRewardItem[] = []
    const maxScore = Number(updateData.max_score ?? 100)

    if (isRecordOnly) {
      updateData.score = null
      updateData.percentage = null
      updateData.grade = null
      updateData.status = 'completed'
      updateData.completed_date = new Date().toISOString()
      updateData.reward_amount = 0
    } else if (updateData.score_type === 'letter') {
      if (!body.grade) {
        return NextResponse.json({ error: 'grade is required for letter score type' }, { status: 400 })
      }
      actualScore = gradeToScore(body.grade, subjectGradeMapping)
      actualPercentage = gradeToPercentage(body.grade, maxScore, subjectGradeMapping)
      updateData.score = actualScore
      updateData.percentage = actualPercentage
      updateData.grade = body.grade
    } else if (updateData.score_type === 'numeric') {
      updateData.grade = null
      if (body.score !== null && body.score !== undefined) {
        actualScore = body.score
        actualPercentage = (body.score / maxScore) * 100
        updateData.score = body.score
        updateData.percentage = actualPercentage
      } else {
        updateData.score = null
        updateData.percentage = null
      }
    }

    if (!isRecordOnly && actualScore !== null && actualPercentage !== null) {
      updateData.status = 'completed'
      updateData.completed_date = new Date().toISOString()

      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Updating assessment - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('[DEBUG] Assessment ID:', body.assessment_id, 'Student ID:', body.student_id, 'Subject ID:', body.subject_id)
      }

      if (countsTowardReward) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('reward_rules')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })

        if (rulesError) {
          console.error('[ERROR] Failed to fetch reward_rules:', rulesError)
          return NextResponse.json({ error: 'Failed to fetch reward rules: ' + rulesError.message }, { status: 500 })
        }

        let rules = (rulesData as RewardRuleRow[] | null) || []
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] Fetched reward_rules count:', rules.length)
          if (rules.length > 0) {
            console.log('[DEBUG] Sample rule student_id:', rules[0].student_id, 'subject_id:', rules[0].subject_id)
          }
        }

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
          const invalidRules = Array.from(studentIdsInRules).filter((id) => !validStudentIds.has(id))

          if (invalidRules.length > 0) {
            console.error('[WARNING] Found reward_rules with student_ids not in current project:', invalidRules)
            console.error('[WARNING] This may indicate connection to wrong Supabase project!')
            rules = rules.filter((rule) => !rule.student_id || validStudentIds.has(rule.student_id))
          }
        }

        const matchedRule = findMatchingRule({
          rules,
          assessmentType: body.assessment_type,
          subjectId: body.subject_id,
          studentId: body.student_id,
          percentage: actualPercentage,
        })

        if (body.manual_reward !== null && body.manual_reward !== undefined) {
          updateData.reward_amount = Math.max(0, Math.round(Number(body.manual_reward)))
        } else if (matchedRule) {
          const rewardOutput = calculateRewardOutputsFromRule({
            ruleRewardAmount: matchedRule.reward_amount,
            ruleRewardFormula: matchedRule.reward_formula,
            ruleRewardConfig: matchedRule.reward_config,
            score: actualScore,
            percentage: actualPercentage,
            maxScore,
          })
          updateData.reward_amount = rewardOutput.rewardAmount
          rewardItemsForTransactions = rewardOutput.usesRewardConfig ? rewardOutput.rewards : []
        } else {
          updateData.reward_amount = fallbackRewardAmount(actualPercentage, rules.length > 0)
        }
      } else {
        updateData.reward_amount = 0
      }
    } else if (!isRecordOnly) {
      updateData.score = null
      updateData.percentage = null
      updateData.grade = null
      updateData.status = 'upcoming'
      updateData.completed_date = null
      updateData.reward_amount = 0
    }

    let { data: assessment, error } = await supabase
      .from('assessments')
      .update(updateData)
      .eq('id', body.assessment_id)
      .select()
      .single()

    if (shouldRetryWithoutGradeColumns(error)) {
      // PGRST204 on .single() means PostgREST couldn't serialize the response,
      // NOT that the UPDATE failed. Query for the row instead of retrying
      // with stripped columns (which would lose grade/score_type data).
      const { data: found, error: findError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', body.assessment_id)
        .single()

      if (found && !findError) {
        assessment = found
        error = null
      } else {
        // Row wasn't found or query failed — retry without grade/score_type columns.
        const fallbackData = { ...updateData }
        delete fallbackData.grade
        delete fallbackData.score_type

        const retryResult = await supabase
          .from('assessments')
          .update(fallbackData)
          .eq('id', body.assessment_id)
          .select()
          .single()

        assessment = retryResult.data
        error = retryResult.error
      }
    }

    if (error) {
      console.error('Error updating assessment:', error)
      let errorMessage = error.message
      if (error.code === 'PGRST204' && error.message.includes('grade')) {
        errorMessage = "Could not find the 'grade' column of 'assessments' in the schema cache"
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    if (!assessment) {
      return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 })
    }

    await supabase
      .from('transactions')
      .delete()
      .eq('assessment_id', body.assessment_id)

    const rewardAmount = Number(updateData.reward_amount ?? 0)
    const updatedAssessment = assessment as { id: string }

    await insertAssessmentRewardTransactions(supabase, {
      studentId: body.student_id,
      assessmentId: updatedAssessment.id,
      title: body.title,
      dueDate: body.due_date,
      rewardItems: rewardItemsForTransactions,
      legacyRewardAmount: rewardAmount,
      selectedRewardTypeId: body.reward_type_id || null,
    })

    return NextResponse.json({ success: true, data: assessment })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
