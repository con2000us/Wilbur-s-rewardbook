import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { NextRequest, NextResponse } from 'next/server'

type StoredImage = {
  path?: string
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing template id' }, { status: 400 })
    }

    // 先取得模板的 image_urls，以便刪除關聯的 Storage 圖片
    const { data: template } = await supabase
      .from('goal_templates')
      .select('image_urls')
      .eq('id', id)
      .single()

    // 刪除關聯的 Storage 圖片
    if (template?.image_urls && Array.isArray(template.image_urls)) {
      const imagePaths = template.image_urls
        .filter((img: StoredImage): img is Required<StoredImage> => Boolean(img?.path))
        .map((img) => img.path)

      if (imagePaths.length > 0) {
        try {
          const adminClient = createAdminClient()
          await adminClient.storage
            .from('goal-images')
            .remove(imagePaths)
        } catch (storageErr) {
          console.warn('Failed to delete storage images for template:', id, storageErr)
        }
      }
    }

    // 刪除關聯的事件連結（CASCADE 在 DB 層級已設定，但手動刪除確保）
    await supabase
      .from('goal_template_event_links')
      .delete()
      .eq('template_id', id)

    // 刪除模板
    const { error } = await supabase
      .from('goal_templates')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to delete goal template: ' + (err as Error).message
    }, { status: 500 })
  }
}
