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
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          🏠 {t('siteName')}
        </h2>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        🏠 {t('siteName')}
      </h2>
      
      <p className="text-gray-600 mb-4 text-sm">
        {t('siteNameDesc')}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('siteNameLabel')}
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-gray-800 text-lg"
            placeholder="Wilbur's RewardBook"
          />
        </div>

        {/* 預覽 */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">{t('preview')}:</p>
          <p className="text-2xl font-bold text-purple-800">📚 {siteName || "Wilbur's RewardBook"}</p>
        </div>

        {/* 訊息 */}
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* 按鈕 */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              hasChanges && !isSaving
                ? 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? tCommon('loading') : tCommon('save')}
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            {t('resetDefault')}
          </button>
        </div>
      </div>
    </div>
  )
}

