import { createAdminClient } from '@/lib/supabase/server-admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET_NAME = 'goal-images'

type SiteSettingRow = {
  key: string
  value: string | null
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const templateId = (formData.get('templateId') as string) || 'pending'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, SVG' }, { status: 400 })
    }

    // Read resource mode settings
    const supabase = createClient()
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['resource_mode', 'image_total_limit_bytes', 'image_single_file_limit_bytes'])

    const settingsMap: Record<string, string> = {}
    ;((settings || []) as SiteSettingRow[]).forEach((s) => {
      settingsMap[s.key] = s.value || ''
    })

    const resourceMode = settingsMap['resource_mode'] || 'free'
    const singleFileLimit = parseInt(settingsMap['image_single_file_limit_bytes'] || '0', 10) || 2 * 1024 * 1024
    const totalLimit = parseInt(settingsMap['image_total_limit_bytes'] || '0', 10) || 600 * 1024 * 1024

    // Check single file size limit
    if (file.size > singleFileLimit) {
      const limitMB = (singleFileLimit / (1024 * 1024)).toFixed(1)
      return NextResponse.json({
        success: false,
        error: `File size exceeds the limit of ${limitMB}MB per file`
      }, { status: 413 })
    }

    // Check total storage usage for free mode
    if (resourceMode === 'free') {
      const adminClient = createAdminClient()
      const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets()

      if (!bucketError && buckets) {
        let totalBytes = 0
        for (const bucket of buckets) {
          const { data: files } = await adminClient.storage.from(bucket.id).list()
          if (files) {
            for (const f of files) {
              const size = f.metadata?.size
              if (typeof size === 'number') totalBytes += size
            }
          }
        }

        if (totalBytes + file.size > totalLimit) {
          const usedMB = (totalBytes / (1024 * 1024)).toFixed(1)
          const limitMB = (totalLimit / (1024 * 1024)).toFixed(1)
          return NextResponse.json({
            success: false,
            error: `Storage limit reached: ${usedMB}MB / ${limitMB}MB used. Please delete some files or upgrade.`
          }, { status: 413 })
        }
      }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const uniqueId = crypto.randomUUID()
    const filePath = templateId === 'pending'
      ? `goal-templates/pending/${uniqueId}.${ext}`
      : `goal-templates/${templateId}/${uniqueId}.${ext}`

    // Upload to Supabase Storage using admin client
    const adminClient = createAdminClient()
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ success: false, error: 'Failed to upload image: ' + uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    const imageUrl = urlData?.publicUrl || ''

    // Get image dimensions by temporarily reading the buffer
    let width = 0
    let height = 0
    try {
      // For JPEG, we can parse dimensions from the header
      if (file.type === 'image/jpeg') {
        const bytes = new Uint8Array(fileBuffer)
        let i = 2
        while (i < bytes.length) {
          if (bytes[i] === 0xFF && bytes[i + 1] >= 0xC0 && bytes[i + 1] <= 0xC2) {
            height = (bytes[i + 5] << 8) + bytes[i + 6]
            width = (bytes[i + 7] << 8) + bytes[i + 8]
            break
          }
          i += 2 + ((bytes[i + 2] << 8) + bytes[i + 3])
        }
      } else if (file.type === 'image/png') {
        const bytes = new Uint8Array(fileBuffer)
        width = (bytes[16] << 24) + (bytes[17] << 16) + (bytes[18] << 8) + bytes[19]
        height = (bytes[20] << 24) + (bytes[21] << 16) + (bytes[22] << 8) + bytes[23]
      }
    } catch {
      // Ignore dimension parsing errors
    }

    return NextResponse.json({
      success: true,
      image: {
        url: imageUrl,
        path: filePath,
        size: file.size,
        width: width || undefined,
        height: height || undefined,
      }
    })
  } catch (err) {
    console.error('Upload image error:', err)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload image: ' + (err as Error).message
    }, { status: 500 })
  }
}
