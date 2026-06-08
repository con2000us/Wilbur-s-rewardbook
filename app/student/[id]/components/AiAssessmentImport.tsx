'use client'

/**
 * AI Assessment Import Component
 *
 * Three-phase flow:
 * 1. Upload — camera/file upload
 * 2. Processing — polling for AI results
 * 3. Review — edit draft + confirm
 */

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'

// ── Types ────────────────────────────────────────────────────────

interface JobStatus {
  id: string
  student_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  provider?: string
  model?: string
  error_code?: string
  error_message?: string
  retry_count: number
  created_at: string
  updated_at?: string
  completed_at?: string
  has_ocr_text?: boolean
  ocr_text_length?: number
  has_ai_json?: boolean
  has_validated_json?: boolean
}

interface AiImportDebugData {
  source_files?: string[]
  raw_ocr_text?: string
  ai_json?: unknown
  validated_json?: unknown
  draft?: unknown
  mistake_drafts?: unknown
  status_snapshot?: {
    job_status?: string
    error_code?: string | null
    error_message?: string | null
    provider?: string | null
    model?: string | null
    source_file_count?: number
    ocr_text_length?: number
    has_ai_json?: boolean
    has_validated_json?: boolean
    draft_id?: string | null
    mistake_count?: number
  }
  context?: unknown
  prompts?: {
    multimodal_system?: string
    multimodal_user?: string
    vision_system?: string
    vision_user?: string
    text_system?: string
    text_user?: string
  }
}

interface DraftData {
  id: string
  subject_id: string | null
  detected_subject_name: string | null
  title: string | null
  assessment_type: string | null
  score: number | null
  max_score: number
  percentage: number | null
  assessment_date: string | null
  notes: string | null
  confidence: number | null
  status: string
}

interface MistakeDraft {
  id: string
  question_number: string | null
  student_answer: string | null
  correct_answer: string | null
  mistake_type: string | null
  knowledge_point: string | null
  ai_reason: string | null
  confidence: number | null
}

interface Subject {
  id: string
  name: string
}

interface RewardType {
  id: string
  type_key: string
  display_name: string
}

type Phase = 'upload' | 'processing' | 'review' | 'confirmed'
type ProcessingMode = 'multimodal' | 'pipeline'
type ScoringMode = 'scored' | 'record_only'
const MAX_FILES_PER_IMPORT = 6

