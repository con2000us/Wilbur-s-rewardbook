/**
 * GET /api/assessment-imports/[id]
 *
 * Get job status, draft data, and mistake drafts.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { buildStudentContext } from '@/lib/ai/context-builder'
import {
  buildMultimodalAssessmentSystemPrompt,
  buildMultimodalAssessmentUserPrompt,
  buildTextAnalysisSystemPrompt,
  buildTextAnalysisUserPrompt,
  buildVisionSystemPrompt,
  buildVisionUserPrompt,
} from '@/lib/ai/providers/openrouter'

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const includeDebug = searchParams.get('debug') === '1'
    const locale = searchParams.get('locale') === 'en' ? 'en' : 'zh-TW'
    const detectMistakes = searchParams.get('detectMistakes') === '1' || searchParams.get('detectMistakes') === 'true'

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('assessment_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get draft if exists
    const { data: draft } = await supabase
      .from('assessment_import_drafts')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle()

    // Get mistake drafts if draft exists
    let mistakeDrafts: unknown[] = []
    if (draft) {
      const { data: mistakes } = await supabase
        .from('assessment_import_mistake_drafts')
        .select('*')
        .eq('draft_id', draft.id)
        .order('created_at', { ascending: true })

      mistakeDrafts = mistakes || []
    }

    let debug: Record<string, unknown> | null = null
    if (includeDebug) {
      const context = await buildStudentContext(job.student_id)
      const rawOcrText = typeof job.raw_ocr_text === 'string' ? job.raw_ocr_text : ''
      const sourceFiles = await listSourceFiles(job.source_file_path, job.id)
      debug = {
        source_files: sourceFiles,
        raw_ocr_text: rawOcrText,
        ai_json: job.ai_json || null,
        validated_json: job.validated_json || null,
        draft,
        mistake_drafts: mistakeDrafts,
        status_snapshot: {
          job_status: job.status,
          error_code: job.error_code,
          error_message: job.error_message,
          provider: job.provider,
          model: job.model,
          source_file_count: sourceFiles.length,
          ocr_text_length: rawOcrText.length,
          has_ai_json: Boolean(job.ai_json),
          has_validated_json: Boolean(job.validated_json),
          draft_id: draft?.id || null,
          mistake_count: mistakeDrafts.length,
        },
        context,
        prompts: {
          multimodal_system: buildMultimodalAssessmentSystemPrompt(context, locale, detectMistakes),
          multimodal_user: buildMultimodalAssessmentUserPrompt(sourceFiles.length || 1, detectMistakes),
          vision_system: buildVisionSystemPrompt(),
          vision_user: buildVisionUserPrompt('page 1'),
          text_system: buildTextAnalysisSystemPrompt(context, locale, detectMistakes),
          text_user: buildTextAnalysisUserPrompt(rawOcrText || '[OCR text not available yet]'),
        },
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        student_id: job.student_id,
        status: job.status,
        provider: job.provider,
        model: job.model,
        error_code: job.error_code,
        error_message: job.error_message,
        retry_count: job.retry_count,
        created_at: job.created_at,
        updated_at: job.updated_at,
        completed_at: job.completed_at,
        has_ocr_text: typeof job.raw_ocr_text === 'string' && job.raw_ocr_text.length > 0,
        ocr_text_length: typeof job.raw_ocr_text === 'string' ? job.raw_ocr_text.length : 0,
        has_ai_json: Boolean(job.ai_json),
        has_validated_json: Boolean(job.validated_json),
      },
      draft: draft
        ? {
            id: draft.id,
            subject_id: draft.subject_id,
            detected_subject_name: draft.detected_subject_name,
            subject_candidates: draft.subject_candidates,
            title: draft.title,
            assessment_type: draft.assessment_type,
            score: draft.score,
            max_score: draft.max_score,
            percentage: draft.percentage,
            assessment_date: draft.assessment_date,
            notes: draft.notes,
            confidence: draft.confidence,
            status: draft.status,
          }
        : null,
      mistake_drafts: mistakeDrafts,
      debug,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
