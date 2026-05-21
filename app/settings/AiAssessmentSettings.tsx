'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'

// ── Types ────────────────────────────────────────────────────────

interface ProviderConfig {
  id: string
  provider: string
  label: string | null
  purpose: 'vision' | 'text' | 'both'
  endpoint_url: string | null
  is_active: boolean
  key_version: string
  created_at: string
  updated_at: string
}

interface ProviderConfigsResponse {
  configs: ProviderConfig[]
  encryptionConfigured: boolean
  hasEncryptionSecret: boolean
}

interface AiFeatureStatus {
  enabled: boolean
  processingMode: 'pipeline' | 'multimodal'
  visionConfigured: boolean
  textConfigured: boolean
  dailyRemaining: number
  monthlyRemaining: number
  reason?: string
}

// ── Form State ───────────────────────────────────────────────────

interface ConfigFormState {
  provider: string
  apiKey: string
  endpointUrl: string
  model: string
}

// ── Component ────────────────────────────────────────────────────

export default function AiAssessmentSettings() {
  const locale = useLocale()
  const isZh = locale === 'zh-TW'

  const [configs, setConfigs] = useState<ProviderConfig[]>([])
  const [featureStatus, setFeatureStatus] = useState<AiFeatureStatus | null>(null)
  const [encryptionConfigured, setEncryptionConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Vision form state
  const [visionForm, setVisionForm] = useState<ConfigFormState>({
    provider: 'openrouter',
    apiKey: '',
    endpointUrl: '',
    model: '',
  })
  const [visionHasConfig, setVisionHasConfig] = useState(false)
  const [visionSaving, setVisionSaving] = useState(false)
  const [visionTesting, setVisionTesting] = useState(false)

  // Text form state
  const [textForm, setTextForm] = useState<ConfigFormState>({
    provider: 'openrouter',
    apiKey: '',
    endpointUrl: '',
    model: '',
  })
  const [textHasConfig, setTextHasConfig] = useState(false)
  const [textSaving, setTextSaving] = useState(false)
  const [textTesting, setTextTesting] = useState(false)

  // Messages
  const [visionMessage, setVisionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [textMessage, setTextMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [featureMessage, setFeatureMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [limitMessage, setLimitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [modeMessage, setModeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [limitSaving, setLimitSaving] = useState(false)
  const [modeSaving, setModeSaving] = useState(false)
  const [processingMode, setProcessingMode] = useState<'pipeline' | 'multimodal'>('multimodal')
  const [limitForm, setLimitForm] = useState({
    dailyLimit: '10',
    monthlyLimit: '100',
    studentDailyLimit: '30',
  })
  const [detectMistakesEnabled, setDetectMistakesEnabled] = useState(false)
  const [mistakeDetectionSaving, setMistakeDetectionSaving] = useState(false)
  const [mistakeDetectionMessage, setMistakeDetectionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setIsLoading(true)
    try {
      const [configRes, statusRes, siteSettingsRes] = await Promise.all([
        fetch('/api/settings/ai-provider-key'),
        fetch('/api/ai-assessment/status'),
        fetch('/api/settings'),
      ])

      // Load site settings for model names
      let siteSettings: Record<string, string> = {}
      if (siteSettingsRes.ok) {
        siteSettings = await siteSettingsRes.json()
      }

      setLimitForm({
        dailyLimit: siteSettings['ai_assessment_daily_limit'] || '10',
        monthlyLimit: siteSettings['ai_assessment_monthly_limit'] || '100',
        studentDailyLimit: siteSettings['ai_assessment_student_daily_limit'] || '30',
      })
      setProcessingMode(siteSettings['ai_assessment_processing_mode'] === 'pipeline' ? 'pipeline' : 'multimodal')
      setDetectMistakesEnabled(siteSettings['ai_assessment_detect_mistakes_enabled'] === 'true')

      if (configRes.ok) {
        const data: ProviderConfigsResponse = await configRes.json()
        setConfigs(data.configs)
        setEncryptionConfigured(data.encryptionConfigured)

        // Populate vision form
        const visionConfig = data.configs.find((c) => c.purpose === 'vision')
        const bothConfig = data.configs.find((c) => c.purpose === 'both')
        const effectiveVision = visionConfig || bothConfig

        const visionModel = siteSettings['ai_assessment_model_vision'] || ''

        if (effectiveVision) {
          setVisionHasConfig(true)
          setVisionForm({
            provider: effectiveVision.provider,
            apiKey: '',
            endpointUrl: effectiveVision.endpoint_url || '',
            model: visionModel,
          })
        } else {
          setVisionHasConfig(false)
          setVisionForm((prev) => ({ ...prev, model: visionModel }))
        }

        // Populate text form
        const textConfig = data.configs.find((c) => c.purpose === 'text')
        const effectiveText = textConfig || bothConfig

        const textModel = siteSettings['ai_assessment_model_text'] || ''

        if (effectiveText) {
          setTextHasConfig(true)
          setTextForm({
            provider: effectiveText.provider,
            apiKey: '',
            endpointUrl: effectiveText.endpoint_url || '',
            model: textModel,
          })
        } else {
          setTextHasConfig(false)
          setTextForm((prev) => ({ ...prev, model: textModel }))
        }
      }

      if (statusRes.ok) {
        const status: AiFeatureStatus = await statusRes.json()
        setFeatureStatus(status)
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveVision() {
    setVisionSaving(true)
    setVisionMessage(null)

    try {
      const shouldUpdateKey = visionForm.apiKey.trim().length > 0 || !visionHasConfig

      if (shouldUpdateKey) {
        const res = await fetch('/api/settings/ai-provider-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: visionForm.provider || 'openrouter',
            apiKey: visionForm.apiKey,
            purpose: 'vision',
            endpointUrl: visionForm.endpointUrl || null,
            label: 'Vision LLM (圖片→文字)',
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to save')
        }
      }

      // Save model name
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_assessment_model_vision', value: visionForm.model }),
      })

      setVisionMessage({ type: 'success', text: isZh ? 'Vision 設定已儲存' : 'Vision config saved' })
      setVisionHasConfig(true)
      setVisionForm((prev) => ({ ...prev, apiKey: '' }))
      // Reload to get updated configs
      setTimeout(() => loadAll(), 500)
    } catch (error) {
      setVisionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save',
      })
    } finally {
      setVisionSaving(false)
    }
  }

  async function handleSaveText() {
    setTextSaving(true)
    setTextMessage(null)

    try {
      const shouldUpdateKey = textForm.apiKey.trim().length > 0 || !textHasConfig

      if (shouldUpdateKey) {
        const res = await fetch('/api/settings/ai-provider-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: textForm.provider || 'openrouter',
            apiKey: textForm.apiKey,
            purpose: 'text',
            endpointUrl: textForm.endpointUrl || null,
            label: 'Text LLM (OCR→JSON)',
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to save')
        }
      }

      // Save model name
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_assessment_model_text', value: textForm.model }),
      })

      setTextMessage({ type: 'success', text: isZh ? 'Text 設定已儲存' : 'Text config saved' })
      setTextHasConfig(true)
      setTextForm((prev) => ({ ...prev, apiKey: '' }))
      setTimeout(() => loadAll(), 500)
    } catch (error) {
      setTextMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save',
      })
    } finally {
      setTextSaving(false)
    }
  }

  async function handleTestProvider(purpose: 'vision' | 'text') {
    const isVision = purpose === 'vision'
    const form = isVision ? visionForm : textForm
    const hasConfig = isVision ? visionHasConfig : textHasConfig
    const setTesting = isVision ? setVisionTesting : setTextTesting
    const setMessage = isVision ? setVisionMessage : setTextMessage

    if (!form.apiKey && !hasConfig) {
      setMessage({
        type: 'error',
        text: isZh ? '請先輸入 API key，或先儲存此模型設定。' : 'Enter an API key or save this model config first.',
      })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings/ai-provider-key/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          provider: form.provider || 'openrouter',
          apiKey: form.apiKey || undefined,
          endpointUrl: form.endpointUrl || null,
          model: form.model || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Provider test failed')
      }

      setMessage({
        type: 'success',
        text: isZh
          ? `測試成功：${data.model || form.model || 'default'}（${data.durationMs || 0}ms）`
          : `Test passed: ${data.model || form.model || 'default'} (${data.durationMs || 0}ms)`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Provider test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleToggleFeature() {
    const newValue = featureStatus?.enabled ? 'false' : 'true'
    setFeatureMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_assessment_import_enabled', value: newValue }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update')
      }

      setFeatureMessage({
        type: 'success',
        text: newValue === 'true'
          ? (isZh ? 'AI 評量匯入已啟用' : 'AI Assessment Import enabled')
          : (isZh ? 'AI 評量匯入已停用' : 'AI Assessment Import disabled'),
      })
      // Reload status
      const statusRes = await fetch('/api/ai-assessment/status')
      if (statusRes.ok) {
        const status: AiFeatureStatus = await statusRes.json()
        setFeatureStatus(status)
      }
    } catch (error) {
      setFeatureMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update',
      })
    }
  }

  async function handleSaveLimits() {
    setLimitSaving(true)
    setLimitMessage(null)

    try {
      const limits = [
        { key: 'ai_assessment_daily_limit', value: limitForm.dailyLimit || '10' },
        { key: 'ai_assessment_monthly_limit', value: limitForm.monthlyLimit || '100' },
        { key: 'ai_assessment_student_daily_limit', value: limitForm.studentDailyLimit || '30' },
      ]

      const responses = await Promise.all(
        limits.map((setting) =>
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(setting),
          })
        )
      )

      const failed = responses.find((res) => !res.ok)
      if (failed) {
        const err = await failed.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save limits')
      }

      setLimitMessage({
        type: 'success',
        text: isZh ? '用量限制已儲存' : 'Usage limits saved',
      })

      const statusRes = await fetch('/api/ai-assessment/status')
      if (statusRes.ok) {
        const status: AiFeatureStatus = await statusRes.json()
        setFeatureStatus(status)
      }
    } catch (error) {
      setLimitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save limits',
      })
    } finally {
      setLimitSaving(false)
    }
  }

  async function handleSaveProcessingMode() {
    setModeSaving(true)
    setModeMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_assessment_processing_mode', value: processingMode }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save processing mode')
      }

      setModeMessage({
        type: 'success',
        text: isZh ? '辨識模式已儲存' : 'Recognition mode saved',
      })

      const statusRes = await fetch('/api/ai-assessment/status')
      if (statusRes.ok) {
        const status: AiFeatureStatus = await statusRes.json()
        setFeatureStatus(status)
      }
    } catch (error) {
      setModeMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save processing mode',
      })
    } finally {
      setModeSaving(false)
    }
  }

  async function handleToggleMistakeDetection() {
    const newValue = detectMistakesEnabled ? 'false' : 'true'
    setMistakeDetectionMessage(null)
    setMistakeDetectionSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_assessment_detect_mistakes_enabled', value: newValue }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update')
      }

      setDetectMistakesEnabled(newValue === 'true')
      setMistakeDetectionMessage({
        type: 'success',
        text: newValue === 'true'
          ? (isZh ? '錯題辨識已啟用' : 'Mistake detection enabled')
          : (isZh ? '錯題辨識已停用' : 'Mistake detection disabled'),
      })
    } catch (error) {
      setMistakeDetectionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update',
      })
    } finally {
      setMistakeDetectionSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {isZh ? 'AI 評量匯入設定' : 'AI Assessment Settings'}
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </section>
    )
  }

  // Determine overall status
  const activeProcessingMode = featureStatus?.processingMode || processingMode
  const overallReady = Boolean(
    featureStatus?.enabled &&
    featureStatus?.visionConfigured &&
    (activeProcessingMode === 'multimodal' || featureStatus?.textConfigured)
  )

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="material-icons-outlined text-purple-600">smart_toy</span>
              {isZh ? 'AI 評量匯入設定' : 'AI Assessment Settings'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isZh
                ? '設定 AI 評量匯入功能。需要準備兩組 API key（文本 LLM 和識圖 LLM），每組可獨立指定提供者與端點。'
                : 'Configure AI assessment import. You need two API keys (text LLM and vision LLM), each with its own provider and endpoint.'}
            </p>
          </div>
          <a
            href="/settings/ai-logs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-50 border border-purple-200 text-sm font-semibold text-purple-700 hover:bg-purple-100 transition"
          >
            <span className="material-icons-outlined text-base">history</span>
            {isZh ? 'AI Log' : 'AI Log'}
          </a>
        </div>

        {/* Encryption Secret Status */}
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          encryptionConfigured
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className="material-icons-outlined text-base">
            {encryptionConfigured ? 'check_circle' : 'error'}
          </span>
          {encryptionConfigured
            ? (isZh ? '伺服器加密密碼已設定 ✓' : 'Server encryption secret configured ✓')
            : (isZh ? '⚠️ 尚未設定 AI_PROVIDER_KEY_ENCRYPTION_SECRET，請在 .env 中設定' : '⚠️ AI_PROVIDER_KEY_ENCRYPTION_SECRET not set in .env')}
        </div>

        {/* Overall Feature Toggle */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isZh ? '功能開關' : 'Feature Toggle'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isZh ? '開啟後前端才會顯示「AI 匯入」入口' : 'When enabled, AI Import will appear in the assessment form'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleFeature}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                featureStatus?.enabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  featureStatus?.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {featureMessage && (
            <p className={`mt-2 text-xs ${
              featureMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {featureMessage.text}
            </p>
          )}
        </div>

        {/* Recognition Mode */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-700">
                {isZh ? '辨識模式' : 'Recognition Mode'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isZh
                  ? '一段式會讓多模態模型直接看圖片並產生 JSON；兩段式保留 OCR → 文本梳理流程。'
                  : 'One-step lets the multimodal model inspect images and return JSON directly; pipeline keeps OCR → text structuring.'}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setProcessingMode('multimodal')}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    processingMode === 'multimodal'
                      ? 'border-purple-300 bg-purple-50 text-purple-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {isZh ? '一段式多模態' : 'One-step Multimodal'}
                  </span>
                  <span className="mt-1 block text-xs">
                    {isZh ? '圖片 → 結構化 JSON，錯題判讀以視覺證據為主' : 'Images → structured JSON, mistake detection uses visual evidence'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProcessingMode('pipeline')}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    processingMode === 'pipeline'
                      ? 'border-purple-300 bg-purple-50 text-purple-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {isZh ? '兩段式 Pipeline' : 'Two-step Pipeline'}
                  </span>
                  <span className="mt-1 block text-xs">
                    {isZh ? 'OCR-only 模型可用；先讀文字，再由 Text LLM 梳理 JSON' : 'OCR-only models supported; read text first, then Text LLM structures JSON'}
                  </span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveProcessingMode}
              disabled={modeSaving}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-opacity ${
                modeSaving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:opacity-90'
              }`}
            >
              <span className="material-icons-outlined text-base">save</span>
              {modeSaving ? (isZh ? '儲存中...' : 'Saving...') : (isZh ? '儲存模式' : 'Save Mode')}
            </button>
          </div>
          {modeMessage && (
            <p className={`mt-2 text-xs ${
              modeMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {modeMessage.text}
            </p>
          )}
        </div>

        {/* Mistake Detection Toggle */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {isZh ? '錯題辨識' : 'Mistake Detection'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isZh
                  ? '關閉後 AI 不會辨識個別錯題，僅擷取科目、分數等基本資訊。預設關閉（因準確率尚不穩定）'
                  : 'When disabled, AI will not detect individual mistakes, only capture basic info. Default off (accuracy is still unreliable).'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleMistakeDetection}
              disabled={mistakeDetectionSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                detectMistakesEnabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  detectMistakesEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
            <span className="material-icons-outlined text-xs">warning</span>
            {isZh ? '目前 AI 辨識錯題的準確率不高，建議僅在測試時開啟。' : 'AI mistake detection accuracy is currently low; recommended for testing only.'}
          </p>
          {mistakeDetectionMessage && (
            <p className={`mt-2 text-xs ${
              mistakeDetectionMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {mistakeDetectionMessage.text}
            </p>
          )}
        </div>

        {/* Usage Limits */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-700">
                {isZh ? '用量限制' : 'Usage Limits'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isZh ? '調整全站與單一學生的 AI 匯入次數上限' : 'Adjust site-wide and per-student AI import caps'}
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    {isZh ? '全站每日上限' : 'Site daily'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={limitForm.dailyLimit}
                    onChange={(e) => setLimitForm((prev) => ({ ...prev, dailyLimit: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    {isZh ? '全站每月上限' : 'Site monthly'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={limitForm.monthlyLimit}
                    onChange={(e) => setLimitForm((prev) => ({ ...prev, monthlyLimit: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    {isZh ? '每位學生每日上限' : 'Per-student daily'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={limitForm.studentDailyLimit}
                    onChange={(e) => setLimitForm((prev) => ({ ...prev, studentDailyLimit: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveLimits}
              disabled={limitSaving}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-opacity ${
                limitSaving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:opacity-90'
              }`}
            >
              <span className="material-icons-outlined text-base">save</span>
              {limitSaving ? (isZh ? '儲存中...' : 'Saving...') : (isZh ? '儲存限制' : 'Save Limits')}
            </button>
          </div>
          {limitMessage && (
            <p className={`mt-2 text-xs ${
              limitMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {limitMessage.text}
            </p>
          )}
        </div>

        {/* Overall Status */}
        {featureStatus && (
          <div className={`p-3 rounded-lg text-sm ${
            overallReady
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span className="material-icons-outlined text-base">
                {overallReady ? 'check_circle' : 'info'}
              </span>
              {overallReady
                ? (isZh ? '✓ AI 評量匯入已可正常使用' : '✓ AI Assessment Import is ready')
                : (isZh ? '⚠️ 部分設定尚未就緒' : '⚠️ Some settings are not ready')}
            </div>
            {featureStatus.reason && (
              <p className="text-xs ml-6">{featureStatus.reason}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-4 text-xs ml-6">
              <span className="text-slate-600">
                {isZh ? '模式' : 'Mode'}: {activeProcessingMode === 'multimodal' ? (isZh ? '一段式' : 'One-step') : 'Pipeline'}
              </span>
              <span className={featureStatus.visionConfigured ? 'text-green-600' : 'text-red-500'}>
                {isZh ? '多模態/識圖模型' : 'Multimodal/Vision'}: {featureStatus.visionConfigured ? '✓' : '✗'}
              </span>
              <span className={featureStatus.textConfigured || activeProcessingMode === 'multimodal' ? 'text-green-600' : 'text-red-500'}>
                {isZh ? '文本模型' : 'Text'}: {featureStatus.textConfigured ? '✓' : activeProcessingMode === 'multimodal' ? (isZh ? '選用' : 'optional') : '✗'}
              </span>
              <span className="text-slate-600">
                {isZh ? '每日剩餘' : 'Daily'}: {featureStatus.dailyRemaining}
              </span>
              <span className="text-slate-600">
                {isZh ? '每月剩餘' : 'Monthly'}: {featureStatus.monthlyRemaining}
              </span>
            </div>
          </div>
        )}

        {/* ── Vision LLM Config ─────────────────────────────── */}
        <div className="border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-blue-600">image_search</span>
              <h3 className="text-sm font-bold text-slate-800">
                {isZh ? '① 多模態 / 識圖 LLM（圖片 → JSON 或 OCR）' : '① Multimodal / Vision LLM (Images → JSON or OCR)'}
              </h3>
              {visionHasConfig && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  {isZh ? '已設定' : 'Configured'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isZh ? 'Provider' : 'Provider'}
                </label>
                <input
                  type="text"
                  value={visionForm.provider}
                  onChange={(e) => setVisionForm((prev) => ({ ...prev, provider: e.target.value }))}
                  placeholder="openrouter"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isZh ? 'API Endpoint（選填）' : 'API Endpoint (optional)'}
                </label>
                <input
                  type="text"
                  value={visionForm.endpointUrl}
                  onChange={(e) => setVisionForm((prev) => ({ ...prev, endpointUrl: e.target.value }))}
                  placeholder="https://openrouter.ai/api/v1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isZh ? 'API Key' : 'API Key'}
                {visionHasConfig && (
                  <span className="text-amber-600 ml-1">
                    ({isZh ? '留空則保留既有值' : 'leave blank to keep existing'})
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={visionForm.apiKey}
                  onChange={(e) => setVisionForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={visionHasConfig ? (isZh ? '••••••••（輸入新 key 覆蓋）' : '•••••••• (enter new key to replace)') : 'sk-or-v1-...'}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isZh ? 'Model 名稱 (OpenRouter 格式如 openai/gpt-4o)' : 'Model Name (OpenRouter format, e.g. openai/gpt-4o)'}
              </label>
              <input
                type="text"
                value={visionForm.model}
                onChange={(e) => setVisionForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="google/gemini-2.0-flash-001"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                {isZh ? '留空則使用預設模型 (openrouter/free)' : 'Leave blank to use default model (openrouter/free)'}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleTestProvider('vision')}
                disabled={visionTesting || (!visionForm.apiKey && (!visionHasConfig || !encryptionConfigured))}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-opacity ${
                  visionTesting || (!visionForm.apiKey && (!visionHasConfig || !encryptionConfigured))
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <span className="material-icons-outlined text-base">science</span>
                {visionTesting ? (isZh ? '測試中...' : 'Testing...') : (isZh ? '測試 Vision' : 'Test Vision')}
              </button>
              <button
                type="button"
                onClick={handleSaveVision}
                disabled={
                  visionSaving ||
                  (!visionHasConfig && !visionForm.apiKey.trim()) ||
                  (!!visionForm.apiKey.trim() && !encryptionConfigured)
                }
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-opacity ${
                  visionSaving ||
                  (!visionHasConfig && !visionForm.apiKey.trim()) ||
                  (!!visionForm.apiKey.trim() && !encryptionConfigured)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:opacity-90'
                }`}
              >
                {visionSaving ? (isZh ? '儲存中...' : 'Saving...') : (isZh ? '儲存 Vision 設定' : 'Save Vision Config')}
              </button>
            </div>

            {visionMessage && (
              <p className={`mt-2 text-xs ${
                visionMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {visionMessage.text}
              </p>
            )}
          </div>
        </div>

        {/* ── Text LLM Config ──────────────────────────────── */}
        <div className="border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-green-600">description</span>
              <h3 className="text-sm font-bold text-slate-800">
                {isZh ? '② 文本 LLM（Pipeline 模式：OCR 文字 → 結構化 JSON）' : '② Text LLM (Pipeline mode: OCR Text → Structured JSON)'}
              </h3>
              {textHasConfig && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  {isZh ? '已設定' : 'Configured'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isZh ? 'Provider' : 'Provider'}
                </label>
                <input
                  type="text"
                  value={textForm.provider}
                  onChange={(e) => setTextForm((prev) => ({ ...prev, provider: e.target.value }))}
                  placeholder="openrouter"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isZh ? 'API Endpoint（選填）' : 'API Endpoint (optional)'}
                </label>
                <input
                  type="text"
                  value={textForm.endpointUrl}
                  onChange={(e) => setTextForm((prev) => ({ ...prev, endpointUrl: e.target.value }))}
                  placeholder="https://openrouter.ai/api/v1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isZh ? 'API Key' : 'API Key'}
                {textHasConfig && (
                  <span className="text-amber-600 ml-1">
                    ({isZh ? '留空則保留既有值' : 'leave blank to keep existing'})
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={textForm.apiKey}
                  onChange={(e) => setTextForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={textHasConfig ? (isZh ? '••••••••（輸入新 key 覆蓋）' : '•••••••• (enter new key to replace)') : 'sk-or-v1-...'}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isZh ? 'Model 名稱 (OpenRouter 格式如 openai/gpt-4o-mini)' : 'Model Name (OpenRouter format, e.g. openai/gpt-4o-mini)'}
              </label>
              <input
                type="text"
                value={textForm.model}
                onChange={(e) => setTextForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="openai/gpt-4o-mini"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                {isZh ? '留空則使用預設模型 (openrouter/free)' : 'Leave blank to use default model (openrouter/free)'}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleTestProvider('text')}
                disabled={textTesting || (!textForm.apiKey && (!textHasConfig || !encryptionConfigured))}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-opacity ${
                  textTesting || (!textForm.apiKey && (!textHasConfig || !encryptionConfigured))
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <span className="material-icons-outlined text-base">science</span>
                {textTesting ? (isZh ? '測試中...' : 'Testing...') : (isZh ? '測試 Text' : 'Test Text')}
              </button>
              <button
                type="button"
                onClick={handleSaveText}
                disabled={
                  textSaving ||
                  (!textHasConfig && !textForm.apiKey.trim()) ||
                  (!!textForm.apiKey.trim() && !encryptionConfigured)
                }
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-opacity ${
                  textSaving ||
                  (!textHasConfig && !textForm.apiKey.trim()) ||
                  (!!textForm.apiKey.trim() && !encryptionConfigured)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:opacity-90'
                }`}
              >
                {textSaving ? (isZh ? '儲存中...' : 'Saving...') : (isZh ? '儲存 Text 設定' : 'Save Text Config')}
              </button>
            </div>

            {textMessage && (
              <p className={`mt-2 text-xs ${
                textMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {textMessage.text}
              </p>
            )}
          </div>
        </div>

        {/* Configuration Summary */}
        {(visionHasConfig || textHasConfig) && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-semibold text-slate-600 mb-2">
              {isZh ? '當前設定摘要' : 'Configuration Summary'}
            </h4>
            <div className="space-y-1 text-xs text-slate-600">
              {configs.filter((c) => c.is_active).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    c.purpose === 'vision' ? 'bg-blue-500' : c.purpose === 'text' ? 'bg-green-500' : 'bg-purple-500'
                  }`} />
                  <span className="font-semibold">{c.provider}</span>
                  <span className="text-slate-400">|</span>
                  <span>{c.purpose === 'vision' ? 'Vision' : c.purpose === 'text' ? 'Text' : 'Both'}</span>
                  {c.endpoint_url && (
                    <>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-500 truncate max-w-[200px]">{c.endpoint_url}</span>
                    </>
                  )}
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    {isZh ? '已啟用' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
