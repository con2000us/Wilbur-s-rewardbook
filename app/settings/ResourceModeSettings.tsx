'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

type ResourceMode = 'free' | 'upgraded'

interface StorageUsageResponse {
  totalBytes: number
  totalFiles: number
  buckets: Array<{
    bucketId: string
    bytes: number
    files: number
    error?: string
  }>
}

const FREE_TOTAL_LIMIT_BYTES = 600 * 1024 * 1024
const FREE_SINGLE_FILE_LIMIT_BYTES = 2 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function ResourceModeSettings() {
  const t = useTranslations('settings')
  const tMessages = useTranslations('messages')
  const tCommon = useTranslations('common')

  const [resourceMode, setResourceMode] = useState<ResourceMode>('free')
  const [originalMode, setOriginalMode] = useState<ResourceMode>('free')
  const [usage, setUsage] = useState<StorageUsageResponse | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const data = await res.json()
        const mode = data.resource_mode === 'upgraded' ? 'upgraded' : 'free'
        setResourceMode(mode)
        setOriginalMode(mode)
      } catch (error) {
        console.error('Failed to load resource settings:', error)
      } finally {
        setIsLoadingSettings(false)
      }
    }

    async function loadUsage() {
      setIsLoadingUsage(true)
      try {
        const res = await fetch('/api/settings/storage-usage')
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error || 'Failed to load storage usage')
        }
        const data = (await res.json()) as StorageUsageResponse
        setUsage(data)
      } catch (error) {
        setUsage(null)
        setMessage({
          type: 'error',
          text:
            error instanceof Error
              ? `${t('resourceUsageLoadFailed')}: ${error.message}`
              : t('resourceUsageLoadFailed'),
        })
      } finally {
        setIsLoadingUsage(false)
      }
    }

    loadSettings()
    loadUsage()
  }, [t])

  const freeUsagePercent = useMemo(() => {
    if (!usage) return 0
    return Math.min(100, Math.round((usage.totalBytes / FREE_TOTAL_LIMIT_BYTES) * 100))
  }, [usage])

  const hasChanges = resourceMode !== originalMode

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    const payloads =
      resourceMode === 'free'
        ? [
            { key: 'resource_mode', value: 'free' },
            { key: 'image_total_limit_bytes', value: String(FREE_TOTAL_LIMIT_BYTES) },
            { key: 'image_single_file_limit_bytes', value: String(FREE_SINGLE_FILE_LIMIT_BYTES) },
          ]
        : [
            { key: 'resource_mode', value: 'upgraded' },
            { key: 'image_total_limit_bytes', value: '' },
            { key: 'image_single_file_limit_bytes', value: '' },
          ]

    try {
      for (const payload of payloads) {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData?.error || tMessages('saveFailed'))
        }
      }

      setOriginalMode(resourceMode)
      setMessage({ type: 'success', text: tMessages('saveSuccess') })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? `${tMessages('saveFailed')}: ${error.message}` : tMessages('saveFailed'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingSettings) {
    return (
      <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-7">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('resourceModeTitle')}</h2>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('resourceModeTitle')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('resourceModeDesc')}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsLoadingUsage(true)
              setMessage(null)
              try {
                const res = await fetch('/api/settings/storage-usage')
                if (!res.ok) {
                  const payload = await res.json().catch(() => null)
                  throw new Error(payload?.error || 'Failed to load storage usage')
                }
                const data = (await res.json()) as StorageUsageResponse
                setUsage(data)
              } catch (error) {
                setMessage({
                  type: 'error',
                  text:
                    error instanceof Error
                      ? `${t('resourceUsageLoadFailed')}: ${error.message}`
                      : t('resourceUsageLoadFailed'),
                })
              } finally {
                setIsLoadingUsage(false)
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold"
          >
            {t('refreshUsage')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label
              className={`relative flex cursor-pointer rounded-xl border bg-white p-4 shadow-sm focus:outline-none ${
                resourceMode === 'free' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="resourceMode"
                value="free"
                className="sr-only"
                checked={resourceMode === 'free'}
                onChange={() => setResourceMode('free')}
              />
              <span className="flex flex-1">
                <span className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900">{t('resourceModeFreeTitle')}</span>
                  <span className="mt-1 flex items-center text-sm text-gray-500">
                    {t('resourceModeFreeDesc', {
                      total: formatBytes(FREE_TOTAL_LIMIT_BYTES),
                      single: formatBytes(FREE_SINGLE_FILE_LIMIT_BYTES),
                    })}
                  </span>
                </span>
              </span>
            </label>

            <label
              className={`relative flex cursor-pointer rounded-xl border bg-white p-4 shadow-sm focus:outline-none ${
                resourceMode === 'upgraded' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="resourceMode"
                value="upgraded"
                className="sr-only"
                checked={resourceMode === 'upgraded'}
                onChange={() => setResourceMode('upgraded')}
              />
              <span className="flex flex-1">
                <span className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900">{t('resourceModeUpgradedTitle')}</span>
                  <span className="mt-1 flex items-center text-sm text-gray-500">{t('resourceModeUpgradedDesc')}</span>
                </span>
              </span>
            </label>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('resourceUsageTitle')}</h3>
            {isLoadingUsage ? (
              <p className="text-sm text-gray-500">{tCommon('loading')}</p>
            ) : usage ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  {t('resourceUsageSummary', {
                    size: formatBytes(usage.totalBytes),
                    files: usage.totalFiles,
                  })}
                </p>
                {resourceMode === 'free' && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${freeUsagePercent >= 90 ? 'bg-red-500' : freeUsagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${freeUsagePercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('resourceUsagePercent', {
                        percent: freeUsagePercent,
                        total: formatBytes(FREE_TOTAL_LIMIT_BYTES),
                      })}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('resourceUsageUnavailable')}</p>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

      </div>

      <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-white border border-transparent rounded-xl transition-opacity ${
            hasChanges && !isSaving ? 'bg-primary hover:opacity-90' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isSaving ? tCommon('loading') : tCommon('save')}
        </button>
      </div>
    </section>
  )
}

