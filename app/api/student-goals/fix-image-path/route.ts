import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  try {
    const { goalId } = await request.json()
    if (!goalId) {
      return NextResponse.json({ success: false, error: 'goalId is required' }, { status: 400 })
    }

    // 取得目標
    const { data: goal, error: goalError } = await supabase
      .from('student_goals')
      .select('id, image_urls')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 })
    }

    const oldUrls = goal.image_urls as Array<{ url: string; path: string; size?: number }>
    if (!oldUrls || oldUrls.length === 0) {
      return NextResponse.json({ success: false, error: 'No images to fix' }, { status: 400 })
    }

    const movedUrls: Array<Record<string, unknown>> = []

    for (const img of oldUrls) {
      const oldPath = img.path || ''
      if (!oldPath) {
        movedUrls.push(img)
        continue
      }

      // 檢查是不是暫存路徑
      if (oldPath.startsWith('student-goals/temp/') || oldPath.startsWith('pending/')) {
        const fileName = oldPath.split('/').pop() || ''
        const newPath = `student-goals/${goal.id}/${fileName}`
        const newUrl = adminClient.storage.from('goal-images').getPublicUrl(newPath).data?.publicUrl || ''

        // 先檢查新路徑是否已有檔案
        const { data: existingList } = await adminClient.storage
          .from('goal-images')
          .list(`student-goals/${goal.id}`, { limit: 1, search: fileName })

        const alreadyExists = existingList && existingList.length > 0

        if (!alreadyExists) {
          // 下載舊檔案（使用 service role key 繞過 RLS）
          const { data: fileData, error: downloadError } = await adminClient.storage
            .from('goal-images')
            .download(oldPath)

          if (downloadError || !fileData) {
            // 舊檔案也不存在，保留原 URL 但記錄狀況
            movedUrls.push({ ...img, _debug: 'old file not found in storage' })
            continue
          }

          // 上傳到新路徑
          const { error: uploadError } = await adminClient.storage
            .from('goal-images')
            .upload(newPath, fileData, {
              contentType: fileData.type || 'image/png',
              upsert: true,
            })

          if (uploadError) {
            movedUrls.push(img)
            continue
          }

          // 刪除舊檔案
          await adminClient.storage.from('goal-images').remove([oldPath])
        }

        movedUrls.push({
          url: newUrl,
          path: newPath,
          size: img.size || 0,
        })
      } else if (oldPath.startsWith('student-goals/')) {
        // 已經在正確路徑
        movedUrls.push(img)
      } else {
        movedUrls.push(img)
      }
    }

    // 更新 DB
    const { error: updateError } = await supabase
      .from('student_goals')
      .update({ image_urls: movedUrls, updated_at: new Date().toISOString() })
      .eq('id', goal.id)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${movedUrls.length} image(s)`,
      images: movedUrls,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fix image path: ' + (err as Error).message,
    }, { status: 500 })
  }
}
