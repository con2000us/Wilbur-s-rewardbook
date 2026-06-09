/**
 * OpenRouter AI Provider adapter.
 *
 * Implements the two-step pipeline:
 *  1. analyzeImage — vision model reads image, returns text
 *  2. extractAssessment — text model parses OCR text into structured JSON
 *
 * This adapter supports two separate model/key configs so that
 * vision and text analysis can use different providers.
 */

import type {
  AiProvider,
  ProviderStepConfig,
  VisionInput,
  VisionResult,
  ExtractInput,
  ExtractResult,
  MultimodalExtractInput,
  RefineAssessmentJsonInput,
} from '../types'
import { validateAssessmentJson } from '../schema'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

interface CallModelOptions {
  apiKey: string
  model: string
  fallbackModel?: string
  endpointUrl?: string
  systemPrompt: string
  userContent: unknown
  parseJson?: boolean
  maxTokens?: number
  timeoutMs?: number
}

function extractAssistantText(content: unknown): string {
  if (typeof content === 'string') return content.trim()

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== 'object') return ''
        const text = (part as { text?: unknown; content?: unknown }).text
          ?? (part as { text?: unknown; content?: unknown }).content
        return typeof text === 'string' ? text : ''
      })
      .join('')
      .trim()
  }

  return ''
}

function isAbortError(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'name' in error &&
    String((error as { name?: unknown }).name) === 'AbortError'
  )
}

export class OpenRouterProvider implements AiProvider {
  readonly provider = 'openrouter'

  constructor(
    private visionConfig: ProviderStepConfig | null,
    private textConfig: ProviderStepConfig | null
  ) {}

  // ── Step 1: Vision → text (OCR) ──────────────────────────────

  async analyzeImage(input: VisionInput): Promise<VisionResult> {
    if (!this.visionConfig) {
      return { success: false, error: 'Vision step is not configured' }
    }

    try {
      const result = await this.callModel({
        apiKey: this.visionConfig.apiKey,
        model: this.visionConfig.model,
        fallbackModel: this.visionConfig.fallbackModel,
        endpointUrl: this.visionConfig.endpointUrl,
        systemPrompt: buildVisionSystemPrompt(),
        userContent: [
          {
            type: 'text',
            text: buildVisionUserPrompt(input.label),
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${input.mimeType};base64,${input.imageBase64}`,
            },
          },
        ],
        parseJson: false,
        timeoutMs: 60000,
      })

      if (!result.success) {
        return { success: false, error: result.error, model: result.model }
      }

      return {
        success: true,
        ocrText: result.text,
        model: result.model,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vision analysis failed',
      }
    }
  }

  // ── Step 2: OCR text → structured JSON ───────────────────────

  async extractAssessment(input: ExtractInput): Promise<ExtractResult> {
    if (!this.textConfig) {
      return { success: false, error: 'Text analysis step is not configured' }
    }

    try {
      const result = await this.callModel({
        apiKey: this.textConfig.apiKey,
        model: this.textConfig.model,
        fallbackModel: this.textConfig.fallbackModel,
        endpointUrl: this.textConfig.endpointUrl,
        systemPrompt: buildTextAnalysisSystemPrompt(input.context, input.locale, input.detectMistakes),
        userContent: [
          {
            type: 'text',
            text: buildTextAnalysisUserPrompt(input.ocrText),
          },
        ],
        parseJson: true,
        timeoutMs: 90000,
      })

      if (!result.success) {
        return { success: false, error: result.error, model: result.model }
      }

      // Validate against Zod schema
      if (result.json) {
        const validation = validateAssessmentJson(result.json)
        if (!validation.success) {
          return {
            success: false,
            error: `Schema validation failed: ${JSON.stringify(validation.errors)}`,
            model: result.model,
            rawText: result.text,
            rawJson: result.json,
          }
        }
        return {
          success: true,
          json: validation.data,
          rawJson: result.json,
          rawText: result.text,
          model: result.model,
        }
      }

      return {
        success: false,
        error: 'No JSON output from model',
        model: result.model,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text analysis failed',
      }
    }
  }

  // ── Vision JSON draft: image(s) → parsed JSON ─────────────────

  async analyzeImagesToJson(input: MultimodalExtractInput): Promise<ExtractResult> {
    if (!this.visionConfig) {
      return { success: false, error: 'Multimodal analysis step is not configured' }
    }

    if (input.images.length === 0) {
      return { success: false, error: 'No images provided for multimodal analysis' }
    }

    try {
      const imageParts = input.images.flatMap((image, index) => [
        {
          type: 'text',
          text: `Image ${index + 1}${image.label ? ` (${image.label})` : ''}:`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${image.mimeType};base64,${image.imageBase64}`,
          },
        },
      ])

      const result = await this.callModel({
        apiKey: this.visionConfig.apiKey,
        model: this.visionConfig.model,
        fallbackModel: this.visionConfig.fallbackModel,
        endpointUrl: this.visionConfig.endpointUrl,
        systemPrompt: buildMultimodalAssessmentSystemPrompt(input.context, input.locale, input.detectMistakes),
        userContent: [
          {
            type: 'text',
            text: buildMultimodalAssessmentUserPrompt(input.images.length, input.detectMistakes),
          },
          ...imageParts,
        ],
        parseJson: true,
        maxTokens: input.detectMistakes ? 8192 : 2048,
        timeoutMs: input.detectMistakes ? 120000 : 75000,
      })

      if (!result.success || !result.json) {
        return { success: false, error: result.error || 'No JSON output from model', model: result.model, rawText: result.text }
      }

      const validation = validateAssessmentJson(result.json)
      return {
        success: true,
        json: validation.success ? validation.data : undefined,
        rawJson: result.json,
        rawText: result.text,
        model: result.model,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Multimodal analysis failed',
      }
    }
  }

