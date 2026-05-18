import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { moveTemporaryGoalImages } from '@/lib/utils/goalImageStorage'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  try {
    const body = await request.json()
    const {
      name, description,
      tracking_mode, target_amount, target_count,
      tracking_reward_type_id,
      reward_type_id, reward_on_complete,
      consume_on_complete,
      tracking_started_at,
      icon, color,
      event_ids,
      image_urls
    } = body

    if (!name || !tracking_mode) {
      return NextResponse.json({
        success: false,
        error: 'name and tracking_mode are required'
      }, { status: 400 })
    }

    // cumulative_amount 模式需要指定追蹤的獎勵類型
    if (tracking_mode === 'cumulative_amount' && !tracking_reward_type_id) {
      return NextResponse.json({
        success: false,
        error: 'tracking_reward_type_id is required for cumulative_amount mode'
      }, { status: 400 })
    }

    // 取得目前最大 display_order
    const { data: lastTemplate } = await supabase
      .from('goal_templates')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = (lastTemplate?.[0]?.display_order ?? 0) + 1

    // 建立模板
    const { data: template, error } = await supabase
      .from('goal_templates')
      .insert({
        name,
        description: description || null,
        tracking_mode,
        target_amount: tracking_mode === 'cumulative_amount' ? (target_amount || null) : null,
        target_count: tracking_mode === 'completion_count' ? (target_count || null) : null,
        tracking_reward_type_id: tracking_mode === 'cumulative_amount' ? tracking_reward_type_id : null,
        tracking_started_at: tracking_started_at || null,
        consume_on_complete: consume_on_complete !== undefined ? consume_on_complete : true,
        reward_type_id: reward_type_id || null,
        reward_on_complete: reward_on_complete || 0,
        icon: icon || '🎯',
        color: color || '#6a99e0',
        image_urls: image_urls || [],
        display_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    let responseTemplate = template

    const normalizedImages = await moveTemporaryGoalImages(
      adminClient,
      image_urls,
      `goal-templates/${template.id}`,
      { removeSource: true, dropMissingTemporary: true }
    )

    if (normalizedImages.changed) {
      const { data: updatedTemplate, error: imageUpdateError } = await supabase
        .from('goal_templates')
        .update({
          image_urls: normalizedImages.images,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id)
        .select()
        .single()

      if (imageUpdateError) {
        return NextResponse.json({ success: false, error: imageUpdateError.message }, { status: 500 })
      }
      if (updatedTemplate) responseTemplate = updatedTemplate
    }

    // 建立事件關聯
    if (event_ids && Array.isArray(event_ids) && event_ids.length > 0) {
      const links = event_ids.map((event_id: string) => ({
        template_id: template.id,
        event_id,
      }))

      const { error: linkError } = await supabase
        .from('goal_template_event_links')
        .insert(links)

      if (linkError) {
        console.warn('Failed to insert event links:', linkError)
      }
    }

    return NextResponse.json({ success: true, template: responseTemplate })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create goal template: ' + (err as Error).message
    }, { status: 500 })
  }
}
