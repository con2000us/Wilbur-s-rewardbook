'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

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

const FREE_TOTAL_LIMIT_BYTES = 600 * 1024 * 1024

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

  const freeUsagePercent = usage
    ? Math.min(100, Math.round((usage.totalBytes / FREE_TOTAL_LIMIT_BYTES) * 100))
    : 0

  if (isLoadingUsage && isLoadingDbStats) {
    return (
      <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-7">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('resourceUsageTitle')}</h2>
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
  )
}