  // ── One-step: image(s) → final structured JSON ────────────────

  async extractAssessmentFromImages(input: MultimodalExtractInput): Promise<ExtractResult> {
    try {
      const result = await this.analyzeImagesToJson(input)
      if (!result.success || !result.rawJson) {
        return result
      }

      const validation = validateAssessmentJson(result.rawJson)
      if (!validation.success) {
        return {
          success: false,
          error: `Schema validation failed: ${JSON.stringify(validation.errors)}`,
          model: result.model,
          rawText: result.rawText,
          rawJson: result.rawJson,
        }
      }
      return {
        success: true,
        json: validation.data,
        rawJson: result.rawJson,
        rawText: result.rawText,
        model: result.model,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Multimodal analysis failed',
      }
    }
  }

  // ── Text refinement: vision JSON → final structured JSON ─────

  async refineAssessmentJson(input: RefineAssessmentJsonInput): Promise<ExtractResult> {
    if (!this.textConfig) {
      return { success: false, error: 'Text analysis step is not configured' }
    }

    try {
      const result = await this.callModel({
        apiKey: this.textConfig.apiKey,
        model: this.textConfig.model,
        fallbackModel: this.textConfig.fallbackModel,
        endpointUrl: this.textConfig.endpointUrl,
        systemPrompt: buildJsonRefinementSystemPrompt(input.context, input.locale, input.detectMistakes),
        userContent: [
          {
            type: 'text',
            text: buildJsonRefinementUserPrompt(input.jsonText),
          },
        ],
        parseJson: true,
        maxTokens: input.detectMistakes ? 4096 : 2048,
        timeoutMs: input.detectMistakes ? 90000 : 60000,
      })

      if (!result.success) {
        return { success: false, error: result.error, model: result.model, rawText: result.text }
      }

      if (result.json) {
        const validation = validateAssessmentJson(result.json)
        if (!validation.success) {
          return {
            success: false,
            error: `Schema validation failed: ${JSON.stringify(validation.errors)}`,
            model: result.model,
            rawText: result.text,
            rawJson: result.json,
          }
        }
        return {
          success: true,
          json: validation.data,
          rawJson: result.json,
          rawText: result.text,
          model: result.model,
        }
      }

      return {
        success: false,
        error: 'No JSON output from model',
        model: result.model,
        rawText: result.text,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON refinement failed',
      }
    }
  }

  // ── Shared model caller ──────────────────────────────────────

