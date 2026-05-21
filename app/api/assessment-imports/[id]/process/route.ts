/**
 * POST /api/assessment-imports/[id]/process
 *
 * AI processing supports two modes:
 *   - multimodal: image(s) → structured JSON directly
 *   - pipeline: image(s) → OCR text → structured JSON
 *
 * Idempotent: won't re-process already completed/cancelled jobs.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { loadAiServiceConfig, getAiFeatureStatus } from '@/lib/ai/config'
import { OpenRouterProvider } from '@/lib/ai/providers/openrouter'
import { buildStudentContext } from '@/lib/ai/context-builder'
import type { AssessmentImageInput, AssessmentJsonOutput, ExtractResult, VisionResult } from '@/lib/ai/types'

type CandidateSubject = {
  id: string
  name: string
}

type ImportJob = {
  id: string
  student_id: string
  source_file_path: string | null
  source_file_mime: string | null
  source_file_size: number | null
  status: string
  retry_count: number | null
}

type SourceImage = AssessmentImageInput & {
  path: string
  size: number
  label: string
}

type OcrPageResult = {
  image: SourceImage
  result: VisionResult
}

const SUBJECT_ALIAS_TARGETS: Record<string, string[]> = {
  '社會': ['生活', '生活課程', '社會生活', '公民', '歷史', '地理'],
  '國文': ['國語', '國語文', '語文', '中文', '華語'],
  '國語': ['國文', '國語文', '語文', '中文', '華語'],
  '自然': ['自然科學', '自然與生活科技', '科學'],
  '數學': ['算數', '算術'],
  '英文': ['英語', '英語文'],
  '英語': ['英文', '英語文'],
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

function normalizeSubjectText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, '').toLowerCase()
}

function looksOcrOnlyModel(model: string | null | undefined) {
  const normalized = (model || '').toLowerCase()
  return normalized.includes('ocr') || normalized.includes('qianfan-ocr')
}

function getSubjectAliases(subjectName: string) {
  const normalizedName = normalizeSubjectText(subjectName)
  const aliases = new Set<string>()

  Object.entries(SUBJECT_ALIAS_TARGETS).forEach(([target, targetAliases]) => {
    const normalizedTarget = normalizeSubjectText(target)
    if (
      normalizedName === normalizedTarget ||
      normalizedName.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedName)
    ) {
      targetAliases.forEach((alias) => aliases.add(alias))
    }
  })

  return Array.from(aliases)
}

function resolveSubjectMatch(detectedSubject: string, subjects: CandidateSubject[]) {
  const normalizedDetected = normalizeSubjectText(detectedSubject)
  if (!normalizedDetected) {
    return { subjectId: null, candidates: [] }
  }

  const scored = subjects
    .map((subject) => {
      const normalizedName = normalizeSubjectText(subject.name)
      let confidence = 0
      let reason = ''

      if (normalizedName === normalizedDetected) {
        confidence = 1
        reason = 'exact'
      } else if (normalizedName.includes(normalizedDetected) || normalizedDetected.includes(normalizedName)) {
        confidence = 0.85
        reason = 'contains'
      } else {
        const aliases = getSubjectAliases(subject.name)
        const matchedAlias = aliases.find((alias) => normalizeSubjectText(alias) === normalizedDetected)
        if (matchedAlias) {
          confidence = 0.8
          reason = `alias:${matchedAlias}`
        }
      }

      return {
        subject_id: subject.id,
        name: subject.name,
        confidence,
        reason,
      }
    })
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)

  return {
    subjectId: scored[0]?.subject_id || null,
    candidates: scored,
  }
}

function mimeFromPath(path: string, fallback = 'image/jpeg') {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return fallback
}

function getMultiImageFolder(firstPath: string | null, jobId: string) {
  if (!firstPath) return null
  const parts = firstPath.split('/')
  if (parts.length >= 3 && parts[parts.length - 2] === jobId) {
    return parts.slice(0, -1).join('/')
  }
  return null
}

async function downloadImage(path: string, fallbackMime: string | null, index: number): Promise<SourceImage> {
  const adminClient = createAdminClient()
  const { data: fileData, error } = await adminClient.storage
    .from('assessment-imports')
    .download(path)

  if (error || !fileData) {
    throw new Error(error?.message || `Failed to download ${path}`)
  }

  const buffer = await fileData.arrayBuffer()
  return {
    path,
    label: `page ${index + 1}`,
    imageBase64: Buffer.from(buffer).toString('base64'),
    mimeType: fileData.type || mimeFromPath(path, fallbackMime || 'image/jpeg'),
    size: fileData.size,
  }
}

async function loadSourceImages(job: ImportJob) {
  if (!job.source_file_path) {
    throw new Error('Job has no source file')
  }

  const folder = getMultiImageFolder(job.source_file_path, job.id)
  if (!folder) {
    return [await downloadImage(job.source_file_path, job.source_file_mime, 0)]
  }

  const adminClient = createAdminClient()
  const { data: files, error } = await adminClient.storage
    .from('assessment-imports')
    .list(folder, {
      limit: 20,
      sortBy: { column: 'name', order: 'asc' },
    })

  if (error || !files || files.length === 0) {
    return [await downloadImage(job.source_file_path, job.source_file_mime, 0)]
  }

  const paths = files
    .filter((file) => file.name && !file.name.endsWith('/'))
    .map((file) => `${folder}/${file.name}`)

  if (paths.length === 0) {
    return [await downloadImage(job.source_file_path, job.source_file_mime, 0)]
  }

  return Promise.all(paths.map((path, index) => downloadImage(path, job.source_file_mime, index)))
}

async function createDraftFromJson(
  supabase: ReturnType<typeof createClient>,
  job: ImportJob,
  json: AssessmentJsonOutput,
  detectMistakes = false
) {
  const context = await buildStudentContext(job.student_id)
  const subjectMatch = resolveSubjectMatch(json.subject, context.candidateSubjects)
  const assessmentDate = json.assessment_date || todayInTaipei()

  const { data: draft, error: draftError } = await supabase
    .from('assessment_import_drafts')
    .insert({
      job_id: job.id,
      student_id: job.student_id,
      subject_id: subjectMatch.subjectId,
      detected_subject_name: json.subject,
      subject_candidates: subjectMatch.candidates,
      title: json.title || '',
      assessment_type: json.assessment_type,
      score: json.score,
      max_score: json.max_score || 100,
      percentage: json.score != null && json.max_score
        ? Math.round((json.score / json.max_score) * 10000) / 100
        : null,
      assessment_date: assessmentDate,
      confidence: json.confidence || 0,
      status: 'draft',
    })
    .select('id')
    .single()

  if (draftError || !draft) {
    throw new Error(draftError?.message || 'Failed to create draft')
  }

  if (detectMistakes && json.mistakes && json.mistakes.length > 0) {
    const mistakeDrafts = json.mistakes.map((m) => ({
      draft_id: draft.id,
      question_number: m.question_number,
      student_answer: m.student_answer,
      correct_answer: m.correct_answer,
      mistake_type: m.mistake_type,
      knowledge_point: m.knowledge_point,
      ai_reason: m.ai_reason,
      confidence: m.confidence,
    }))

    await supabase.from('assessment_import_mistake_drafts').insert(mistakeDrafts)
  }

  return { draftId: draft.id, context }
}

function buildMultimodalDebugText(images: SourceImage[], result: ExtractResult) {
  return [
    '[Multimodal direct mode]',
    'No separate OCR handoff was used. The model inspected the uploaded images and returned structured JSON directly.',
    `Images analyzed: ${images.length}`,
    ...images.map((image, index) => `${index + 1}. ${image.path}`),
    '',
    'Raw assistant response:',
    result.rawText || '',
  ].join('\n')
}

function buildOcrPipelineText(pages: OcrPageResult[]) {
  return pages
    .map(({ image, result }, index) => [
      `[Page ${index + 1}${image.label ? ` - ${image.label}` : ''}]`,
      `Source file: ${image.path}`,
      result.ocrText?.trim() || '[No OCR text returned]',
    ].join('\n'))
    .join('\n\n')
}

function buildOcrPipelineDebugText(pages: OcrPageResult[]) {
  return [
    '[OCR → Text LLM pipeline mode]',
    'Step 1 used the Vision/OCR model only to extract raw text from each uploaded image.',
    'Step 2 sends the combined OCR text plus student context to the Text LLM for structured JSON.',
    `Images analyzed: ${pages.length}`,
    ...pages.map(({ image }, index) => `${index + 1}. ${image.path}`),
    '',
    'Combined OCR text:',
    buildOcrPipelineText(pages),
  ].join('\n')
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    const supabase = createClient()
    const processOptions = await request.json().catch(() => ({}))
    const locale = processOptions?.locale === 'en' ? 'en' : 'zh-TW'

    const { data: job, error: jobError } = await supabase
      .from('assessment_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const importJob = job as ImportJob

    if (importJob.status === 'completed' || importJob.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        job_id: jobId,
        status: importJob.status,
        message: `Job already ${importJob.status}`,
      })
    }

    const config = await loadAiServiceConfig()
    if (!config) {
      const status = await getAiFeatureStatus()
      let reason = 'AI service not configured'
      if (status.reason) reason += `: ${status.reason}`
      if (!status.enabled) {
        reason += '。請在「設定 → AI 評量匯入設定」中啟用功能。'
      } else {
        if (!status.visionConfigured) reason += '。需要設定識圖 / 多模態 LLM 的 API key 與端點。'
        if (status.processingMode === 'pipeline' && !status.textConfigured) {
          reason += '。Pipeline 模式需要設定文本 LLM 的 API key 與端點。'
        }
      }
      await supabase
        .from('assessment_import_jobs')
        .update({ status: 'failed', error_code: 'CONFIG', error_message: reason })
        .eq('id', jobId)
      return NextResponse.json({ error: reason }, { status: 503 })
    }

    const requestedMode = processOptions?.mode === 'pipeline' || processOptions?.mode === 'multimodal'
      ? processOptions.mode
      : null
    const processingMode = requestedMode || config.processingMode
    const detectMistakes = typeof processOptions?.detectMistakes === 'boolean'
      ? processOptions.detectMistakes
      : config.detectMistakes

    if ((importJob.retry_count || 0) >= config.maxRetries) {
      await supabase
        .from('assessment_import_jobs')
        .update({ status: 'failed', error_code: 'MAX_RETRIES', error_message: 'Max retries exceeded' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Max retries exceeded' }, { status: 400 })
    }

    if (!config.vision) {
      const msg = 'Vision / multimodal provider not configured — 請在設定頁面設定識圖 LLM 的 API key 與端點'
      await supabase
        .from('assessment_import_jobs')
        .update({ status: 'failed', error_code: 'NO_VISION', error_message: msg })
        .eq('id', jobId)
      return NextResponse.json({ error: msg }, { status: 503 })
    }
    const visionConfig = config.vision

    if (processingMode === 'pipeline' && !config.text) {
      const msg = 'Pipeline mode requires Text LLM — 請在設定頁面設定文本 LLM 的 API key 與端點，或改用多模態模式'
      await supabase
        .from('assessment_import_jobs')
        .update({ status: 'failed', error_code: 'NO_TEXT', error_message: msg })
        .eq('id', jobId)
      return NextResponse.json({ error: msg }, { status: 503 })
    }

    if (processingMode === 'multimodal' && looksOcrOnlyModel(visionConfig.model)) {
      const msg = `目前的圖片模型「${visionConfig.model}」看起來是 OCR-only 模型，無法穩定執行一段式圖片 → JSON。請改用兩段式 Pipeline，或在 AI 設定把 Vision/多模態模型改成支援 image_url + chat/completions + JSON 輸出的模型後再試。`
      await supabase
        .from('assessment_import_jobs')
        .update({ status: 'failed', error_code: 'VISION_MODEL_NOT_MULTIMODAL', error_message: msg })
        .eq('id', jobId)
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    await supabase
      .from('assessment_import_jobs')
      .update({
        status: 'processing',
        provider: visionConfig.provider,
        model: visionConfig.model,
        retry_count: (importJob.retry_count || 0) + 1,
      })
      .eq('id', jobId)

    const images = await loadSourceImages(importJob)
    const context = await buildStudentContext(importJob.student_id)
    const provider = new OpenRouterProvider(visionConfig, config.text)

    let extractResult: ExtractResult
    let rawOcrText = ''
    let responseModels: Record<string, string | undefined>

    if (processingMode === 'multimodal') {
      extractResult = await provider.extractAssessmentFromImages!({
        images,
        context,
        locale,
        detectMistakes,
      })
      rawOcrText = buildMultimodalDebugText(images, extractResult)
      responseModels = { multimodal: extractResult.model }
    } else {
      const ocrPageResults: OcrPageResult[] = await Promise.all(
        images.map(async (image) => ({
          image,
          result: await provider.analyzeImage({
            imageBase64: image.imageBase64,
            mimeType: image.mimeType,
            label: image.label,
          }),
        }))
      )
      rawOcrText = buildOcrPipelineDebugText(ocrPageResults)

      await supabase
        .from('assessment_import_jobs')
        .update({
          raw_ocr_text: rawOcrText,
          ai_json: null,
          model: ocrPageResults.find((page) => page.result.model)?.result.model || visionConfig.model,
          provider: visionConfig.provider,
        })
        .eq('id', jobId)

      const failedOcr = ocrPageResults.find((page) => !page.result.success)
      if (failedOcr) {
        await supabase
          .from('assessment_import_jobs')
          .update({
            status: 'failed',
            error_code: 'OCR_FAILED',
            error_message: failedOcr.result.error || 'OCR analysis failed',
            model: failedOcr.result.model || visionConfig.model,
            raw_ocr_text: rawOcrText,
            ai_json: null,
          })
          .eq('id', jobId)

        return NextResponse.json({
          success: false,
          job_id: jobId,
          status: 'failed',
          step: 'ocr',
          error: failedOcr.result.error,
        })
      }

      extractResult = await provider.extractAssessment({
        ocrText: buildOcrPipelineText(ocrPageResults),
        context,
        locale,
        detectMistakes,
      })
      responseModels = {
        vision: Array.from(new Set(ocrPageResults.map((page) => page.result.model || visionConfig.model))).join(', '),
        text: extractResult.model,
      }
    }

    if (!extractResult.success || !extractResult.json) {
      await supabase
        .from('assessment_import_jobs')
        .update({
          status: 'failed',
          error_code: processingMode === 'multimodal' ? 'MULTIMODAL_ANALYSIS_FAILED' : 'TEXT_ANALYSIS_FAILED',
          error_message: extractResult.error || 'AI analysis failed',
          model: extractResult.model || visionConfig.model,
          raw_ocr_text: rawOcrText,
          ai_json: extractResult.rawJson as Record<string, unknown> | null,
          validated_json: null,
        })
        .eq('id', jobId)

      return NextResponse.json({
        success: false,
        job_id: jobId,
        status: 'failed',
        step: processingMode,
        error: extractResult.error,
      })
    }

    const { draftId } = await createDraftFromJson(supabase, importJob, extractResult.json, detectMistakes)

    await supabase
      .from('assessment_import_jobs')
      .update({
        status: 'completed',
        raw_ocr_text: rawOcrText,
        ai_json: (extractResult.rawJson || extractResult.json) as unknown as Record<string, unknown>,
        validated_json: extractResult.json as unknown as Record<string, unknown>,
        model: extractResult.model || visionConfig.model,
        provider: visionConfig.provider,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return NextResponse.json({
      success: true,
      job_id: jobId,
      status: 'completed',
      draft_id: draftId,
      mode: processingMode,
      image_count: images.length,
      models: responseModels,
    })
  } catch (error) {
    const supabase = createClient()
    await supabase
      .from('assessment_import_jobs')
      .update({
        status: 'failed',
        error_code: 'EXCEPTION',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', jobId)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
