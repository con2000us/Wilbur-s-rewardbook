import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { moveTemporaryGoalImages } from '@/lib/utils/goalImageStorage'
import { NextRequest, NextResponse } from 'next/server'

type RestartPayload = {
  tracking_started_at?: string | null
  use_latest_template?: boolean
}

type GoalSource = {
  template_id: string | null
  name: string
  description: string | null
  tracking_mode: 'cumulative_amount' | 'completion_count'
  target_amount: number | null
  target_count: number | null
  tracking_reward_type_id: string | null
  reward_type_id: string | null
  reward_on_complete: number | null
  consume_on_complete: boolean | null
  icon: string | null
  color: string | null
  image_urls: Array<Record<string, unknown>> | null
  linked_event_ids?: string[] | null
}

function parseTrackingStartedAt(value: string | null | undefined) {
  if (!value) return new Date().toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const adminClient = createAdminClient()
  const { id } = await params

  try {
    const body = await request.json() as RestartPayload

    const { data: sourceGoal, error: goalError } = await supabase
      .from('student_goals')
      .select('*')
      .eq('id', id)
      .single()

    if (goalError || !sourceGoal) {
      return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 })
    }

    let source = sourceGoal as GoalSource
    let linkedEventIds = sourceGoal.linked_event_ids || []

    if (sourceGoal.template_id && body.use_latest_template !== false) {
      const { data: template, error: templateError } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('id', sourceGoal.template_id)
        .maybeSingle()

      if (!templateError && template) {
        const normalizedTemplateImages = await moveTemporaryGoalImages(
          adminClient,
          template.image_urls,
          `goal-templates/${template.id}`,
          { removeSource: true, dropMissingTemporary: true }
        )

        if (normalizedTemplateImages.changed) {
          await supabase
            .from('goal_templates')
            .update({
              image_urls: normalizedTemplateImages.images,
              updated_at: new Date().toISOString(),
            })
            .eq('id', template.id)
        }

        source = {
          ...template,
          template_id: template.id,
          image_urls: normalizedTemplateImages.images,
          linked_event_ids: [],
        } as GoalSource

        const { data: eventLinks } = await supabase
          .from('goal_template_event_links')
          .select('event_id')
          .eq('template_id', template.id)

        linkedEventIds = (eventLinks || []).map((link: { event_id: string }) => link.event_id)
      }
    }

    const { data: lastGoal } = await supabase
      .from('student_goals')
      .select('display_order')
      .eq('student_id', sourceGoal.student_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: createdGoal, error: insertError } = await supabase
      .from('student_goals')
      .insert({
        student_id: sourceGoal.student_id,
        template_id: source.template_id || sourceGoal.template_id || null,
        name: source.name,
        description: source.description || null,
        tracking_mode: source.tracking_mode,
        target_amount: source.tracking_mode === 'cumulative_amount' ? source.target_amount : null,
        target_count: source.tracking_mode === 'completion_count' ? source.target_count : null,
        tracking_reward_type_id: source.tracking_mode === 'cumulative_amount'
          ? source.tracking_reward_type_id
          : null,
        reward_type_id: source.reward_type_id || null,
        reward_on_complete: source.reward_on_complete || 0,
        consume_on_complete: source.consume_on_complete !== false,
        tracking_started_at: parseTrackingStartedAt(body.tracking_started_at),
        icon: source.icon || 'flag',
        color: source.color || '#6a99e0',
        image_urls: source.image_urls || [],
        linked_event_ids: source.tracking_mode === 'completion_count' ? linkedEventIds : [],
        current_progress: 0,
        status: 'active',
        completed_at: null,
        completion_notes: null,
        completion_images: [],
        is_active: true,
        display_order: ((lastGoal as { display_order?: number } | null)?.display_order ?? 0) + 1,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, goal: createdGoal })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to restart goal: ' + (err as Error).message,
    }, { status: 500 })
  }
}