  private async callModel(opts: CallModelOptions) {
    const baseUrl = opts.endpointUrl || OPENROUTER_BASE_URL
    const timeoutMs = opts.timeoutMs || 120000
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userContent },
      ],
      max_tokens: opts.maxTokens || 4096,
      temperature: 0.1,
    }

    // Only request JSON format when we actually need JSON parsing
    if (opts.parseJson) {
      body.response_format = { type: 'json_object' }
    }

    let response: Response
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Wilbur RewardBook',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeout)
      if (isAbortError(error)) {
        throw new Error(`AI provider request timed out after ${Math.round(timeoutMs / 1000)} seconds`)
      }
      throw error
    }

    try {
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const content = extractAssistantText(data.choices?.[0]?.message?.content)
      const model = data.model || opts.model

      if (!content) {
        return { success: false, error: 'Empty response from model', model }
      }

      if (opts.parseJson) {
        let parsed: unknown
        try {
          const jsonText = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim()
          parsed = JSON.parse(jsonText)
        } catch {
          return { success: false, error: 'Model returned invalid JSON', model, text: content }
        }
        return { success: true, json: parsed, text: content, model }
      }

      // Non-JSON mode: return raw text (vision step)
      return { success: true, text: content, model }
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(`AI provider request timed out after ${Math.round(timeoutMs / 1000)} seconds`)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  // ── Health check ─────────────────────────────────────────────

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    const config = this.visionConfig || this.textConfig
    if (!config) return { ok: false, message: 'No provider configured' }

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
      })
      return response.ok ? { ok: true } : { ok: false, message: `API returned ${response.status}` }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Connection failed' }
    }
  }
}

// ── Prompt Builders ──────────────────────────────────────────────

export function buildVisionSystemPrompt(): string {
  return `You are an OCR assistant for a parent reward tracking system.
Your job is to read all visible text from exam/assessment paper images.

Rules:
1. Return the text EXACTLY as written on the paper.
2. Preserve numbers, Chinese characters, English text, scores, and formatting.
3. If you see score information like "8/10" or "80分", include it.
4. If you see question numbers and answers, include them.
5. Do NOT add interpretation or analysis — just extract the raw text.
6. Return ONLY the extracted text, no markdown, no explanations.`
}

export function buildVisionUserPrompt(label?: string): string {
  const pageLabel = label ? ` for ${label}` : ''
  return `Please OCR this exam paper image${pageLabel}.

Return all visible text exactly as written.
Preserve line breaks when useful, numbers, Chinese/English text, score boxes, dates, question numbers, teacher marks, correction notes, and any total-score information.

Do not return JSON. Return plain OCR text only.`
}

function buildAssessmentTypesPromptLine(context: ExtractInput['context']) {
  const assessmentTypes = context.assessmentTypes || []
  if (assessmentTypes.length === 0) {
    return '- Available assessment types: none configured'
  }
  return `- Available assessment types: ${assessmentTypes
    .map((type) => `${type.type_key} (${type.display_name})`)
    .join(', ')}`
}

function buildAssessmentTypeInstruction(context: ExtractInput['context']) {
  const assessmentTypes = context.assessmentTypes || []
  if (assessmentTypes.length === 0) {
    return 'For "assessment_type", use null because no active assessment types are configured.'
  }
  const keys = assessmentTypes.map((type) => type.type_key).join(', ')
  return `For "assessment_type", use exactly one active type_key from Available assessment types: ${keys}. Do not translate the type_key. Use null if uncertain.`
}

function buildAssessmentTypeSchemaDescription(context: ExtractInput['context']) {
  const keys = (context.assessmentTypes || []).map((type) => `"${type.type_key}"`)
  return keys.length > 0 ? `${keys.join(' | ')} | null` : 'string | null'
}

