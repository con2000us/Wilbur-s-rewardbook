/**
 * AI Assessment Import — shared types for provider interface and JSON schemas.
 */

// ── Provider Interface ──────────────────────────────────────────

/**
 * Input for the vision step: image → text
 */
export interface VisionInput {
  /** Base64-encoded image data (without data URI prefix) */
  imageBase64: string
  /** Image MIME type, e.g. "image/jpeg" */
  mimeType: string
  /** Human-readable page label for prompts/debugging */
  label?: string
}

export interface AssessmentImageInput {
  /** Base64-encoded image data (without data URI prefix) */
  imageBase64: string
  /** Image MIME type, e.g. "image/jpeg" */
  mimeType: string
  /** Human-readable page label for prompts/debugging */
  label?: string
}

/**
 * Input for the text-analysis step: OCR text → structured JSON
 */
export interface ExtractInput {
  /** Raw text extracted from the assessment image */
  ocrText: string
  /** Minimal student context */
  context: StudentContext
  /** UI locale to guide user-facing output language */
  locale?: string
  /** Whether to detect individual mistake items (default: false) */
  detectMistakes?: boolean
}

/**
 * Input for one-step multimodal analysis: images → structured JSON.
 */
export interface MultimodalExtractInput {
  images: AssessmentImageInput[]
  /** Minimal student context */
  context: StudentContext
  /** UI locale to guide user-facing output language */
  locale?: string
  /** Whether to detect individual mistake items (default: false) */
  detectMistakes?: boolean
}

/**
 * Input for refining a vision-produced JSON draft with the text model.
 */
export interface RefineAssessmentJsonInput {
  /** JSON draft produced by the vision/multimodal model */
  jsonText: string
  /** Minimal student context */
  context: StudentContext
  /** UI locale to guide user-facing output language */
  locale?: string
  /** Whether to keep/refine individual mistake items (default: false) */
  detectMistakes?: boolean
}

export interface StudentContext {
  /** Student grade level, e.g. "G3" */
  grade?: string
  /** System subjects belonging to this student */
  candidateSubjects: CandidateSubject[]
  /** Recent assessment name patterns for context */
  recentAssessmentPatterns?: string[]
  /** Confirmed AI import mappings from detected paper subject to chosen system subject */
  subjectArchiveHints?: SubjectArchiveHint[]
}

export interface CandidateSubject {
  id: string
  name: string
}

export interface SubjectArchiveHint {
  detected: string
  subject: string
  count: number
}

export interface AssessmentJsonOutput {
  /** Detected subject name as seen on the paper */
  subject: string
  /** Suggested assessment title */
  title: string
  /** Assessment type: exam / homework / quiz / project */
  assessment_type: 'exam' | 'homework' | 'quiz' | 'project' | null
  /** Student's score */
  score: number | null
  /** Maximum possible score */
  max_score: number | null
  /** Assessment date in YYYY-MM-DD format */
  assessment_date: string | null
  /** Detected mistakes */
  mistakes: AssessmentMistakeItem[]
  /** Items the model is uncertain about */
  uncertainties: UncertaintyItem[]
  /** Overall confidence 0.00-1.00 */
  confidence: number
}

export interface AssessmentMistakeItem {
  question_number: string | null
  student_answer: string | null
  correct_answer: string | null
  mistake_type: string | null
  knowledge_point: string | null
  ai_reason: string | null
  confidence: number | null
}

export interface UncertaintyItem {
  field: string
  reason: string
}

/** Result of the vision step */
export interface VisionResult {
  success: boolean
  ocrText?: string
  error?: string
  model?: string
}

/** Result of the text-analysis step */
export interface ExtractResult {
  success: boolean
  json?: AssessmentJsonOutput
  rawJson?: unknown
  rawText?: string
  error?: string
  model?: string
}

// ── Provider Interface ──────────────────────────────────────────

export interface AiProvider {
  /** Provider identifier, e.g. "openrouter" */
  readonly provider: string

  /**
   * Step 1: Vision — send an image and get back extracted text (OCR).
   * This may be a vision-capable model that reads the image directly.
   */
  analyzeImage(input: VisionInput): Promise<VisionResult>

  /**
   * Step 2: Text Analysis — send extracted text + student context
   * and get back structured JSON.
   */
  extractAssessment(input: ExtractInput): Promise<ExtractResult>

  /**
   * One-step multimodal analysis — send image(s) + student context
   * and get back structured JSON directly.
   */
  extractAssessmentFromImages?(input: MultimodalExtractInput): Promise<ExtractResult>

  /**
   * Vision JSON draft — send image(s) and get a parsed JSON draft without
   * requiring it to pass the final app schema yet.
   */
  analyzeImagesToJson?(input: MultimodalExtractInput): Promise<ExtractResult>

  /**
   * Text refinement — normalize a vision-produced JSON draft into the final schema.
   */
  refineAssessmentJson?(input: RefineAssessmentJsonInput): Promise<ExtractResult>

  /** Quick health check */
  healthCheck(): Promise<{ ok: boolean; message?: string }>
}

// ── Provider Config (per step) ──────────────────────────────────

export interface ProviderStepConfig {
  provider: string
  model: string
  fallbackModel?: string
  apiKey: string
  /** Optional custom endpoint URL for self-hosted / alternative providers */
  endpointUrl?: string
}

// ── Service Config ──────────────────────────────────────────────

export interface AiServiceConfig {
  /** Processing flow: pipeline keeps OCR→text JSON, multimodal does images→JSON directly */
  processingMode: 'pipeline' | 'multimodal'
  /** Vision step: image → text (may share same provider/key as text step) */
  vision: ProviderStepConfig | null
  /** Text step: OCR text → structured JSON */
  text: ProviderStepConfig | null
  /** Whether to detect and extract individual mistake items from the paper (default: false) */
  detectMistakes: boolean
  /** Rate limits */
  dailyLimit: number
  monthlyLimit: number
  studentDailyLimit: number
  maxRetries: number
}
