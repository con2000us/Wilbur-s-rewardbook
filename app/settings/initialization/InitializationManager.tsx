'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { localeNames, locales, type Locale } from '@/lib/i18n/config'

interface InitStatusResponse {
  initialized: boolean
  systemLocale: string | null
  initializedAt: string | null
  demoDataImported: boolean
  demoDataLocale: string | null
  logs: Array<{
    timestamp: string
    action: 'initialize' | 'import_demo_data'
    locale: string
    importDemoData: boolean
    success: boolean
    note?: string
  }>
}

interface HealthCheckResponse {
  hasEventKeyColumn: boolean
  hasTranslationTable: boolean
  hasRewardTypes: boolean
  eventCount: number
}

export default function InitializationManager() {
  const t = useTranslations('settingsInit')
  const [status, setStatus] = useState<InitStatusResponse | null>(null)
  const [health, setHealth] = useState<HealthCheckResponse | null>(null)
  const [selectedLocale, setSelectedLocale] = useState<Locale>('zh-TW')
  const [importDemoData, setImportDemoData] = useState(true)
  const [forceInitialize, setForceInitialize] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [importingOnly, setImportingOnly] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [statusRes, healthRes] = await Promise.all([
        fetch('/api/bootstrap/init-status'),
        fetch('/api/bootstrap/health-check'),
      ])

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setStatus(statusData)
        if (statusData.demoDataLocale && locales.includes(statusData.demoDataLocale as Locale)) {
          setSelectedLocale(statusData.demoDataLocale as Locale)
        }
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('loadFailed') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInitialize = async () => {
    setRunning(true)
    setMessage(null)
    try {
      const response = await fetch('/api/bootstrap/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: selectedLocale,
          importDemoData,
          force: forceInitialize,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('runFailed'))
      }

      if (data.alreadyInitialized) {
        setMessage({ type: 'success', text: t('alreadyInitialized') })
      } else {
        setMessage({ type: 'success', text: t('runSuccess') })
      }

      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('runFailed')}: ${error.message || 'Unknown error'}` })
    } finally {
      setRunning(false)
    }
  }

  const handleImportDemoOnly = async () => {
    setImportingOnly(true)
    setMessage(null)
    try {
      const response = await fetch('/api/bootstrap/import-demo-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: selectedLocale }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('importDemoFailed'))
      }

      setMessage({ type: 'success', text: t('importDemoSuccess') })
      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('importDemoFailed')}: ${error.message || 'Unknown error'}` })
    } finally {
      setImportingOnly(false)
    }
  }

  const isDangerousAction = forceInitialize || Boolean(status?.initialized)
  const isConfirmValid = !isDangerousAction || confirmText.trim() === 'CONFIRM'

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-24 bg-slate-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-icons-outlined text-sky-600 text-2xl">settings_suggest</span>
        <h2 className="text-2xl font-bold text-slate-800">{t('title')}</h2>
      </div>
      <p className="text-slate-600 mb-6">{t('desc')}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('statusTitle')}</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>{t('initialized')}: {status?.initialized ? t('yes') : t('no')}</li>
            <li>{t('systemLocale')}: {status?.systemLocale || '-'}</li>
            <li>{t('initializedAt')}: {status?.initializedAt || '-'}</li>
            <li>{t('demoImported')}: {status?.demoDataImported ? t('yes') : t('no')}</li>
            <li>{t('demoLocale')}: {status?.demoDataLocale || '-'}</li>
            <li>{t('eventCount')}: {health?.eventCount ?? 0}</li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('healthTitle')}</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>{health?.hasEventKeyColumn ? '✅' : '⚠️'} {t('checkEventKey')}</li>
            <li>{health?.hasTranslationTable ? '✅' : '⚠️'} {t('checkTranslationTable')}</li>
            <li>{health?.hasRewardTypes ? '✅' : '⚠️'} {t('checkRewardTypes')}</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('runTitle')}</h3>

        <div className="mb-3">
          <p className="text-xs text-slate-600 mb-2">{t('selectLocale')}</p>
          <div className="grid grid-cols-2 gap-2">
            {locales.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setSelectedLocale(loc)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  selectedLocale === loc
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {localeNames[loc]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={importDemoData}
            onChange={(e) => setImportDemoData(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span>{t('importDemoData')}</span>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-700 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={forceInitialize}
            onChange={(e) => setForceInitialize(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span>{t('forceInitialize')}</span>
        </label>

        {isDangerousAction && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 mb-4">
            <p className="text-xs text-amber-700 mb-2">{t('dangerConfirmHint')}</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CONFIRM"
              className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-slate-800 text-sm"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleInitialize}
            disabled={running || importingOnly || !isConfirmValid}
            className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {running ? t('running') : t('runButton')}
          </button>
          <button
            type="button"
            onClick={handleImportDemoOnly}
            disabled={running || importingOnly || !isConfirmValid}
            className="px-4 py-2.5 rounded-xl bg-sky-600 text-white font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {importingOnly ? t('importingDemo') : t('importDemoOnlyButton')}
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={running || importingOnly}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            {t('refresh')}
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-sm ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('logsTitle')}</h3>
        {status?.logs?.length ? (
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {status.logs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <div className="font-medium">{log.timestamp}</div>
                <div>
                  {t('logAction')}: {log.action} | {t('logLocale')}: {log.locale} | {t('logResult')}:{' '}
                  {log.success ? t('yes') : t('no')}
                </div>
                {log.note && <div className="text-slate-500">{log.note}</div>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">{t('noLogs')}</p>
        )}
      </div>
    </div>
  )
}
