import { createAdminClient } from '@/lib/supabase/server-admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET_NAME = 'goal-images'
const PREFIX = 'assessments'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

type UploadedImage = {
  url: string
  path: string
  size: number
  width?: number
  height?: number
}

function parseImageDimensions(buffer: ArrayBuffer, type: string): { width: number; height: number } {
  let width = 0
  let height = 0
  try {
    const bytes = new Uint8Array(buffer)
    if (type === 'image/jpeg') {
      let i = 2
      while (i < bytes.length) {
        if (bytes[i] === 0xff && bytes[i + 1] >= 0xc0 && bytes[i + 1] <= 0xc2) {
          height = (bytes[i + 5] << 8) + bytes[i + 6]
          width = (bytes[i + 7] << 8) + bytes[i + 8]
          break
        }
        i += 2 + ((bytes[i + 2] << 8) + bytes[i + 3])
      }
    } else if (type === 'image/png') {
      width = (bytes[16] << 24) + (bytes[17] << 16) + (bytes[18] << 8) + bytes[19]
      height = (bytes[20] << 24) + (bytes[21] << 16) + (bytes[22] << 8) + bytes[23]
    }
  } catch {
    // Ignore dimension parsing errors
  }
  return { width, height }
}

async function uploadSingleFile(
  file: File,
  assessmentId: string,
  singleFileLimit: number,
): Promise<UploadedImage> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, SVG`)
  }

  if (file.size > singleFileLimit) {
    const limitMB = (singleFileLimit / (1024 * 1024)).toFixed(1)
    throw new Error(`File size exceeds the limit of ${limitMB}MB per file`)
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const uniqueId = crypto.randomUUID()
  const filePath = `${PREFIX}/${assessmentId}/${uniqueId}.${ext}`

  const adminClient = createAdminClient()
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error('Failed to upload image: ' + uploadError.message)
  }

  const { data: urlData } = adminClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  const { width, height } = parseImageDimensions(fileBuffer, file.type)

  return {
    url: urlData?.publicUrl || '',
    path: filePath,
    size: file.size,
    width: width || undefined,
    height: height || undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Support both single 'file' and multiple 'files'
    const multiFiles = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File | null
    const files: File[] = multiFiles.length > 0 ? multiFiles : singleFile ? [singleFile] : []

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const assessmentId = (formData.get('assessmentId') as string) || 'pending'

    // Read resource mode settings (once for all files)
    const supabase = createClient()
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['resource_mode', 'image_total_limit_bytes', 'image_single_file_limit_bytes'])

    const settingsMap: Record<string, string> = {}
    ;(settings || []).forEach((s: Record<string, unknown>) => {
      settingsMap[s.key as string] = (s.value as string) || ''
    })

    const resourceMode = settingsMap['resource_mode'] || 'free'
    const singleFileLimit = parseInt(settingsMap['image_single_file_limit_bytes'] || '0', 10) || 2 * 1024 * 1024
    const totalLimit = parseInt(settingsMap['image_total_limit_bytes'] || '0', 10) || 600 * 1024 * 1024

    // Check total storage usage for free mode
    if (resourceMode === 'free') {
      const adminClient = createAdminClient()
      const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets()

      if (!bucketError && buckets) {
        let totalBytes = 0
        for (const bucket of buckets) {
          const { data: bucketFiles } = await adminClient.storage.from(bucket.id).list()
          if (bucketFiles) {
            for (const f of bucketFiles) {
              const size = f.metadata?.size
              if (typeof size === 'number') totalBytes += size
            }
          }
        }

        const incomingSize = files.reduce((sum, f) => sum + f.size, 0)
        if (totalBytes + incomingSize > totalLimit) {
          const usedMB = (totalBytes / (1024 * 1024)).toFixed(1)
          const limitMB = (totalLimit / (1024 * 1024)).toFixed(1)
          return NextResponse.json(
            { success: false, error: `Storage limit reached: ${usedMB}MB / ${limitMB}MB used.` },
            { status: 413 }
          )
        }
      }
    }

    // Upload all files
    const images: UploadedImage[] = []
    for (const file of files) {
      try {
        const uploaded = await uploadSingleFile(file, assessmentId, singleFileLimit)
        images.push(uploaded)
      } catch (fileError) {
        return NextResponse.json(
          { success: false, error: (fileError as Error).message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ success: true, images })
  } catch (err) {
    console.error('Assessment upload image error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to upload image: ' + (err as Error).message },
      { status: 500 }
    )
  }
}
