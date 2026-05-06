'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Cookies from 'js-cookie'
import { localeNames, locales, type Locale } from '@/lib/i18n/config'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale() as Locale
  const t = useTranslations('login')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [needsInitialization, setNeedsInitialization] = useState(false)
  const [importDemoData, setImportDemoData] = useState(true)

  useEffect(() => {
    async function loadInitStatus() {
      try {
        const response = await fetch('/api/bootstrap/init-status')
        if (!response.ok) {
          setNeedsInitialization(false)
          return
        }
        const data = await response.json()
        setNeedsInitialization(!data.initialized)
      } catch {
        setNeedsInitialization(false)
      } finally {
        setInitLoading(false)
      }
    }

    loadInitStatus()
  }, [])

  const handleLanguageChange = (newLocale: Locale) => {
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 })
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok) {
        if (needsInitialization) {
          const initResponse = await fetch('/api/bootstrap/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              locale,
              importDemoData,
            }),
          })

          if (!initResponse.ok) {
            setError(t('initFailed'))
            return
          }
        }

        // 登入成功，重定向到原始頁面或首頁
        const redirect = searchParams.get('redirect') || '/'
        router.push(redirect)
        router.refresh()
      } else {
        if (data?.errorCode === 'INVALID_PASSWORD') {
          setError(t('invalidPassword'))
        } else {
          setError(t('tryAgainLater'))
        }
      }
    } catch (err) {
      setError(t('tryAgainLater'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app-shell flex items-center justify-center p-8">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🔒 {t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">{t('languageLabel')}</p>
          <div className="grid grid-cols-2 gap-2">
            {locales.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => handleLanguageChange(loc)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  locale === loc
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {localeNames[loc]}
              </button>
            ))}
          </div>
        </div>

        {!initLoading && needsInitialization && (
          <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-lg">
            <p className="text-sm font-semibold text-slate-700 mb-1">{t('firstSetupTitle')}</p>
            <p className="text-xs text-slate-600 mb-3">{t('firstSetupDesc')}</p>
            <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={importDemoData}
                onChange={(e) => setImportDemoData(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>
                {t('importDemoData')}
                <span className="block text-xs text-slate-500 mt-0.5">{t('importDemoDataHint')}</span>
              </span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('passwordLabel')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder={t('passwordPlaceholder')}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (needsInitialization ? t('initializing') : t('validating')) : t('login')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('footer')}
        </p>
      </div>
    </div>
  )
}