export function buildTextAnalysisSystemPrompt(context: ExtractInput['context'], locale = 'zh-TW', detectMistakes = false): string {
  const gradeLine = context.grade ? `- Student grade: ${context.grade}` : ''
  const outputLanguage = locale === 'zh-TW' ? 'Traditional Chinese (zh-TW)' : 'English'
  const subjectsLine =
    context.candidateSubjects.length > 0
      ? `- Available subjects: ${context.candidateSubjects.map((s) => s.name).join(', ')}`
      : ''
  const recentPatternsLine =
    context.recentAssessmentPatterns && context.recentAssessmentPatterns.length > 0
      ? `- Recent assessment patterns: ${context.recentAssessmentPatterns.join(' | ')}`
      : ''
  const archiveHintsLine =
    context.subjectArchiveHints && context.subjectArchiveHints.length > 0
      ? `- Confirmed subject mappings from past imports: ${context.subjectArchiveHints
          .map((hint) => `"${hint.detected}" -> "${hint.subject}" (${hint.count})`)
          .join(', ')}`
      : ''

  return `You are an exam paper analysis assistant for a parent reward tracking system.
Your job is to analyze the OCR-extracted text from an exam paper and extract structured information.

Context:
${gradeLine}
${subjectsLine}
${buildAssessmentTypesPromptLine(context)}
${recentPatternsLine}
${archiveHintsLine}
- Frontend locale: ${locale}
- Required user-facing output language: ${outputLanguage}

IMPORTANT:
1. Return ONLY valid JSON, no markdown wrapping.
2. The "subject" field should be the best canonical subject from Available subjects when there is a clear match. If the paper subject is not listed, use the closest available subject and add an uncertainty explaining the mapping.
3. ${buildAssessmentTypeInstruction(context)}
4. Extract ALL visible scores and maximum scores.
5. Include an "uncertainties" array for any fields you're not confident about.
6. "confidence" should be a number 0.00-1.00 representing your overall confidence in the extraction.
7. Respect confirmed subject mappings from past imports when they are relevant.
8. In this rewardbook, Taiwanese elementary "生活" / "生活課程" should map to "社會" when "社會" is available and "生活" is not.
9. User-facing strings in JSON values such as title and uncertainty reasons must use the Required user-facing output language. Keep copied OCR answers in their original language.
${detectMistakes ? `10. For mistakes, extract: question_number, student_answer, correct_answer, mistake_type, knowledge_point, ai_reason, and confidence.
11. The "mistakes" array should only include items where there is clear evidence that the student lost points or answered incorrectly. If a mark is ambiguous, put it in "uncertainties" instead.` : ''}

JSON schema:
{
  "subject": "string (required)",
  "title": "string (optional assessment name)",
  "assessment_type": ${buildAssessmentTypeSchemaDescription(context)},
  "score": number | null,
  "max_score": number | null,
  "assessment_date": "YYYY-MM-DD" | null,
${detectMistakes ? `  "mistakes": [{
    "question_number": string | null,
    "student_answer": string | null,
    "correct_answer": string | null,
    "mistake_type": "calculation" | "concept" | "careless" | "blank" | "other" | null,
    "knowledge_point": string | null,
    "ai_reason": string | null,
    "confidence": 0.0-1.0
  }],` : ''}
  "uncertainties": [{"field": "string", "reason": "string"}],
  "confidence": 0.0-1.0
}`
}

