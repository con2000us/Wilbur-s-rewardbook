'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DEFAULT_IMAGE_QUALITY_PROFILE,
  IMAGE_QUALITY_ORDER,
  IMAGE_QUALITY_SETTING_KEY,
  parseImageQualityProfile,
  type ImageQualityProfile,
} from '@/lib/imageQuality'

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

interface DBStats {
  students: number
  assessments: number
  transactions: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function ResourceModeSettings() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  const [usage, setUsage] = useState<StorageUsageResponse | null>(null)
  const [dbStats, setDbStats] = useState<DBStats | null>(null)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [isLoadingDbStats, setIsLoadingDbStats] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
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

    async function loadDbStats() {
      setIsLoadingDbStats(true)
      try {
        const res = await fetch('/api/settings/db-stats')
        if (!res.ok) throw new Error('Failed to load DB stats')
        const data = (await res.json()) as DBStats
        setDbStats(data)
      } catch {
        setDbStats(null)
      } finally {
        setIsLoadingDbStats(false)
      }
    }

    loadUsage()
    loadDbStats()
  }, [t])

  if (isLoadingUsage && isLoadingDbStats) {
    return (
      <>
        <ImageQualitySection />
        <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-7">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{t('resourceUsageTitle')}</h2>
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <ImageQualitySection />
      <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('resourceUsageTitle')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('resourceUsageDesc')}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsLoadingUsage(true)
              setIsLoadingDbStats(true)
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

              try {
                const res2 = await fetch('/api/settings/db-stats')
                if (res2.ok) {
                  const data2 = (await res2.json()) as DBStats
                  setDbStats(data2)
                }
              } catch {
                setDbStats(null)
              } finally {
                setIsLoadingDbStats(false)
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold"
          >
            {t('refreshUsage')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('resourceUsageStorageTitle')}</h3>
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
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('resourceUsageUnavailable')}</p>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('resourceUsageDBStats')}</h3>
            {isLoadingDbStats ? (
              <p className="text-sm text-gray-500">{tCommon('loading')}</p>
            ) : dbStats ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  {t('resourceUsageDBStudents', { count: dbStats.students })}
                </p>
                <p className="text-sm text-gray-700">
                  {t('resourceUsageDBAssessments', { count: dbStats.assessments })}
                </p>
                <p className="text-sm text-gray-700">
                  {t('resourceUsageDBTransactions', { count: dbStats.transactions })}
                </p>
                <p className="text-sm text-gray-700 font-medium pt-2 border-t border-slate-200">
                  {t('resourceUsageDBTotalRecords', {
                    count: dbStats.students + dbStats.assessments + dbStats.transactions,
                  })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('resourceUsageUnavailable')}</p>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg mt-4 ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </section>
    </>
  )
}

// ----------------------------------------------------------------------------
// Image Quality Section
// ponytail: 同檔放小元件，避免新檔；500ms debounce 寫回 /api/settings
// ----------------------------------------------------------------------------

