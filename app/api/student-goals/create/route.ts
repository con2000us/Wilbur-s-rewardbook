import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  try {
    const body = await request.json()
    const {
      student_id,
      name, description,
      tracking_mode, target_amount, target_count,
      tracking_reward_type_id,
      reward_type_id, reward_on_complete,
      consume_on_complete,
      icon, color,
      image_urls,
      linked_event_ids,
      tracking_started_at,
      template_id
    } = body

    if (!student_id || !name || !tracking_mode) {
      return NextResponse.json({
        success: false,
        error: 'student_id, name, and tracking_mode are required'
      }, { status: 400 })
    }

    // 取得目前最大 display_order
    const { data: lastGoal } = await supabase
      .from('student_goals')
      .select('display_order')
      .eq('student_id', student_id)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = (lastGoal?.[0]?.display_order ?? 0) + 1

    const { data: goal, error } = await supabase
      .from('student_goals')
      .insert({
        student_id,
        template_id: template_id || null,
        name,
        description: description || null,
        tracking_mode,
        target_amount: target_amount || null,
        target_count: target_count || null,
        tracking_reward_type_id: tracking_reward_type_id || null,
        reward_type_id: reward_type_id || null, // 可為空，代表無額外獎勵
        reward_on_complete: reward_on_complete || 0,
        icon: icon || '🎯',
        color: color || '#6a99e0',
        image_urls: image_urls || [],
        linked_event_ids: linked_event_ids || [],
        tracking_started_at: tracking_started_at || null, // null = 不限制起算時間
        consume_on_complete: consume_on_complete !== undefined ? consume_on_complete : true,
        current_progress: 0,
        display_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 搬移暫存圖片到正確的目標目錄
    if (goal && image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
      const movedUrls: Array<Record<string, unknown>> = []
      for (const img of image_urls) {
        const oldPath = (img as any).path || ''
        // 只處理在暫存目錄中的圖片
        if (oldPath && (oldPath.startsWith('student-goals/temp/') || oldPath.startsWith('pending/'))) {
          const fileName = oldPath.split('/').pop() || ''
          const newPath = `student-goals/${goal.id}/${fileName}`
          const newUrl = adminClient.storage.from('goal-images').getPublicUrl(newPath).data?.publicUrl || ''

          // 複製到新路徑
          const { data: existingFile } = await adminClient.storage
            .from('goal-images')
            .list(`student-goals/${goal.id}`, { limit: 1, search: fileName })

          if (!existingFile || existingFile.length === 0) {
            // 檔案不存在，從舊路徑搬移
            const { data: fileData } = await adminClient.storage
              .from('goal-images')
              .download(oldPath)

            if (fileData) {
              await adminClient.storage
                .from('goal-images')
                .upload(newPath, fileData, { contentType: fileData.type || 'image/png', upsert: true })

              // 刪除舊檔案
              await adminClient.storage.from('goal-images').remove([oldPath])
            }
          }

          movedUrls.push({
            url: newUrl,
            path: newPath,
            size: (img as any).size || 0,
          })
        } else {
          movedUrls.push(img)
        }
      }

      // 更新目標的 image_urls 為正確路徑
      await supabase
        .from('student_goals')
        .update({ image_urls: movedUrls, updated_at: new Date().toISOString() })
        .eq('id', goal.id)
    }

    return NextResponse.json({ success: true, goal })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create student goal: ' + (err as Error).message
    }, { status: 500 })
  }
}
