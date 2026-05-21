/**
 * POST /api/assessment-imports/[id]/confirm
 *
 * Confirm the parent-reviewed draft and create formal assessment,
 * reward transaction, and formal mistake records.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import {
  AssessmentCreateError,
  createAssessmentWithReward,
} from '@/lib/assessments/createAssessmentWithReward'

type MistakeInput = {
  question_number?: unknown
  student_answer?: unknown
  correct_answer?: unknown
  mistake_type?: unknown
  knowledge_point?: unknown
  ai_reason?: unknown
  confidence?: unknown
}

type ImportJobForConfirm = {
  id: string
  student_id: string
  source_file_path: string | null
  source_file_mime: string | null
  source_file_size: number | null
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function todayInTaipei() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function extensionFromMime(mime: string | null) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function mimeFromPath(path: string, fallback: string | null) {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return fallback || 'image/jpeg'
}

function getMultiImageFolder(firstPath: string | null, jobId: string) {
  if (!firstPath) return null
  const parts = firstPath.split('/')
  if (parts.length >= 3 && parts[parts.length - 2] === jobId) {
    return parts.slice(0, -1).join('/')
  }
  return null
}

function normalizeMistakes(mistakes: MistakeInput[], draftId?: string, assessmentId?: string) {
  return mistakes
    .map((mistake) => ({
      ...(draftId ? { draft_id: draftId } : {}),
      ...(assessmentId ? { assessment_id: assessmentId } : {}),
      question_number: cleanText(mistake.question_number),
      student_answer: cleanText(mistake.student_answer),
      correct_answer: cleanText(mistake.correct_answer),
      mistake_type: cleanText(mistake.mistake_type),
      knowledge_point: cleanText(mistake.knowledge_point),
      ai_reason: cleanText(mistake.ai_reason),
      confidence: cleanNumber(mistake.confidence),
    }))
    .filter((mistake) =>
      Boolean(
        mistake.question_number ||
        mistake.student_answer ||
        mistake.correct_answer ||
        mistake.mistake_type ||
        mistake.knowledge_point ||
        mistake.ai_reason
      )
    )
}

async function archiveSourceImage(job: ImportJobForConfirm, assessmentId: string) {
  if (!job.source_file_path) return []

  const adminClient = createAdminClient()
  const folder = getMultiImageFolder(job.source_file_path, job.id)
  let sourcePaths = [job.source_file_path]

  if (folder) {
    const { data: files, error: listError } = await adminClient.storage
      .from('assessment-imports')
      .list(folder, {
        limit: 20,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (!listError && files && files.length > 0) {
      sourcePaths = files
        .filter((file) => file.name && !file.name.endsWith('/'))
        .map((file) => `${folder}/${file.name}`)
    }
  }

  const archivedImages = []

  for (const [index, sourcePath] of sourcePaths.entries()) {
    const { data: sourceFile, error: downloadError } = await adminClient.storage
      .from('assessment-imports')
      .download(sourcePath)

    if (downloadError || !sourceFile) {
      throw new Error(downloadError?.message || 'Failed to download source image')
    }

    const contentType = sourceFile.type || mimeFromPath(sourcePath, job.source_file_mime)
    const fileBuffer = await sourceFile.arrayBuffer()
    const ext = extensionFromMime(contentType)
    const targetPath = `assessments/${assessmentId}/ai-import-${index + 1}-${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await adminClient.storage
      .from('goal-images')
      .upload(targetPath, fileBuffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data: urlData } = adminClient.storage
      .from('goal-images')
      .getPublicUrl(targetPath)

    archivedImages.push({
      url: urlData.publicUrl,
      path: targetPath,
      size: sourceFile.size || 0,
    })
  }

  return archivedImages
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    const supabase = createClient()
    const body = await request.json().catch(() => ({}))

    const { data: draft, error: draftError } = await supabase
      .from('assessment_import_drafts')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (draft.status === 'confirmed') {
      return NextResponse.json({ error: 'Draft already confirmed' }, { status: 400 })
    }

    if (draft.status === 'rejected') {
      return NextResponse.json({ error: 'Draft has been rejected' }, { status: 400 })
    }

    const effectiveDraft = {
      ...draft,
      subject_id: 'subject_id' in body ? body.subject_id || null : draft.subject_id,
      title: 'title' in body ? cleanText(body.title) : draft.title,
      assessment_type: 'assessment_type' in body ? body.assessment_type || null : draft.assessment_type,
      score: 'score' in body ? cleanNumber(body.score) : draft.score,
      max_score: 'max_score' in body ? cleanNumber(body.max_score) || 100 : draft.max_score,
      assessment_date: 'assessment_date' in body
        ? body.assessment_date || todayInTaipei()
        : draft.assessment_date || todayInTaipei(),
      notes: 'notes' in body ? cleanText(body.notes) : draft.notes,
    }

    if (!effectiveDraft.subject_id) {
      return NextResponse.json(
        {
          error: 'Subject is required. Please select a subject before confirming.',
          code: 'MISSING_SUBJECT',
        },
        { status: 400 }
      )
    }

    const { data: job } = await supabase
      .from('assessment_import_jobs')
      .select('id, student_id, source_file_path, source_file_mime, source_file_size')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data: subject } = await supabase
      .from('subjects')
      .select('id, student_id')
      .eq('id', effectiveDraft.subject_id)
      .single()

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 400 })
    }

    if (subject.student_id && subject.student_id !== job.student_id) {
      return NextResponse.json({ error: 'Subject does not belong to this student' }, { status: 400 })
    }

    const draftUpdates = {
      subject_id: effectiveDraft.subject_id,
      title: effectiveDraft.title,
      assessment_type: effectiveDraft.assessment_type,
      score: effectiveDraft.score,
      max_score: effectiveDraft.max_score,
      percentage: effectiveDraft.score != null && effectiveDraft.max_score
        ? Math.round((Number(effectiveDraft.score) / Number(effectiveDraft.max_score)) * 10000) / 100
        : null,
      assessment_date: effectiveDraft.assessment_date,
      notes: effectiveDraft.notes,
    }

    await supabase
      .from('assessment_import_drafts')
      .update(draftUpdates)
      .eq('id', draft.id)

    if (Array.isArray(body.mistakes)) {
      const mistakeDrafts = normalizeMistakes(body.mistakes, draft.id)

      const { error: deleteError } = await supabase
        .from('assessment_import_mistake_drafts')
        .delete()
        .eq('draft_id', draft.id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      if (mistakeDrafts.length > 0) {
        const { error: insertError } = await supabase
          .from('assessment_import_mistake_drafts')
          .insert(mistakeDrafts)

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    }

    const created = await createAssessmentWithReward(supabase, {
      student_id: job.student_id,
      subject_id: effectiveDraft.subject_id,
      title: effectiveDraft.title || 'AI Imported Assessment',
      assessment_type: effectiveDraft.assessment_type,
      score: effectiveDraft.score,
      max_score: effectiveDraft.max_score || 100,
      due_date: effectiveDraft.assessment_date,
      notes: effectiveDraft.notes,
      score_type: 'numeric',
      manual_reward: body.manual_reward,
      reward_type_id: body.reward_type_id || null,
      image_urls: [],
    })

    const assessment = created.assessment as { id: string }
    let imageArchiveError: string | null = null

    try {
      const archivedImages = await archiveSourceImage(job as ImportJobForConfirm, assessment.id)
      if (archivedImages.length > 0) {
        await supabase
          .from('assessments')
          .update({ image_urls: archivedImages })
          .eq('id', assessment.id)
      }
    } catch (error) {
      imageArchiveError = error instanceof Error ? error.message : 'Failed to archive source image'
    }

    // Fire-and-forget: clean up expired source images from previous imports
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/assessment-imports/cleanup`, {
      method: 'POST',
    }).catch(() => {})

    const { data: finalMistakeDrafts } = await supabase
      .from('assessment_import_mistake_drafts')
      .select('*')
      .eq('draft_id', draft.id)
      .order('created_at', { ascending: true })

    const formalMistakes = normalizeMistakes(
      (finalMistakeDrafts || []) as MistakeInput[],
      undefined,
      assessment.id
    )

    if (formalMistakes.length > 0) {
      const { error: mistakesError } = await supabase
        .from('assessment_mistakes')
        .insert(formalMistakes)

      if (mistakesError) {
        return NextResponse.json({ error: mistakesError.message }, { status: 500 })
      }
    }

    await supabase
      .from('assessment_import_drafts')
      .update({ status: 'confirmed' })
      .eq('id', draft.id)

    await supabase
      .from('assessment_import_jobs')
      .update({ status: 'completed' })
      .eq('id', jobId)

    return NextResponse.json({
      success: true,
      assessment_id: assessment.id,
      reward_amount: created.rewardAmount,
      mistake_count: formalMistakes.length,
      image_archive_error: imageArchiveError,
    })
  } catch (error) {
    if (error instanceof AssessmentCreateError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
