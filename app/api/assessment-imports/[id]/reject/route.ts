/**
 * POST /api/assessment-imports/[id]/reject
 *
 * Reject the AI draft. Optionally deletes the source file
 * based on ai_assessment_keep_source_file setting.
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    const supabase = createClient()

    const { data: job } = await supabase
      .from('assessment_import_jobs')
      .select('source_file_path')
      .eq('id', jobId)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data: draft, error: draftError } = await supabase
      .from('assessment_import_drafts')
      .select('id, status')
      .eq('job_id', jobId)
      .maybeSingle()

    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }

    if (draft && draft.status !== 'draft') {
      return NextResponse.json(
        { error: `Draft is already ${draft.status}` },
        { status: 400 }
      )
    }

    if (draft) {
      await supabase
        .from('assessment_import_drafts')
        .update({ status: 'rejected' })
        .eq('id', draft.id)
    }

    await supabase
      .from('assessment_import_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId)

    // Check if we should delete the source file
    const { data: keepSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'ai_assessment_keep_source_file')
      .maybeSingle()

    const keepSourceFile = keepSetting?.value === 'true'

    if (!keepSourceFile) {
      const sourceFiles = await listSourceFiles(job.source_file_path, jobId)
      if (sourceFiles.length > 0) {
        const adminClient = createAdminClient()
        await adminClient.storage
          .from('assessment-imports')
          .remove(sourceFiles)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
