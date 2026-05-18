import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const goalId = formData.get('goalId') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // 驗證 goal_id（可選：建立時可能還沒有 ID）
    if (goalId) {
      const { data: goal } = await supabase
        .from('student_goals')
        .select('id')
        .eq('id', goalId)
        .single()

      if (!goal) {
        return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 })
      }
    }

    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`
    const filePath = goalId
      ? `student-goals/${goalId}/${fileName}`
      : `student-goals/temp/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await adminClient.storage
      .from('goal-images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/png',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = adminClient.storage
      .from('goal-images')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      image: {
        url: urlData.publicUrl,
        path: filePath,
        size: file.size,
      },
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to upload image: ' + (err as Error).message,
    }, { status: 500 })
  }
}