export function buildMultimodalAssessmentSystemPrompt(context: ExtractInput['context'], locale = 'zh-TW', detectMistakes = false): string {
  const gradeLine = context.grade ? `- Student grade: ${context.grade}` : ''
  const outputLanguage = locale === 'zh-TW' ? 'Traditional Chinese (zh-TW)' : 'English'
  const subjectsLine =
    context.candidateSubjects.length > 0
      ? `- Available subjects: ${context.candidateSubjects.map((s) => s.name).join(', ')}`
      : ''
  const recentPatternsLine =
    context.recentAssessmentPatterns && context.recentAssessmentPatterns.length > 0
      ? `- Recent assessment patterns: ${context.recentAssessmentPatterns.join(' | ')}`
      : ''
  const archiveHintsLine =
    context.subjectArchiveHints && context.subjectArchiveHints.length > 0
      ? `- Confirmed subject mappings from past imports: ${context.subjectArchiveHints
          .map((hint) => `"${hint.detected}" -> "${hint.subject}" (${hint.count})`)
          .join(', ')}`
      : ''

  return `You are a multimodal exam paper analysis assistant for a parent reward tracking system.
Your job is to inspect one or more images from the same assessment and extract structured information directly from the visual evidence.

Context:
${gradeLine}
${subjectsLine}
${buildAssessmentTypesPromptLine(context)}
${recentPatternsLine}
${archiveHintsLine}
- Frontend locale: ${locale}
- Required user-facing output language: ${outputLanguage}

IMPORTANT:
1. Return ONLY valid JSON, no markdown wrapping.
2. Treat all images as pages/sides of the SAME assessment. Combine evidence across pages before deciding score, subject, date${detectMistakes ? ', and mistakes' : ''}.
3. Read the visual evidence yourself. Do not rely on a separate OCR interpretation. ${detectMistakes ? 'Pay attention to red marks, circled items, check marks, crossed-out answers, corrected answers, handwritten teacher notes, and partial-credit annotations.' : 'Focus on official fields such as title, subject, date, score, and maximum score.'}
4. The "subject" field should be the best canonical subject from Available subjects when there is a clear match. If the paper subject is not listed, use the closest available subject and add an uncertainty explaining the mapping.
5. ${buildAssessmentTypeInstruction(context)}
6. Extract ALL visible scores and maximum scores. When a score appears on only one page but the images are the same assessment, use that score for the whole assessment.
7. Include an "uncertainties" array for any fields you're not confident about.
8. "confidence" should be a number 0.00-1.00 representing your overall confidence in the extraction.
9. Respect confirmed subject mappings from past imports when they are relevant.
10. In this rewardbook, Taiwanese elementary "生活" / "生活課程" should map to "社會" when "社會" is available and "生活" is not.
11. User-facing strings in JSON values such as title and uncertainty reasons must use the Required user-facing output language. Keep copied answers in their original language.
${detectMistakes ? `12. For mistakes, extract: question_number, student_answer, correct_answer, mistake_type, knowledge_point, ai_reason, and confidence. Only include items with clear visual evidence that the student got wrong or lost points. If a mark is ambiguous, put it in "uncertainties" instead of inventing a mistake.` : ''}

JSON schema:
{
  "subject": "string (required)",
  "title": "string (optional assessment name)",
  "assessment_type": ${buildAssessmentTypeSchemaDescription(context)},
  "score": number | null,
  "max_score": number | null,
  "assessment_date": "YYYY-MM-DD" | null,
${detectMistakes ? `  "mistakes": [{
    "question_number": string | null,
    "student_answer": string | null,
    "correct_answer": string | null,
    "mistake_type": "calculation" | "concept" | "careless" | "blank" | "other" | null,
    "knowledge_point": string | null,
    "ai_reason": string | null,
    "confidence": 0.0-1.0
  }],` : ''}
  "uncertainties": [{"field": "string", "reason": "string"}],
  "confidence": 0.0-1.0
}`
}

export function buildTextAnalysisUserPrompt(ocrText: string): string {
  return `Here is the OCR model output from one exam/assessment. It may contain multiple pages and may be noisy or not formatted as JSON.
Please analyze it according to the system prompt, use the student context from the system prompt, and return the structured JSON.

OCR TEXT:
---
${ocrText}
---

Return the analysis as JSON matching the schema provided.`
}

export function buildJsonRefinementSystemPrompt(context: ExtractInput['context'], locale = 'zh-TW', detectMistakes = false): string {
  return `${buildTextAnalysisSystemPrompt(context, locale, detectMistakes)}

Additional task:
- You will receive a JSON draft produced by a vision model from the original assessment images.
- Normalize it into the final schema exactly.
- Fix invalid field names, missing nullable fields, inconsistent score/max_score, and language mismatches.
- Do not invent facts that are not present in the draft. Preserve uncertainty when evidence is weak.
${detectMistakes ? '- Keep mistake items only when the draft gives clear evidence.' : '- Return no mistake items. Omit "mistakes" or set it to an empty array.'}`
}

export function buildJsonRefinementUserPrompt(jsonText: string): string {
  return `Here is the JSON draft produced by the vision model. Please refine it into one valid JSON object matching the final schema.

VISION JSON DRAFT:
---
${jsonText}
---

Return only the refined JSON object.`
}

export function buildMultimodalAssessmentUserPrompt(imageCount: number, detectMistakes = false): string {
  return `Analyze the ${imageCount} uploaded exam paper image${imageCount > 1 ? 's' : ''} directly.

Return one JSON object matching the schema from the system prompt.
${detectMistakes ? 'Use the images as the source of truth for wrong-question detection.' : 'Do not identify individual wrong questions in this run.'}`
}
