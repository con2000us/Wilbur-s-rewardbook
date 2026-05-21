/**
 * POST /api/assessment-imports/cleanup
 *
 * Clean up expired source images from the assessment-imports bucket.
 * Uses ai_assessment_source_retention_days from site_settings (default 7).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

function getMultiImageFolder(firstPath: string | null, jobId: string) {
  if (!firstPath) return null
  const parts = firstPath.split('/')
  if (parts.length >= 3 && parts[parts.length - 2] === jobId) {
    return parts.slice(0, -1).join('/')
  }
  return null
}

async function listSourceFiles(firstPath: string | null, jobId: string) {
  if (!firstPath) return []
  const folder = getMultiImageFolder(firstPath, jobId)
  if (!folder) return [firstPath]

  const adminClient = createAdminClient()
  const { data: files, error } = await adminClient.storage
    .from('assessment-imports')
    .list(folder, {
      limit: 20,
      sortBy: { column: 'name', order: 'asc' },
    })

  if (error || !files || files.length === 0) return [firstPath]

  return files
    .filter((file) => file.name && !file.name.endsWith('/'))
    .map((file) => `${folder}/${file.name}`)
}

export async function POST() {
  try {
    const supabase = createClient()
    const adminClient = createAdminClient()

    // Read retention days from site settings
    const { data: retentionSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'ai_assessment_source_retention_days')
      .maybeSingle()

    const retentionDays = parseInt(retentionSetting?.value || '7', 10) || 7
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    // Find jobs with source files that are in terminal state and older than retention
    const { data: jobs, error: jobError } = await supabase
      .from('assessment_import_jobs')
      .select('id, source_file_path')
      .not('source_file_path', 'is', null)
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('created_at', cutoff.toISOString())

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        cleaned_jobs: 0,
        cleaned_files: 0,
        retention_days: retentionDays,
      })
    }

    // Collect all source file paths
    let totalFiles = 0
    const allPaths: string[] = []

    for (const job of jobs as Array<{ id: string; source_file_path: string | null }>) {
      const paths = await listSourceFiles(job.source_file_path, job.id)
      allPaths.push(...paths)
      totalFiles += paths.length
    }

    // Delete files from storage
    if (allPaths.length > 0) {
      // Supabase remove() supports up to 1000 paths per call
      // Split into batches of 500 for safety
      const batchSize = 500
      for (let i = 0; i < allPaths.length; i += batchSize) {
        const batch = allPaths.slice(i, i + batchSize)
        const { error: removeError } = await adminClient.storage
          .from('assessment-imports')
          .remove(batch)

        if (removeError) {
          return NextResponse.json({ error: removeError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({
      success: true,
      cleaned_jobs: jobs.length,
      cleaned_files: totalFiles,
      retention_days: retentionDays,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
