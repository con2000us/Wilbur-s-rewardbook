'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function SiteNameSettings() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  
  const [siteName, setSiteName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 載入設定
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          const name = data.site_name || "Wilbur's RewardBook"
          setSiteName(name)
          setOriginalName(name)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  // 保存設定
  const handleSave = async () => {
    if (!siteName.trim()) {
      setMessage({ type: 'error', text: t('siteNameRequired') })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'site_name', value: siteName.trim() })
      })

      if (res.ok) {
        setOriginalName(siteName.trim())
        setMessage({ type: 'success', text: tMessages('saveSuccess') })
        // 刷新頁面以更新標題
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage({ type: 'error', text: tMessages('saveFailed') })
      }
    } catch (error) {
      setMessage({ type: 'error', text: tMessages('saveFailed') })
    } finally {
      setIsSaving(false)
    }
  }

  // 重置為預設
  const handleReset = () => {
    setSiteName("Wilbur's RewardBook")
  }

  const hasChanges = siteName !== originalName

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-7">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('siteName')}</h2>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">{t('siteName')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('siteNameDesc')}</p>
        </div>

        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('siteNameLabel')}</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              placeholder="Wilbur's RewardBook"
            />
          </div>

          <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-sm text-slate-500 mr-2">{t('preview')}：</span>
            <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
              {siteName || "Wilbur's RewardBook"}
            </span>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={handleReset}
          className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          {t('resetDefault')}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-white border border-transparent rounded-xl flex items-center justify-center transition-opacity ${
            hasChanges && !isSaving ? 'bg-primary hover:opacity-90' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isSaving ? tCommon('loading') : tCommon('save')}
        </button>
      </div>
    </section>
  )
}

