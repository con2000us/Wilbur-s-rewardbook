'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'

// ── Types ────────────────────────────────────────────────────────

interface ProviderConfig {
  id: string
  provider: string
  purpose: string
  endpoint_url: string | null
  is_active: boolean
}

interface ProviderConfigsResponse {
  configs: ProviderConfig[]
  encryptionConfigured: boolean
  hasEncryptionSecret: boolean
}

// ── Form State ───────────────────────────────────────────────────

interface ConfigFormState {
  provider: string
  apiKey: string
  endpointUrl: string
  model: string
}

const PROVIDER_PRESETS: { value: string; label: string; defaultEndpoint: string }[] = [
  {
    value: 'tokenplan',
    label: 'Alibaba Cloud (TokenPlan)',
    defaultEndpoint:
      'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
  },
  {
    value: 'custom',
    label: 'Custom / Other',
    defaultEndpoint: '',
  },
]

// ── Component ────────────────────────────────────────────────────

export default function AiAssessmentSettings() {
  const locale = useLocale()
  const isZh = locale === 'zh-TW'

  const [encryptionConfigured, setEncryptionConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [form, setForm] = useState<ConfigFormState>({
    provider: 'tokenplan',
    apiKey: '',
    endpointUrl:
      'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.6-flash',
  })
  const [hasConfig, setHasConfig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setIsLoading(true)
    try {
      const [configRes, settingsRes] = await Promise.all([
        fetch('/api/settings/ai-provider-key'),
        fetch('/api/settings'),
      ])

      // Load model from site settings
      let modelFromSettings = 'qwen3.6-flash'
      if (settingsRes.ok) {
        const siteSettings: Record<string, string> = await settingsRes.json()
        modelFromSettings = siteSettings['ai_assessment_model_vision'] || modelFromSettings
      }

      if (configRes.ok) {
        const data: ProviderConfigsResponse = await configRes.json()
        setEncryptionConfigured(data.encryptionConfigured)

        // Find first active vision config
        const existing = data.configs.find(
          (c) => c.is_active && (c.purpose === 'vision' || c.purpose === 'both')
        )

        if (existing) {
          setHasConfig(true)
          setForm({
            provider: existing.provider,
            apiKey: '',
            endpointUrl: existing.endpoint_url || '',
            model: modelFromSettings,
          })
        } else {
          setHasConfig(false)
          setForm((prev) => ({ ...prev, model: modelFromSettings }))
        }
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const shouldUpdateKey = form.apiKey.trim().length > 0 || !hasConfig

      if (shouldUpdateKey) {
        const res = await fetch('/api/settings/ai-provider-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: form.provider || 'tokenplan',
            apiKey: form.apiKey,
            purpose: 'vision',
            endpointUrl: form.endpointUrl || null,
            label: 'OCR Vision Model',
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to save')
        }
      }

      // Save model name to site settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_assessment_model_vision', value: form.model }),
      })

      setMessage({ type: 'success', text: isZh ? '設定已儲存' : 'Settings saved' })
      setHasConfig(true)
      setForm((prev) => ({ ...prev, apiKey: '' }))
      setTimeout(() => loadConfig(), 500)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!form.apiKey && !hasConfig) {
      setMessage({
        type: 'error',
        text: isZh ? '請先輸入 API key，或先儲存此設定。' : 'Enter an API key or save this config first.',
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
          purpose: 'vision',
          provider: form.provider || 'tokenplan',
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

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {isZh ? 'AI OCR 設定' : 'AI OCR Settings'}
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-icons-outlined text-purple-600">document_scanner</span>
            {isZh ? 'AI OCR 設定' : 'AI OCR Settings'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isZh
              ? '設定 OCR 文字辨識用的 Vision API。支援 OpenAI 相容的 API 端點（如 Alibaba Cloud TokenPlan、OpenRouter 等）。'
              : 'Configure the Vision API for OCR text recognition. Supports OpenAI-compatible endpoints (Alibaba Cloud TokenPlan, OpenRouter, etc.).'}
          </p>
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

        {/* OCR Provider Config */}
        <div className="border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-purple-600">image_search</span>
              <h3 className="text-sm font-bold text-slate-800">
                {isZh ? 'Vision API 設定' : 'Vision API Config'}
              </h3>
              {hasConfig && (
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
                <select
                  value={
                    PROVIDER_PRESETS.slice(0, -1).some((p) => p.value === form.provider)
                      ? form.provider
                      : 'custom'
                  }
                  onChange={(e) => {
                    const selected = e.target.value
                    if (selected === 'custom') {
                      setForm((prev) => ({ ...prev, provider: '' }))
                    } else {
                      const preset = PROVIDER_PRESETS.find((p) => p.value === selected)
                      setForm((prev) => ({
                        ...prev,
                        provider: selected,
                        endpointUrl: preset?.defaultEndpoint || prev.endpointUrl,
                      }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  {PROVIDER_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {!PROVIDER_PRESETS.slice(0, -1).some((p) => p.value === form.provider) &&
                  form.provider && (
                  <input
                    type="text"
                    value={form.provider}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, provider: e.target.value }))
                    }
                    placeholder={isZh ? '自訂 Provider 名稱' : 'Custom provider name'}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {isZh ? 'API Endpoint' : 'API Endpoint'}
                </label>
                <input
                  type="text"
                  value={form.endpointUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, endpointUrl: e.target.value }))}
                  placeholder="https://token-plan.cn-beijing.maas.aliyuncs.com/api/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isZh ? 'API Key' : 'API Key'}
                {hasConfig && (
                  <span className="text-amber-600 ml-1">
                    ({isZh ? '留空則保留既有值' : 'leave blank to keep existing'})
                  </span>
                )}
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder={hasConfig ? (isZh ? '••••••••（輸入新 key 覆蓋）' : '•••••••• (enter new key to replace)') : 'sk-or-v1-...'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isZh ? 'Model 名稱' : 'Model Name'}
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="qwen3.6-flash"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                {isZh ? '例如：qwen3.6-flash、google/gemini-2.0-flash-001' : 'e.g. qwen3.6-flash, google/gemini-2.0-flash-001'}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || (!form.apiKey && (!hasConfig || !encryptionConfigured))}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-opacity ${
                  testing || (!form.apiKey && (!hasConfig || !encryptionConfigured))
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <span className="material-icons-outlined text-base">science</span>
                {testing ? (isZh ? '測試中...' : 'Testing...') : (isZh ? '測試連線' : 'Test Connection')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  (!hasConfig && !form.apiKey.trim()) ||
                  (!!form.apiKey.trim() && !encryptionConfigured)
                }
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-opacity ${
                  saving ||
                  (!hasConfig && !form.apiKey.trim()) ||
                  (!!form.apiKey.trim() && !encryptionConfigured)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:opacity-90'
                }`}
              >
                {saving ? (isZh ? '儲存中...' : 'Saving...') : (isZh ? '儲存設定' : 'Save Config')}
              </button>
            </div>

            {message && (
              <p className={`mt-2 text-xs ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
