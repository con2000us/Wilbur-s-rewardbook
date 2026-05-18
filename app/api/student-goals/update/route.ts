import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { NextRequest, NextResponse } from 'next/server'

type StudentGoalUpdates = {
  name?: string
  description?: string | null
  tracking_mode?: 'cumulative_amount' | 'completion_count'
  target_amount?: number | null
  target_count?: number | null
  tracking_reward_type_id?: string | null
  reward_type_id?: string | null
  reward_on_complete?: number
  consume_on_complete?: boolean
  icon?: string
  color?: string
  image_urls?: Array<Record<string, unknown>>
  linked_event_ids?: string[]
  tracking_started_at?: string | null
  template_id?: string | null
  is_active?: boolean
  display_order?: number
  updated_at?: string
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  try {
    const body = await request.json() as StudentGoalUpdates & { id?: string }
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing goal id' }, { status: 400 })
    }

    const updateData: StudentGoalUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // 若 tracking_started_at 為空字串，轉為 null（代表不限制起算時間）
    if (updateData.tracking_started_at === '') {
      updateData.tracking_started_at = null
    }

    // 若 reward_type_id 為空字串，轉為 null（代表無額外獎勵）
    if (updateData.reward_type_id === '') {
      updateData.reward_type_id = null
    }

    if (updateData.template_id === '') {
      updateData.template_id = null
    }

    // 搬移暫存圖片到正確的目標目錄
    if (updateData.image_urls && Array.isArray(updateData.image_urls) && updateData.image_urls.length > 0) {
      const movedUrls: Array<Record<string, unknown>> = []
      for (const img of updateData.image_urls) {
        const oldPath = (img as any).path || ''
        if (oldPath && (oldPath.startsWith('student-goals/temp/') || oldPath.startsWith('pending/'))) {
          const fileName = oldPath.split('/').pop() || ''
          const newPath = `student-goals/${id}/${fileName}`
          const newUrl = adminClient.storage.from('goal-images').getPublicUrl(newPath).data?.publicUrl || ''

          const { data: existingFile } = await adminClient.storage
            .from('goal-images')
            .list(`student-goals/${id}`, { limit: 1, search: fileName })

          if (!existingFile || existingFile.length === 0) {
            const { data: fileData } = await adminClient.storage
              .from('goal-images')
              .download(oldPath)

            if (fileData) {
              await adminClient.storage
                .from('goal-images')
                .upload(newPath, fileData, { contentType: fileData.type || 'image/png', upsert: true })
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
      updateData.image_urls = movedUrls
    }

    const { data: goal, error } = await supabase
      .from('student_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, goal })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update student goal: ' + (err as Error).message
    }, { status: 500 })
  }
}
