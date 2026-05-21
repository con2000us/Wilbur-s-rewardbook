/**
 * POST /api/assessment-imports
 *
 * Create an import job and upload the source image file to the private
 * assessment-imports bucket.
 *
 * Request: multipart/form-data
 *   - files: one or more image files (JPEG/PNG/WebP)
 *   - file: legacy single image file field
 *   - student_id: string
 *
 * Response: { job_id, status }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getAiFeatureStatus } from '@/lib/ai/config'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_MAX_FILE_SIZE_MB = 4
const DEFAULT_STUDENT_DAILY_LIMIT = 30
const MAX_FILES_PER_IMPORT = 6

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getTaipeiDayStartIso() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  return new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000).toISOString()
}

function sanitizeFileName(name: string) {
  return name
    .replace(/[\\/]/g, '-')
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, '_')
    .slice(0, 80) || 'upload'
}

export async function POST(request: Request) {
  try {
    // Check feature availability
    const status = await getAiFeatureStatus()
    if (!status.enabled) {
      return NextResponse.json(
        { error: status.reason || 'AI assessment import is disabled' },
        { status: 403 }
      )
    }
    if (!status.visionConfigured) {
      return NextResponse.json(
        { error: status.reason || 'No AI provider configured' },
        { status: 403 }
      )
    }
    if (status.dailyRemaining <= 0) {
      return NextResponse.json({ error: 'Daily AI import limit reached' }, { status: 429 })
    }
    if (status.monthlyRemaining <= 0) {
      return NextResponse.json({ error: 'Monthly AI import limit reached' }, { status: 429 })
    }

    const supabase = createClient()
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['ai_assessment_max_file_size_mb', 'ai_assessment_student_daily_limit'])

    const settingsMap = Object.fromEntries(
      (settings || []).map((row) => [row.key, row.value])
    )
    const maxFileSizeMb = parsePositiveInt(
      settingsMap.ai_assessment_max_file_size_mb,
      DEFAULT_MAX_FILE_SIZE_MB
    )
    const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024
    const studentDailyLimit = parsePositiveInt(
      settingsMap.ai_assessment_student_daily_limit,
      DEFAULT_STUDENT_DAILY_LIMIT
    )

    // Parse form data
    const formData = await request.formData()
    const fileEntries = [
      ...formData.getAll('files'),
      ...formData.getAll('files[]'),
      ...formData.getAll('file'),
    ].filter((entry): entry is File => entry instanceof File && entry.size > 0)
    const studentId = formData.get('student_id') as string | null

    if (fileEntries.length === 0) {
      return NextResponse.json({ error: 'At least one image file is required' }, { status: 400 })
    }
    if (!studentId) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    }
    if (fileEntries.length > MAX_FILES_PER_IMPORT) {
      return NextResponse.json(
        { error: `Too many files. Upload up to ${MAX_FILES_PER_IMPORT} images per import.` },
        { status: 400 }
      )
    }

    for (const file of fileEntries) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not supported. Use JPEG, PNG, or WebP.` },
          { status: 400 }
        )
      }

      if (file.size > maxFileSizeBytes) {
        return NextResponse.json(
          { error: `${file.name || 'File'} exceeds ${maxFileSizeMb}MB limit` },
          { status: 400 }
        )
      }
    }

    const { count: studentTodayCount } = await supabase
      .from('assessment_import_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', getTaipeiDayStartIso())

    if ((studentTodayCount || 0) >= studentDailyLimit) {
      return NextResponse.json(
        { error: `此學生今日 AI 匯入已達上限 (${studentDailyLimit}) / Student daily AI import limit reached` },
        { status: 429 }
      )
    }

    // Upload to private bucket using admin client
    const adminClient = createAdminClient()
    const jobId = crypto.randomUUID()
    const timestamp = Date.now()
    const uploadedPaths: string[] = []
    let totalSize = 0

    for (const [index, file] of fileEntries.entries()) {
      const ext = file.type.split('/')[1] || 'jpg'
      const name = sanitizeFileName(file.name || `upload-${index + 1}.${ext}`)
      const storagePath = `${studentId}/${jobId}/${String(index + 1).padStart(2, '0')}_${timestamp}_${name}`
      const fileBuffer = await file.arrayBuffer()

      const { error: uploadError } = await adminClient.storage
        .from('assessment-imports')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await adminClient.storage.from('assessment-imports').remove(uploadedPaths)
        }
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        )
      }

      uploadedPaths.push(storagePath)
      totalSize += file.size
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('assessment_import_jobs')
      .insert({
        id: jobId,
        student_id: studentId,
        source_file_path: uploadedPaths[0],
        source_file_mime: fileEntries[0]?.type || 'image/jpeg',
        source_file_size: totalSize,
        status: 'pending',
      })
      .select('id, status')
      .single()

    if (jobError) {
      await adminClient.storage.from('assessment-imports').remove(uploadedPaths)
      return NextResponse.json(
        { error: `Failed to create job: ${jobError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job_id: job.id,
      status: job.status,
      file_count: uploadedPaths.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
