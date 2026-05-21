/**
 * AI service configuration loader.
 *
 * Reads from site_settings and ai_provider_configs.
 * Supports separate configs for vision (image → text) and text (OCR → JSON) steps.
 * Server-side only.
 */

import { createClient } from '@/lib/supabase/server'
import { decrypt, getEncryptionSecret } from '@/lib/crypto/encryption'
import type { AiServiceConfig, ProviderStepConfig } from './types'

function getTaipeiPeriodStarts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  return {
    todayStart: new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000),
    monthStart: new Date(Date.UTC(year, month - 1, 1) - 8 * 60 * 60 * 1000),
  }
}

export async function loadAiServiceConfig(): Promise<AiServiceConfig | null> {
  const supabase = createClient()

  // Check if feature is enabled
  const { data: enabledSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'ai_assessment_import_enabled')
    .single()

  if (!enabledSetting || enabledSetting.value !== 'true') {
    return null
  }

  // Load settings
  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [
      'ai_assessment_model_primary',
      'ai_assessment_model_vision',
      'ai_assessment_model_text',
      'ai_assessment_model_fallback',
      'ai_assessment_processing_mode',
      'ai_assessment_detect_mistakes_enabled',
      'ai_assessment_daily_limit',
      'ai_assessment_monthly_limit',
      'ai_assessment_student_daily_limit',
      'ai_assessment_max_retries',
    ])

  const s: Record<string, string> = {}
  for (const row of settings || []) {
    s[row.key] = row.value || ''
  }

  const modelPrimary = s['ai_assessment_model_primary'] || 'openrouter/free'
  const modelVision = s['ai_assessment_model_vision'] || modelPrimary
  const modelText = s['ai_assessment_model_text'] || modelPrimary
  const modelFallback = s['ai_assessment_model_fallback'] || undefined
  const processingMode =
    s['ai_assessment_processing_mode'] === 'pipeline' ? 'pipeline' : 'multimodal'
  const detectMistakes = s['ai_assessment_detect_mistakes_enabled'] === 'true'

  // Load all active provider configs
  const { data: providerConfigs } = await supabase
    .from('ai_provider_configs')
    .select('*')
    .eq('is_active', true)

  // Decrypt a single provider config
  function decryptKey(row: { encrypted_api_key: string; endpoint_url?: string | null }): string | null {
    try {
      const secret = getEncryptionSecret()
      return decrypt(row.encrypted_api_key, secret)
    } catch {
      return null
    }
  }

  // Find best config for a given purpose
  function resolveForPurpose(
    purpose: 'vision' | 'text',
    model: string,
    fallbackModel?: string
  ): ProviderStepConfig | null {
    // Prefer a config with matching purpose
    const exact = (providerConfigs || []).find((c) => c.purpose === purpose)
    if (exact) {
      const apiKey = decryptKey(exact)
      if (apiKey) {
        return {
          provider: exact.provider,
          model,
          fallbackModel,
          apiKey,
          endpointUrl: exact.endpoint_url || undefined,
        }
      }
    }

    // Fallback to a 'both' config
    const both = (providerConfigs || []).find((c) => c.purpose === 'both')
    if (both) {
      const apiKey = decryptKey(both)
      if (apiKey) {
        return {
          provider: both.provider,
          model,
          fallbackModel,
          apiKey,
          endpointUrl: both.endpoint_url || undefined,
        }
      }
    }

    return null
  }

  const vision = resolveForPurpose('vision', modelVision, modelFallback)
  const text = resolveForPurpose('text', modelText, modelFallback)

  if (!vision && !text) {
    return null // No usable provider config
  }

  return {
    processingMode,
    vision,
    text,
    detectMistakes,
    dailyLimit: parseInt(s['ai_assessment_daily_limit'], 10) || 10,
    monthlyLimit: parseInt(s['ai_assessment_monthly_limit'], 10) || 100,
    studentDailyLimit: parseInt(s['ai_assessment_student_daily_limit'], 10) || 30,
    maxRetries: parseInt(s['ai_assessment_max_retries'], 10) || 2,
  }
}

/**
 * Quick check if AI assessment feature is available.
 */
export async function getAiFeatureStatus(): Promise<{
  enabled: boolean
  processingMode: 'pipeline' | 'multimodal'
  visionConfigured: boolean
  textConfigured: boolean
  dailyRemaining: number
  monthlyRemaining: number
  reason?: string
}> {
  const supabase = createClient()

  const { data: enabledSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'ai_assessment_import_enabled')
    .single()

  if (!enabledSetting || enabledSetting.value !== 'true') {
    return {
      enabled: false,
      processingMode: 'multimodal',
      visionConfigured: false,
      textConfigured: false,
      dailyRemaining: 0,
      monthlyRemaining: 0,
      reason: '功能在站台設定中已關閉',
    }
  }

  if (!process.env.AI_PROVIDER_KEY_ENCRYPTION_SECRET) {
    return {
      enabled: true,
      processingMode: 'multimodal',
      visionConfigured: false,
      textConfigured: false,
      dailyRemaining: 0,
      monthlyRemaining: 0,
      reason: '伺服器加密密碼未設定',
    }
  }

  // Check provider configs by purpose
  const { data: configs } = await supabase
    .from('ai_provider_configs')
    .select('purpose')
    .eq('is_active', true)

  const hasVision = (configs || []).some(
    (c) => c.purpose === 'vision' || c.purpose === 'both'
  )
  const hasText = (configs || []).some(
    (c) => c.purpose === 'text' || c.purpose === 'both'
  )

  const { data: modeSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'ai_assessment_processing_mode')
    .maybeSingle()

  const processingMode = modeSetting?.value === 'pipeline' ? 'pipeline' : 'multimodal'
  const configReasons: string[] = []
  if (!hasVision) configReasons.push('缺少 Vision 模型 API key')
  if (processingMode === 'pipeline' && !hasText) configReasons.push('缺少 Text 分析 API key')

  // Count today's and this month's jobs for limits
  const { todayStart, monthStart } = getTaipeiPeriodStarts()

  const [{ count: todayCount }, { count: monthCount }] = await Promise.all([
    supabase
      .from('assessment_import_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('assessment_import_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString()),
  ])

  // Load limits
  const { data: limits } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['ai_assessment_daily_limit', 'ai_assessment_monthly_limit'])

  const limitsMap: Record<string, number> = {
    ai_assessment_daily_limit: 10,
    ai_assessment_monthly_limit: 100,
  }
  for (const row of limits || []) {
    limitsMap[row.key] = parseInt(row.value, 10) || limitsMap[row.key]
  }

  return {
    enabled: true,
    processingMode,
    visionConfigured: hasVision,
    textConfigured: hasText,
    dailyRemaining: Math.max(0, limitsMap['ai_assessment_daily_limit'] - (todayCount || 0)),
    monthlyRemaining: Math.max(0, limitsMap['ai_assessment_monthly_limit'] - (monthCount || 0)),
    reason: configReasons.length > 0 ? configReasons.join('；') : undefined,
  }
}
