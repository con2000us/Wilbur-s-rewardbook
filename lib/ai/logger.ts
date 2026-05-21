/**
 * AI Assessment Logging
 *
 * Logs LLM calls (prompts + responses) to the database for debugging and verification.
 * Automatically trims to the last 30 entries.
 */

import { createClient } from '@/lib/supabase/server'

interface InsertAiLogParams {
  jobId: string
  purpose: 'vision' | 'text' | 'multimodal'
  provider?: string
  model?: string
  systemPrompt: string
  userPrompt: string
  rawResponse: string
  success: boolean
  errorMessage?: string
  durationMs: number
}

/**
 * Insert an AI call log and trim to the last 30 entries.
 * Fire-and-forget — does not throw on failure.
 */
export async function insertAiLog(params: InsertAiLogParams) {
  try {
    const supabase = createClient()
    await supabase.from('ai_assessment_logs').insert({
      job_id: params.jobId,
      purpose: params.purpose,
      provider: params.provider || null,
      model: params.model || null,
      system_prompt: params.systemPrompt,
      user_prompt: params.userPrompt,
      raw_response: params.rawResponse,
      success: params.success,
      error_message: params.errorMessage || null,
      duration_ms: params.durationMs,
    })

    // Trim to last 30 entries (fire-and-forget)
    trimOldLogs(supabase).catch(() => {})
  } catch {
    // Logging should never break the main flow
  }
}

async function trimOldLogs(supabase: ReturnType<typeof createClient>) {
  try {
    const { data } = await supabase
      .from('ai_assessment_logs')
      .select('id')
      .order('created_at', { ascending: false })
      .range(30, 999999)

    if (data && data.length > 0) {
      const ids = data.map((row: { id: string }) => row.id)
      await supabase.from('ai_assessment_logs').delete().in('id', ids)
    }
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Build a compact user prompt for logging (strips base64 image data).
 */
export function buildLoggableUserPrompt(
  purpose: 'vision' | 'text' | 'multimodal',
  details: {
    ocrText?: string
    imageCount?: number
    textPrompt?: string
  }
): string {
  if (purpose === 'vision' && details.imageCount != null) {
    return `[Image analysis request — ${details.imageCount} image(s), base64 data omitted]\n\nPlease read all visible text from this exam paper...`
  }
  if (purpose === 'multimodal' && details.imageCount != null) {
    return (
      (details.textPrompt || '') +
      `\n\n[${details.imageCount} image(s) attached, base64 data omitted]`
    )
  }
  return details.ocrText || details.textPrompt || ''
}
