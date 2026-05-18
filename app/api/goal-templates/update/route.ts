import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { moveTemporaryGoalImages } from '@/lib/utils/goalImageStorage'
import { NextRequest, NextResponse } from 'next/server'

type GoalTemplateUpdate = {
  updated_at: string
  name?: string
  description?: string | null
  tracking_mode?: 'cumulative_amount' | 'completion_count'
  target_amount?: number | null
  target_count?: number | null
  tracking_reward_type_id?: string | null
  reward_type_id?: string | null
  reward_on_complete?: number
  consume_on_complete?: boolean
  tracking_started_at?: string | null
  icon?: string
  color?: string
  is_active?: boolean
  display_order?: number
  image_urls?: Array<Record<string, unknown>>
}

type GoalTemplatePayload = Omit<GoalTemplateUpdate, 'updated_at'> & {
  id?: string
  event_ids?: string[]
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  try {
    const body = await request.json() as GoalTemplatePayload
    const { id, ...rest } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing template id' }, { status: 400 })
    }

    const {
      name, description,
      tracking_mode, target_amount, target_count,
      tracking_reward_type_id,
      reward_type_id, reward_on_complete,
      consume_on_complete,
      tracking_started_at,
      icon, color, is_active, display_order,
      event_ids,
      image_urls
    } = rest

    // 更新模板欄位（只更新有提供的）
    const updateFields: GoalTemplateUpdate = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateFields.name = name
    if (description !== undefined) updateFields.description = description
    if (tracking_mode !== undefined) updateFields.tracking_mode = tracking_mode
    if (target_amount !== undefined) updateFields.target_amount = target_amount
    if (target_count !== undefined) updateFields.target_count = target_count
    if (tracking_reward_type_id !== undefined) updateFields.tracking_reward_type_id = tracking_reward_type_id
    if (tracking_started_at !== undefined) updateFields.tracking_started_at = tracking_started_at
    if (consume_on_complete !== undefined) updateFields.consume_on_complete = consume_on_complete
    if (reward_type_id !== undefined) updateFields.reward_type_id = reward_type_id
    if (reward_on_complete !== undefined) updateFields.reward_on_complete = reward_on_complete
    if (icon !== undefined) updateFields.icon = icon
    if (color !== undefined) updateFields.color = color
    if (is_active !== undefined) updateFields.is_active = is_active
    if (display_order !== undefined) updateFields.display_order = display_order
    if (image_urls !== undefined) {
      const normalizedImages = await moveTemporaryGoalImages(
        adminClient,
        image_urls,
        `goal-templates/${id}`,
        { removeSource: true, dropMissingTemporary: true }
      )
      updateFields.image_urls = normalizedImages.images
    }

    const { error } = await supabase
      .from('goal_templates')
      .update(updateFields)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (image_urls !== undefined) {
      const { error: syncError } = await supabase
        .from('student_goals')
        .update({
          image_urls: updateFields.image_urls || [],
          updated_at: new Date().toISOString(),
        })
        .eq('template_id', id)
        .neq('status', 'completed')

      if (syncError) {
        return NextResponse.json({ success: false, error: syncError.message }, { status: 500 })
      }
    }

    // 更新事件關聯（先刪後建）
    if (event_ids !== undefined) {
      await supabase
        .from('goal_template_event_links')
        .delete()
        .eq('template_id', id)

      if (Array.isArray(event_ids) && event_ids.length > 0) {
        const links = event_ids.map((event_id: string) => ({
          template_id: id,
          event_id,
        }))

        const { error: linkError } = await supabase
          .from('goal_template_event_links')
          .insert(links)

        if (linkError) {
          console.warn('Failed to update event links:', linkError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update goal template: ' + (err as Error).message
    }, { status: 500 })
  }
}
