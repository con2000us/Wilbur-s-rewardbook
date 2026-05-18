import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { moveTemporaryGoalImages } from '@/lib/utils/goalImageStorage'
import { NextRequest, NextResponse } from 'next/server'

type AssignPayload = {
  template_id?: string
  student_ids?: string[]
}

type GoalTemplate = {
  id: string
  name: string
  description: string | null
  tracking_mode: 'cumulative_amount' | 'completion_count'
  target_amount: number | null
  target_count: number | null
  tracking_reward_type_id: string | null
  reward_type_id: string | null
  reward_on_complete: number
  consume_on_complete: boolean
  tracking_started_at: string | null
  icon: string | null
  color: string | null
  image_urls: Array<Record<string, unknown>> | null
}

type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isMissingTemplateIdColumn(error: SupabaseErrorLike | null | undefined) {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    text.includes('student_goals.template_id') ||
    text.includes("'template_id' column") ||
    text.includes('template_id')
  )
}

function missingTemplateIdResponse() {
  return NextResponse.json({
    success: false,
    error: '資料庫尚未新增 student_goals.template_id。請先執行 database/migrations/add-student-goal-template-link.sql。',
    migration: 'database/migrations/add-student-goal-template-link.sql',
  }, { status: 500 })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  try {
    const body = await request.json() as AssignPayload
    const templateId = body.template_id
    const studentIds = [...new Set((body.student_ids || []).filter(Boolean))]

    if (!templateId || studentIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'template_id and student_ids are required',
      }, { status: 400 })
    }

    const { data: template, error: templateError } = await supabase
      .from('goal_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({
        success: false,
        error: templateError?.message || 'Goal template not found',
      }, { status: 404 })
    }

    const typedTemplate = template as GoalTemplate
    const normalizedTemplateImages = await moveTemporaryGoalImages(
      adminClient,
      typedTemplate.image_urls,
      `goal-templates/${typedTemplate.id}`,
      { removeSource: true, dropMissingTemporary: true }
    )
    const templateImages = normalizedTemplateImages.images

    if (normalizedTemplateImages.changed) {
      await supabase
        .from('goal_templates')
        .update({
          image_urls: templateImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', typedTemplate.id)
    }

    const { data: eventLinks } = await supabase
      .from('goal_template_event_links')
      .select('event_id')
      .eq('template_id', templateId)

    const linkedEventIds = (eventLinks || []).map((link: { event_id: string }) => link.event_id)

    const { data: existingGoals, error: existingError } = await supabase
      .from('student_goals')
      .select('id, student_id')
      .eq('template_id', templateId)
      .in('student_id', studentIds)
      .neq('status', 'completed')

    if (existingError) {
      if (isMissingTemplateIdColumn(existingError)) {
        return missingTemplateIdResponse()
      }
      return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
    }

    const existingStudentIds = new Set((existingGoals || []).map((goal: { student_id: string }) => goal.student_id))
    const studentIdsToCreate = studentIds.filter((studentId) => !existingStudentIds.has(studentId))

    const rows = []
    for (const studentId of studentIdsToCreate) {
      const { data: lastGoal } = await supabase
        .from('student_goals')
        .select('display_order')
        .eq('student_id', studentId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      rows.push({
        student_id: studentId,
        template_id: templateId,
        name: typedTemplate.name,
        description: typedTemplate.description || null,
        tracking_mode: typedTemplate.tracking_mode,
        target_amount: typedTemplate.tracking_mode === 'cumulative_amount' ? typedTemplate.target_amount : null,
        target_count: typedTemplate.tracking_mode === 'completion_count' ? typedTemplate.target_count : null,
        tracking_reward_type_id: typedTemplate.tracking_mode === 'cumulative_amount'
          ? typedTemplate.tracking_reward_type_id
          : null,
        reward_type_id: typedTemplate.reward_type_id || null,
        reward_on_complete: typedTemplate.reward_on_complete || 0,
        consume_on_complete: typedTemplate.consume_on_complete !== false,
        tracking_started_at: typedTemplate.tracking_started_at || null,
        icon: typedTemplate.icon || 'flag',
        color: typedTemplate.color || '#6a99e0',
        image_urls: templateImages,
        linked_event_ids: typedTemplate.tracking_mode === 'completion_count' ? linkedEventIds : [],
        current_progress: 0,
        display_order: ((lastGoal as { display_order?: number } | null)?.display_order ?? 0) + 1,
      })
    }

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        created_goals: [],
        skipped_student_ids: studentIds,
      })
    }

    const { data: createdGoals, error: insertError } = await supabase
      .from('student_goals')
      .insert(rows)
      .select()

    if (insertError) {
      if (isMissingTemplateIdColumn(insertError)) {
        return missingTemplateIdResponse()
      }
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      created_goals: createdGoals || [],
      skipped_student_ids: studentIds.filter((studentId) => existingStudentIds.has(studentId)),
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to assign goal template: ' + (err as Error).message,
    }, { status: 500 })
  }
}