function todayLocalDate() {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

// ── Props ────────────────────────────────────────────────────────

interface Props {
  studentId: string
  subjects: Subject[]
  assessmentTypes: Array<{ value: string; label: string }>
  onConfirmed?: (result: ConfirmResult) => void
}

interface ConfirmResult {
  assessment_id?: string
  reward_amount?: number
  mistake_count?: number
  image_archive_error?: string | null
}

// ── Component ────────────────────────────────────────────────────

export default function AiAssessmentImport({ studentId, subjects, assessmentTypes, onConfirmed }: Props) {
  const locale = useLocale()
  const isZh = locale === 'zh-TW'

  const [phase, setPhase] = useState<Phase>('upload')
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<JobStatus | null>(null)
  const [draft, setDraft] = useState<DraftData | null>(null)
  const [mistakes, setMistakes] = useState<MistakeDraft[]>([])

  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [recognitionMode, setRecognitionMode] = useState<ProcessingMode>('multimodal')
  const [detectMistakes, setDetectMistakes] = useState(false)

  // Draft edit states
  const [editSubjectId, setEditSubjectId] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState('')
  const [editScore, setEditScore] = useState('')
  const [editMaxScore, setEditMaxScore] = useState('')
  const [editDate, setEditDate] = useState(todayLocalDate())
  const [editNotes, setEditNotes] = useState('')
  const [editManualReward, setEditManualReward] = useState('')
  const [editRewardTypeId, setEditRewardTypeId] = useState('')
  const [editScoringMode, setEditScoringMode] = useState<ScoringMode>('scored')
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([])
  const [confirming, setConfirming] = useState(false)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugData, setDebugData] = useState<AiImportDebugData | null>(null)
  const [debugError, setDebugError] = useState('')

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  useEffect(() => {
    async function loadRewardTypes() {
      try {
        const response = await fetch('/api/custom-reward-types/list')
        const data = await response.json()
        if (!response.ok || !data.success) return

        const list: RewardType[] = data.types || []
        setRewardTypes(list)
        const moneyType = list.find((type) => type.type_key === 'money')
        setEditRewardTypeId(moneyType?.id || list[0]?.id || '')
      } catch {
        setRewardTypes([])
      }
    }

    loadRewardTypes()
  }, [])

  useEffect(() => {
    async function loadAiStatus() {
      try {
        const response = await fetch('/api/ai-assessment/status')
        const status = await response.json()
        if (!response.ok) return
        setRecognitionMode(status.processingMode === 'pipeline' ? 'pipeline' : 'multimodal')
      } catch {
        // Keep the local default.
      }
    }

    loadAiStatus()
  }, [])

  useEffect(() => {
    if (phase !== 'processing' || !processingStartedAt) return

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - processingStartedAt) / 1000)))
    }

    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timer)
  }, [phase, processingStartedAt])

  // ── File handling ──────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    if (selectedFiles.length > MAX_FILES_PER_IMPORT) {
      setError(isZh ? `一次最多上傳 ${MAX_FILES_PER_IMPORT} 張圖片` : `Upload up to ${MAX_FILES_PER_IMPORT} images at a time.`)
      return
    }

    const unsupported = selectedFiles.find((f) => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
    if (unsupported) {
      setError(isZh ? '不支援的檔案格式，請使用 JPEG、PNG 或 WebP' : 'Unsupported format. Use JPEG, PNG, or WebP.')
      return
    }

    const oversized = selectedFiles.find((f) => f.size > 4 * 1024 * 1024)
    if (oversized) {
      setError(isZh ? '檔案大小超過 4MB 限制' : 'File size exceeds 4MB limit.')
      return
    }

    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setFiles(selectedFiles)
    setPreviewUrls(selectedFiles.map((f) => URL.createObjectURL(f)))
    setError('')
  }

  // ── Upload & Process ───────────────────────────────────────────

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      files.forEach((selectedFile) => formData.append('files', selectedFile))
      formData.append('student_id', studentId)

      const res = await fetch('/api/assessment-imports', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setJobId(data.job_id)
      setPhase('processing')
      setProcessingStartedAt(Date.now())
      setElapsedSeconds(0)
      setUploading(false)

      pollJob(data.job_id)

      // Trigger processing in the background; polling will pick up status changes.
      void fetch(`/api/assessment-imports/${data.job_id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          mode: recognitionMode,
          detectMistakes,
        }),
      })
        .then(async (processRes) => {
          if (processRes.ok) return
          const processData = await processRes.json().catch(() => ({}))
          setError(processData.error || 'Processing failed')
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Processing failed')
        })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
      setProcessingStartedAt(null)
    }
  }

  // ── Polling ────────────────────────────────────────────────────

  const pollJob = useCallback(async (id: string) => {
    const maxPolls = 90 // 90 * 2s = 3 minutes max
    let polls = 0

    const poll = async () => {
      try {
        const res = await fetch(`/api/assessment-imports/${id}`)
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)

        setJob(data.job)
        setDraft(data.draft)
        setMistakes(data.mistake_drafts || [])

        if (data.job.status === 'completed') {
          // Populate edit form with draft data
          if (data.draft) {
            setEditSubjectId(data.draft.subject_id || '')
            setEditTitle(data.draft.title || '')
            setEditType(data.draft.assessment_type || '')
            setEditScore(data.draft.score != null ? String(data.draft.score) : '')
            setEditMaxScore(data.draft.max_score != null ? String(data.draft.max_score) : '')
            setEditDate(data.draft.assessment_date || todayLocalDate())
            setEditNotes(data.draft.notes || '')
          }
          setPhase('review')
          setProcessingStartedAt(null)
          setUploading(false)
          return
        }

        if (data.job.status === 'failed') {
          setError(data.job.error_message || (isZh ? 'AI 分析失敗' : 'AI analysis failed'))
          setPhase('upload')
          setProcessingStartedAt(null)
          setUploading(false)
          return
        }

        // Continue polling
        polls++
        if (polls < maxPolls) {
          setTimeout(poll, 2000)
        } else {
          setError(isZh ? '處理超時，請重試' : 'Processing timeout, please retry.')
          void fetch(`/api/assessment-imports/${id}/reject`, { method: 'POST' })
          setPhase('upload')
          setProcessingStartedAt(null)
          setUploading(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Polling failed')
        setPhase('upload')
        setProcessingStartedAt(null)
        setUploading(false)
      }
    }

    poll()
  }, [isZh])

  // ── Draft Edit ─────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!jobId) return
    setError('')

    try {
      const res = await fetch(`/api/assessment-imports/${jobId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDraftPayload()),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')

      setDraft(data.draft)
      setMistakes(data.mistake_drafts || [])
      setError(isZh ? '草稿已儲存' : 'Draft saved')
      setTimeout(() => setError(''), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  // ── Confirm ────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!jobId) return
    setConfirming(true)
    setError('')

    try {
      const res = await fetch(`/api/assessment-imports/${jobId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDraftPayload()),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Confirm failed')

      setConfirmResult(data)
      setPhase('confirmed')
      setConfirming(false)
      if (onConfirmed) {
        window.setTimeout(() => onConfirmed(data), 900)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed')
      setConfirming(false)
    }
  }

  const handleReject = async () => {
    if (!jobId) return

    try {
      await fetch(`/api/assessment-imports/${jobId}/reject`, { method: 'POST' })
    } catch {
      // Ignore reject errors
    }

    // Reset
    setPhase('upload')
    setJobId(null)
    setJob(null)
    setDraft(null)
    setMistakes([])
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setFiles([])
    setPreviewUrls([])
    setEditManualReward('')
    setEditRewardTypeId('')
    setEditScoringMode('scored')
    setConfirming(false)
    setProcessingStartedAt(null)
    setElapsedSeconds(0)
    setEditDate(todayLocalDate())
    setConfirmResult(null)
    setDebugOpen(false)
    setDebugData(null)
    setDebugError('')
  }

  const handleRetry = () => {
    setPhase('upload')
    setJobId(null)
    setJob(null)
    setDraft(null)
    setMistakes([])
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setFiles([])
    setPreviewUrls([])
    setError('')
    setEditManualReward('')
    setEditRewardTypeId('')
    setEditScoringMode('scored')
    setConfirming(false)
    setProcessingStartedAt(null)
    setElapsedSeconds(0)
    setEditDate(todayLocalDate())
    setConfirmResult(null)
    setDebugOpen(false)
    setDebugData(null)
    setDebugError('')
  }

  // ── Confidence badge color ─────────────────────────────────────

  const confidenceColor = (c: number | null) => {
    if (c == null) return 'bg-slate-100 text-slate-600'
    if (c >= 0.8) return 'bg-green-100 text-green-700'
    if (c >= 0.5) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  // ── Render ─────────────────────────────────────────────────────

  const editableMistakes = mistakes.filter((m) =>
    Boolean(
      m.question_number ||
      m.student_answer ||
      m.correct_answer ||
      m.mistake_type ||
      m.knowledge_point ||
      m.ai_reason
    )
  )
  const isImportRecordOnly = editScoringMode === 'record_only'

  const buildMistakePayload = () => editableMistakes.map((m) => ({
    question_number: m.question_number || null,
    student_answer: m.student_answer || null,
    correct_answer: m.correct_answer || null,
    mistake_type: m.mistake_type || null,
    knowledge_point: m.knowledge_point || null,
    ai_reason: m.ai_reason || null,
    confidence: m.confidence,
  }))

  const buildDraftPayload = () => ({
    subject_id: editSubjectId || null,
    title: editTitle,
    assessment_type: editType || null,
    score: isImportRecordOnly ? null : editScore ? parseFloat(editScore) : null,
    max_score: isImportRecordOnly ? 100 : editMaxScore ? parseFloat(editMaxScore) : null,
    assessment_date: editDate || todayLocalDate(),
    notes: editNotes,
    manual_reward: isImportRecordOnly ? null : editManualReward ? parseFloat(editManualReward) : null,
    reward_type_id: isImportRecordOnly ? null : editRewardTypeId || null,
    scoring_mode: editScoringMode,
    counts_toward_average: !isImportRecordOnly,
    counts_toward_reward: !isImportRecordOnly,
    mistakes: buildMistakePayload(),
  })

  const updateMistake = (
    id: string,
    field: keyof Omit<MistakeDraft, 'id' | 'confidence'>,
    value: string
  ) => {
    setMistakes((current) =>
      current.map((mistake) =>
        mistake.id === id ? { ...mistake, [field]: value || null } : mistake
      )
    )
  }

  const addMistake = () => {
    setMistakes((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        question_number: '',
        student_answer: '',
        correct_answer: '',
        mistake_type: '',
        knowledge_point: '',
        ai_reason: '',
        confidence: null,
      },
    ])
  }

  const removeMistake = (id: string) => {
    setMistakes((current) => current.filter((mistake) => mistake.id !== id))
  }

  const loadDebugData = async () => {
    if (!jobId) return
    setDebugOpen(true)
    setDebugLoading(true)
    setDebugError('')

    try {
      const params = new URLSearchParams({
        debug: '1',
        locale,
        mode: recognitionMode,
        detectMistakes: detectMistakes ? '1' : '0',
      })
      const res = await fetch(`/api/assessment-imports/${jobId}?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Debug load failed')
      setDebugData(data.debug || null)
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'Debug load failed')
    } finally {
      setDebugLoading(false)
    }
  }

  const formatDebugJson = (value: unknown) => {
    if (value === null || value === undefined) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  const DebugTextBlock = ({ title, value }: { title: string; value?: string }) => (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <span className="text-[11px] text-slate-400">{value ? `${value.length} chars` : 'empty'}</span>
      </div>
      <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
        {value || (isZh ? '目前沒有內容' : 'No content yet')}
      </pre>
    </div>
  )

  const DebugStatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {ok ? '✓' : '!'} {label}
    </span>
  )

  const DebugPanel = () => {
    if (!jobId) return null

    return (
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-700">
              {isZh ? 'AI Debug 檢查' : 'AI Debug Inspector'}
            </h3>
            <p className="text-xs text-slate-500">
              {isZh
                ? '查看 AI 原始回傳文字、OCR 原文、JSON 結果以及送出的提示詞。'
                : 'Inspect raw LLM response, OCR text, JSON results, and the actual prompts.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (debugOpen && debugData) {
                setDebugOpen(false)
              } else {
                void loadDebugData()
              }
            }}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {debugOpen ? (isZh ? '收合 Debug' : 'Hide Debug') : (isZh ? '檢查回傳內容' : 'Inspect Response')}
          </button>
        </div>

        {debugOpen && (
          <div className="mt-4 space-y-4">
            {debugLoading && (
              <p className="text-sm text-slate-500">{isZh ? '載入 debug 內容中...' : 'Loading debug data...'}</p>
            )}
            {debugError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{debugError}</p>
            )}
            {debugData && (
              <>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <DebugStatusBadge
                      ok={(debugData.status_snapshot?.ocr_text_length || 0) > 0}
                      label={isZh ? `模型回傳 ${debugData.status_snapshot?.ocr_text_length || 0} 字元` : `Model text ${debugData.status_snapshot?.ocr_text_length || 0} chars`}
                    />
                    <DebugStatusBadge
                      ok={(debugData.status_snapshot?.source_file_count || 0) > 0}
                      label={isZh ? `圖片 ${debugData.status_snapshot?.source_file_count || 0} 張` : `${debugData.status_snapshot?.source_file_count || 0} image(s)`}
                    />
                    <DebugStatusBadge
                      ok={Boolean(debugData.status_snapshot?.has_ai_json)}
                      label={isZh ? 'LLM JSON 已保存' : 'LLM JSON saved'}
                    />
                    <DebugStatusBadge
                      ok={Boolean(debugData.status_snapshot?.has_validated_json)}
                      label={isZh ? 'Validated JSON 已保存' : 'Validated JSON saved'}
                    />
                    <DebugStatusBadge
                      ok={(debugData.status_snapshot?.mistake_count || 0) > 0}
                      label={isZh ? `錯題 ${debugData.status_snapshot?.mistake_count || 0} 筆` : `${debugData.status_snapshot?.mistake_count || 0} mistakes`}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {isZh ? '狀態' : 'Status'}: {debugData.status_snapshot?.job_status || '-'}
                    {debugData.status_snapshot?.model ? ` · ${debugData.status_snapshot.model}` : ''}
                  </p>
                  {debugData.status_snapshot?.error_message && (
                    <p className="mt-1 text-xs text-red-600">
                      {debugData.status_snapshot.error_code || 'ERROR'}: {debugData.status_snapshot.error_message}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                  <h4 className="mb-3 text-sm font-bold text-blue-800">
                    {isZh ? '一、圖片與模型原始回傳' : '1. Source Images and Raw Model Output'}
                  </h4>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <DebugTextBlock title="Source files" value={formatDebugJson(debugData.source_files || [])} />
                    <DebugTextBlock title="Raw model text / OCR handoff" value={debugData.raw_ocr_text || ''} />
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
                  <h4 className="mb-3 text-sm font-bold text-purple-800">
                    {isZh ? '二、LLM 結構化 JSON' : '2. Structured JSON'}
                  </h4>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <DebugTextBlock title="LLM raw parsed JSON (ai_json)" value={formatDebugJson(debugData.ai_json)} />
                    <DebugTextBlock title="Validated JSON" value={formatDebugJson(debugData.validated_json)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-green-100 bg-green-50/50 p-3">
                  <h4 className="mb-3 text-sm font-bold text-green-800">
                    {isZh ? '三、系統建立的草稿' : '3. Draft Created by System'}
                  </h4>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <DebugTextBlock title="Draft row" value={formatDebugJson(debugData.draft)} />
                    <DebugTextBlock title="Mistake draft rows" value={formatDebugJson(debugData.mistake_drafts)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <h4 className="mb-3 text-sm font-bold text-slate-700">
                    {isZh ? '四、送給 LLM 的上下文與提示詞' : '4. Context and Prompts Sent to LLM'}
                  </h4>
                  <DebugTextBlock title="Context" value={formatDebugJson(debugData.context)} />
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <DebugTextBlock title="Multimodal system prompt" value={debugData.prompts?.multimodal_system || ''} />
                    <DebugTextBlock title="Multimodal user prompt" value={debugData.prompts?.multimodal_user || ''} />
                    <DebugTextBlock title="Vision/OCR system prompt" value={debugData.prompts?.vision_system || ''} />
                    <DebugTextBlock title="Vision/OCR user prompt" value={debugData.prompts?.vision_user || ''} />
                    <DebugTextBlock title="Text system prompt" value={debugData.prompts?.text_system || ''} />
                  </div>
                  <div className="mt-3">
                    <DebugTextBlock title="Text user prompt" value={debugData.prompts?.text_user || ''} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const formatElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    return minutes > 0 ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`
  }

  const processingHint = (() => {
    if (elapsedSeconds < 20) {
      return isZh ? '正在讀取圖片內容，字比較多時會多花一點時間。' : 'Reading the image content; dense papers can take a bit longer.'
    }
    if (elapsedSeconds < 75) {
      return isZh ? '已進入主要分析時間，通常會在 1 到 2 分鐘內完成。' : 'Now in the main analysis window; most imports finish within 1-2 minutes.'
    }
    return isZh ? '仍在處理中。若超過 4 分鐘系統會自動提示重試。' : 'Still processing. The system will suggest retrying after 4 minutes.'
  })()

  const modeDetail = recognitionMode === 'pipeline'
    ? (isZh ? 'OCR 模型先讀取圖片文字，再交給 Text LLM 梳理。' : 'OCR model reads image text, then Text LLM structures it.')
    : (isZh ? '多模態模型直接產生評量 JSON。' : 'Multimodal model directly produces assessment JSON.')
  const mistakeDetail = detectMistakes
    ? (isZh ? '本次會嘗試辨識學生錯題。' : 'This run will try to detect student mistakes.')
    : (isZh ? '本次不辨識學生錯題。' : 'This run will not detect student mistakes.')
  const hasModelDraft = Boolean(job?.has_ocr_text || job?.has_ai_json || draft)
  const hasStructuredResult = Boolean(job?.has_validated_json || draft)
  const hasCompletedJob = job?.status === 'completed'

  const processingSteps = [
    {
      label: isZh ? '上傳考卷圖片' : 'Upload images',
      detail: files.length > 0
        ? (isZh ? `已送出 ${files.length} 張：${files.map((f) => f.name).join('、')}` : `Submitted ${files.length}: ${files.map((f) => f.name).join(', ')}`)
        : (isZh ? '圖片已送出' : 'Images submitted'),
      status: 'done',
    },
    {
      label: recognitionMode === 'pipeline'
        ? (isZh ? 'OCR 模型讀取圖片文字' : 'OCR model reads image text')
        : (isZh ? '多模態直接輸出 JSON' : 'Direct multimodal JSON'),
      detail: job?.has_ocr_text
        ? (isZh ? `已取得 OCR/模型回傳內容，約 ${job.ocr_text_length || 0} 個字元` : `OCR/model response captured, about ${job.ocr_text_length || 0} characters`)
        : `${modeDetail} ${mistakeDetail}`,
      status: hasModelDraft ? 'done' : 'active',
    },
    {
      label: recognitionMode === 'pipeline'
        ? (isZh ? 'Text LLM 梳理 OCR 結果' : 'Text LLM structures OCR result')
        : (isZh ? '檢查評量欄位' : 'Check assessment fields'),
      detail: detectMistakes
        ? (isZh ? '比對學生科目、分數、日期與錯題資訊' : 'Matching subject, score, date, and mistake details')
        : (isZh ? '比對學生科目、分數與日期' : 'Matching subject, score, and date'),
      status: !hasModelDraft ? 'pending' : hasStructuredResult ? 'done' : 'active',
    },
    {
      label: isZh ? '建立待確認草稿' : 'Create review draft',
      detail: draft && !hasCompletedJob
        ? (isZh ? '草稿已建立，正在完成最後狀態更新' : 'Draft is created; final status update is finishing')
        : (isZh ? '完成後會進入可修改的確認畫面' : 'You can review and edit once this is ready'),
      status: !hasStructuredResult ? 'pending' : hasCompletedJob ? 'done' : 'active',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Error / Success banner */}
      {error && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            error.includes('儲存') || error.includes('saved')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {error}
        </div>
      )}

      {/* Phase 1: Upload */}
      {phase === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-center">
            {previewUrls.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="h-32 w-full object-contain"
                      />
                      <p className="truncate border-t border-slate-100 px-2 py-1 text-xs text-slate-500">
                        {index + 1}. {files[index]?.name}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  {isZh
                    ? `共 ${files.length} 張，${(files.reduce((sum, selectedFile) => sum + selectedFile.size, 0) / 1024 / 1024).toFixed(1)}MB`
                    : `${files.length} image(s), ${(files.reduce((sum, selectedFile) => sum + selectedFile.size, 0) / 1024 / 1024).toFixed(1)}MB total`
                  }
                </p>
                <button
                  type="button"
                  onClick={() => {
                    previewUrls.forEach((url) => URL.revokeObjectURL(url))
                    setFiles([])
                    setPreviewUrls([])
                  }}
                  className="text-sm text-slate-400 underline"
                >
                  {isZh ? '重新選擇' : 'Choose another'}
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="space-y-3">
                  <span className="material-icons-outlined text-5xl text-slate-400">
                    photo_camera
                  </span>
                  <p className="text-sm font-medium text-slate-600">
                    {isZh ? '拍照或上傳考卷圖片' : 'Take photo or upload exam paper'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isZh
                      ? `支援 JPEG、PNG、WebP，單張最大 4MB，可一次選 ${MAX_FILES_PER_IMPORT} 張`
                      : `Supports JPEG, PNG, WebP, max 4MB each, up to ${MAX_FILES_PER_IMPORT} images`
                    }
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div>
              <p className="text-sm font-bold text-slate-700">
                {isZh ? '辨識方式' : 'Recognition Mode'}
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRecognitionMode('multimodal')}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    recognitionMode === 'multimodal'
                      ? 'border-green-300 bg-green-50 text-green-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {isZh ? '多模態直接輸出' : 'Direct Multimodal'}
                  </span>
                  <span className="mt-1 block text-xs">
                    {isZh ? '圖片模型直接產生評量 JSON' : 'Image model directly returns assessment JSON'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecognitionMode('pipeline')}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    recognitionMode === 'pipeline'
                      ? 'border-green-300 bg-green-50 text-green-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {isZh ? 'OCR → 文本梳理' : 'OCR → Text Structuring'}
                  </span>
                  <span className="mt-1 block text-xs">
                    {isZh ? 'OCR 模型先讀文字，再由 Text LLM 找出分數、日期與科目' : 'OCR model reads text first, then Text LLM finds score, date, and subject'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-700">
                  {isZh ? '辨識學生錯題' : 'Detect Student Mistakes'}
                </p>
                <p className="text-xs text-slate-500">
                  {isZh ? '預設關閉；開啟後才嘗試抓題號、答案與錯因。' : 'Off by default; turn on to extract question numbers, answers, and reasons.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetectMistakes((current) => !current)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  detectMistakes ? 'bg-green-600' : 'bg-gray-300'
                }`}
                aria-pressed={detectMistakes}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    detectMistakes ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="w-full rounded-full bg-green-600 py-3 text-center font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {uploading
              ? (isZh ? '上傳中...' : 'Uploading...')
              : (isZh ? '開始 AI 分析' : 'Start AI Analysis')
            }
          </button>
        </div>
      )}

      {/* Phase 2: Processing */}
      {phase === 'processing' && (
        <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white/75 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-4">
            <div className="h-14 w-14 flex-shrink-0 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-700">
                {isZh ? 'AI 正在分析考卷' : 'AI is analyzing the paper'}
              </p>
              <p className="text-sm text-slate-500">
                {isZh ? '通常需要 30 秒到 2 分鐘' : 'Usually takes 30 seconds to 2 minutes'}
              </p>
            </div>
            <div className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm font-bold tabular-nums text-slate-600">
              {formatElapsed(elapsedSeconds)}
            </div>
          </div>

          <div className="space-y-3">
            {processingSteps.map((step, index) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                      step.status === 'done'
                        ? 'bg-green-600 text-white'
                        : step.status === 'active'
                          ? 'bg-green-100 text-green-700 ring-2 ring-green-200'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.status === 'done' ? (
                      <span className="material-icons-outlined text-[16px]">check</span>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < processingSteps.length - 1 && (
                    <div className={`mt-1 h-7 w-px ${step.status === 'done' ? 'bg-green-200' : 'bg-slate-200'}`} />
                  )}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-sm font-bold text-slate-700">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <span className="material-icons-outlined text-base text-slate-400">info</span>
              <span>{processingHint}</span>
            </div>
            {job?.provider && (
              <p className="mt-2 pl-6 text-slate-400">
                {job.provider} / {job.model || 'auto'}
                {job.retry_count ? ` · ${isZh ? '第' : 'try'} ${job.retry_count}${isZh ? '次處理' : ''}` : ''}
              </p>
            )}
          </div>
        </div>
        <DebugPanel />
        <button
          type="button"
          onClick={handleReject}
          className="w-full rounded-full border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
        >
          {isZh ? '停止辨識並重新上傳' : 'Stop Analysis and Re-upload'}
        </button>
        </div>
      )}

      {/* Phase 3: Review */}
      {phase === 'review' && draft && (
        <div className="space-y-6">
          {/* AI Confidence banner */}
          <div className={`rounded-xl p-4 ${confidenceColor(draft.confidence)}`}>
            <span className="material-icons-outlined align-middle text-base">
              {draft.confidence && draft.confidence >= 0.7 ? 'check_circle' : 'warning'}
            </span>
            <span className="ml-2 text-sm font-medium">
              {isZh
                ? `AI 信心度：${draft.confidence != null ? Math.round(draft.confidence * 100) : '?'}% — ${
                    draft.confidence != null && draft.confidence >= 0.7 ? '請確認後歸檔' : '建議仔細檢查後再確認'
                  }`
                : `AI Confidence: ${draft.confidence != null ? Math.round(draft.confidence * 100) : '?'}% — ${
                    draft.confidence != null && draft.confidence >= 0.7 ? 'Ready for review' : 'Please double-check'
                  }`
              }
            </span>
          </div>

          <DebugPanel />

          {/* Subject selection */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {isZh ? '科目 *' : 'Subject *'}
            </label>
            <select
              value={editSubjectId}
              onChange={(e) => setEditSubjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{isZh ? '選擇科目' : 'Select subject'}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {draft.detected_subject_name && (
              <p className="mt-1 text-xs text-slate-400">
                {isZh
                  ? `AI 辨識：${draft.detected_subject_name}`
                  : `AI detected: ${draft.detected_subject_name}`
                }
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {isZh ? '評量名稱' : 'Assessment Title'}
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {isZh ? '評量類型' : 'Assessment Type'}
            </label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{isZh ? '未指定' : 'Unspecified'}</option>
              {assessmentTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {isZh ? '評分方式' : 'Scoring Method'}
            </label>
            <select
              value={editScoringMode}
              onChange={(e) => {
                const nextMode = e.target.value as ScoringMode
                setEditScoringMode(nextMode)
                if (nextMode === 'record_only') {
                  setEditScore('')
                  setEditManualReward('')
                  setEditRewardTypeId('')
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="scored">{isZh ? '計分評量' : 'Scored Assessment'}</option>
              <option value="record_only">{isZh ? '不計分，只留紀錄' : 'No Score, Record Only'}</option>
            </select>
          </div>

          {isImportRecordOnly && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <span className="material-icons-outlined text-base text-slate-500">inventory_2</span>
                <p>
                  {isZh
                    ? '確認後會保存考卷圖片、日期與備註，不列入平均，也不產生獎勵。'
                    : 'Confirming will keep images, date, and notes without affecting averages or rewards.'}
                </p>
              </div>
            </div>
          )}

          {/* Score / Max Score */}
          {!isImportRecordOnly && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                {isZh ? '分數' : 'Score'}
              </label>
              <input
                type="number"
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                {isZh ? '滿分' : 'Max Score'}
              </label>
              <input
                type="number"
                value={editMaxScore}
                onChange={(e) => setEditMaxScore(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                min="0"
              />
            </div>
          </div>
          )}

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {isZh ? '評量日期' : 'Assessment Date'}
            </label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {isZh ? '備註' : 'Notes'}
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          {/* Mistake preview */}
          {mistakes.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-slate-700">
                {isZh ? `AI 辨識錯題 (${mistakes.length} 題)` : `AI Detected Mistakes (${mistakes.length})`}
              </h3>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
                {mistakes.map((m) => (
                  <div key={m.id} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                    <div className="flex items-center gap-2">
                      {m.question_number && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold">
                          #{m.question_number}
                        </span>
                      )}
                      {m.mistake_type && (
                        <span className="text-xs text-slate-500">{m.mistake_type}</span>
                      )}
                      {m.confidence != null && (
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${confidenceColor(m.confidence)}`}>
                          {Math.round(m.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    {m.knowledge_point && (
                      <p className="mt-1 text-xs text-blue-600">{m.knowledge_point}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reward override */}
          {!isImportRecordOnly && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                {isZh ? '手動獎勵' : 'Manual Reward'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={editManualReward}
                onChange={(e) => setEditManualReward(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder={isZh ? '留空使用規則' : 'Leave blank for rules'}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                {isZh ? '獎勵類型' : 'Reward Type'}
              </label>
              <select
                value={editRewardTypeId}
                onChange={(e) => setEditRewardTypeId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">{isZh ? '預設' : 'Default'}</option>
                {rewardTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.display_name || type.type_key}
                  </option>
                ))}
              </select>
            </div>
          </div>
          )}

          {/* Editable mistakes */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-700">
                {isZh ? `錯題草稿 (${mistakes.length})` : `Mistake Drafts (${mistakes.length})`}
              </h3>
              <button
                type="button"
                onClick={addMistake}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {isZh ? '新增錯題' : 'Add Mistake'}
              </button>
            </div>
            {mistakes.length > 0 ? (
              <div className="max-h-[32rem] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
                {mistakes.map((m, index) => (
                  <div key={m.id} className="space-y-3 rounded-lg bg-white p-3 text-sm shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                        #{index + 1}
                      </span>
                      {m.confidence != null && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${confidenceColor(m.confidence)}`}>
                          {Math.round(m.confidence * 100)}%
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMistake(m.id)}
                        className="ml-auto text-xs font-semibold text-red-500 hover:text-red-700"
                      >
                        {isZh ? '刪除' : 'Delete'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={m.question_number || ''}
                        onChange={(e) => updateMistake(m.id, 'question_number', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                        placeholder={isZh ? '題號' : 'Question number'}
                      />
                      <input
                        value={m.mistake_type || ''}
                        onChange={(e) => updateMistake(m.id, 'mistake_type', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                        placeholder={isZh ? '錯誤類型' : 'Mistake type'}
                      />
                    </div>
                    <input
                      value={m.knowledge_point || ''}
                      onChange={(e) => updateMistake(m.id, 'knowledge_point', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder={isZh ? '知識點' : 'Knowledge point'}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <textarea
                        value={m.student_answer || ''}
                        onChange={(e) => updateMistake(m.id, 'student_answer', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                        placeholder={isZh ? '學生答案' : 'Student answer'}
                        rows={2}
                      />
                      <textarea
                        value={m.correct_answer || ''}
                        onChange={(e) => updateMistake(m.id, 'correct_answer', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                        placeholder={isZh ? '正確答案' : 'Correct answer'}
                        rows={2}
                      />
                    </div>
                    <textarea
                      value={m.ai_reason || ''}
                      onChange={(e) => updateMistake(m.id, 'ai_reason', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder={isZh ? '錯因 / 備註' : 'Reason / notes'}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={addMistake}
                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 py-4 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                {isZh ? '尚無錯題，點此新增' : 'No mistakes yet. Add one'}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex-1 rounded-full border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {isZh ? '儲存草稿' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!editSubjectId || confirming}
              className="flex-1 rounded-full bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {confirming
                ? (isZh ? '確認中...' : 'Confirming...')
                : (isZh ? '確認歸檔' : 'Confirm & Archive')
              }
            </button>
          </div>
          <button
            type="button"
            onClick={handleReject}
            className="w-full text-center text-sm text-slate-400 underline"
          >
            {isZh ? '放棄此草稿，重新上傳' : 'Discard draft and re-upload'}
          </button>
        </div>
      )}

      {/* Phase 4: Confirmed */}
      {phase === 'confirmed' && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="material-icons-outlined text-5xl text-green-500">check_circle</span>
          <h3 className="text-lg font-bold text-slate-800">
            {isZh ? '評量已成功歸檔！' : 'Assessment archived!'}
          </h3>
          <p className="text-sm text-slate-500">
            {isZh
              ? '已建立正式評量記錄與錯題資料'
              : 'Formal assessment and mistake records created'
            }
          </p>
          {confirmResult?.image_archive_error && (
            <p className="max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {isZh
                ? `評量已建立，但原圖歸檔失敗：${confirmResult.image_archive_error}`
                : `Assessment created, but image archiving failed: ${confirmResult.image_archive_error}`}
            </p>
          )}
          <div className="flex gap-3 pt-4">
            <a
              href={`/student/${studentId}`}
              className="rounded-full bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-700"
            >
              {isZh ? '查看評量記錄' : 'View Records'}
            </a>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-bold text-white"
            >
              {isZh ? '再匯入一張' : 'Import Another'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