function ImageQualitySection() {
  const t = useTranslations('settings.imageQuality')
  const [profile, setProfile] = useState<ImageQualityProfile>(DEFAULT_IMAGE_QUALITY_PROFILE)
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveGenerationRef = useRef(0)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setProfile(parseImageQualityProfile(data[IMAGE_QUALITY_SETTING_KEY]))
        }
      })
      .catch((err) => {
        console.error('[ResourceModeSettings] Failed to load image quality settings:', err)
      })
      .finally(() => setLoaded(true))
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  const handleProfileChange = (next: ImageQualityProfile) => {
    setProfile(next)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    setSaveStatus('saving')
    const generation = ++saveGenerationRef.current
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: IMAGE_QUALITY_SETTING_KEY, value: next }),
        })
        if (!res.ok) throw new Error('save failed')
        // Only update status if no newer save has been initiated
        if (saveGenerationRef.current === generation) {
          setSaveStatus('saved')
        }
      } catch {
        if (saveGenerationRef.current === generation) {
          setSaveStatus('error')
        }
      }
      statusTimerRef.current = setTimeout(() => {
        if (saveGenerationRef.current === generation) {
          setSaveStatus('idle')
        }
      }, 1500)
    }, 500)
  }

  const sliderIndex = IMAGE_QUALITY_ORDER.indexOf(profile)
  const selectedKey = profile

  // ponytail: 寫死每個 profile 有哪些 optional key（避免 next-intl 在缺 key 時拋 MISSING_MESSAGE）
  const OPTIONAL_KEYS: Record<ImageQualityProfile, { ocrHint?: boolean; useCaseHint?: boolean; tagline?: boolean }> = {
    eco:      { ocrHint: true },
    normal:   { ocrHint: true },
    standard: { tagline: true },
    high:     { useCaseHint: true },
    original: { ocrHint: true },
  }
  const optional = OPTIONAL_KEYS[selectedKey]
  const ocrHint = optional.ocrHint ? t(`${selectedKey}.ocrHint`) : ''
  const useCaseHint = optional.useCaseHint ? t(`${selectedKey}.useCaseHint`) : ''
  const tagline = optional.tagline ? t(`${selectedKey}.tagline`) : ''

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('sectionTitle')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('sectionDesc')}</p>
          </div>
          <div className="text-xs text-slate-500 min-h-[20px]" aria-live="polite">
            {saveStatus === 'saving' && t('saving')}
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 font-semibold">✓ {t('saved')}</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-600 font-semibold">{t('saveFailed')}</span>
            )}
          </div>
        </div>

        {/* 滑桿：自訂軌道 + 檔位 dot + 拇指，原生 input 透明疊在上層負責互動/鍵盤/無障礙 */}
        <div className="px-1 sm:px-2 pt-2 pb-1">
          <div className="relative h-5">
            {/* 底軌 */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-slate-200" />
            {/* 已選區間 */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-sky-500"
              style={{ width: `${(sliderIndex / (IMAGE_QUALITY_ORDER.length - 1)) * 100}%` }}
            />
            {/* 各檔位 dot */}
            {IMAGE_QUALITY_ORDER.map((key, idx) => {
              const pct = (idx / (IMAGE_QUALITY_ORDER.length - 1)) * 100
              const passed = idx <= sliderIndex
              return (
                <span
                  key={key}
                  className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
                    passed ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                  style={{ left: `${pct}%` }}
                />
              )
            })}
            {/* 目前檔位拇指 */}
            <span
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-md transition-[left] pointer-events-none"
              style={{ left: `${(sliderIndex / (IMAGE_QUALITY_ORDER.length - 1)) * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={IMAGE_QUALITY_ORDER.length - 1}
              step={1}
              value={sliderIndex}
              onChange={e => handleProfileChange(IMAGE_QUALITY_ORDER[Number(e.target.value)])}
              disabled={!loaded}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              aria-label={t('sectionTitle')}
            />
          </div>
          <div className="relative mt-3 h-9 text-[11px] sm:text-xs">
            {IMAGE_QUALITY_ORDER.map((key, idx) => {
              const lastIdx = IMAGE_QUALITY_ORDER.length - 1
              const pct = (idx / lastIdx) * 100
              const isActive = key === profile
              // ponytail: 頭尾貼齊邊緣（避免溢出），中間以刻度點為中心
              const transform = idx === 0
                ? 'translateX(0)'
                : idx === lastIdx
                  ? 'translateX(-100%)'
                  : 'translateX(-50%)'
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleProfileChange(key)}
                  className={`absolute top-0 whitespace-nowrap cursor-pointer transition-colors ${
                    isActive ? 'font-bold text-sky-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={{ left: `${pct}%`, transform }}
                >
                  {t(`labels.${key}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* 當前檔位說明卡片 */}
        <div className="mt-4 bg-slate-50 rounded-xl p-5 border border-slate-100">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-base font-bold text-slate-800">{t(`${selectedKey}.title`)}</h3>
            {tagline && (
              <span className="text-xs font-semibold text-sky-600">· {tagline}</span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-3">{t(`${selectedKey}.summary`)}</p>

          <ul className="space-y-1.5 text-sm">
            <li className="flex gap-2">
              <span className="text-emerald-600 font-bold flex-shrink-0">✅</span>
              <span className="text-slate-700">{t(`${selectedKey}.pros`)}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-600 font-bold flex-shrink-0">⚠️</span>
              <span className="text-slate-700">{t(`${selectedKey}.cons`)}</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0">📦</span>
              <span className="text-slate-700">
                <span className="font-semibold">{t(`${selectedKey}.sizeRange`)}</span>
                <span className="text-slate-500"> ・ {t(`${selectedKey}.capacity`)}</span>
              </span>
            </li>
            {useCaseHint && (
              <li className="flex gap-2 text-slate-500 italic">
                <span className="flex-shrink-0">💡</span>
                <span>{useCaseHint}</span>
              </li>
            )}
            {ocrHint && (
              <li className="flex gap-2 text-slate-500 italic">
                <span className="flex-shrink-0">💡</span>
                <span>{ocrHint}</span>
              </li>
            )}
          </ul>
        </div>

        <p className="text-xs text-slate-400 mt-3 italic">ⓘ {t('applyHint')}</p>
      </div>
    </section>
  )
}
