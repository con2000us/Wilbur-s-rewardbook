'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function PaginationSettings() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  
  const [itemsPerPage, setItemsPerPage] = useState<number | null>(25)
  const [originalValue, setOriginalValue] = useState<number | null>(25)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const MIN_ITEMS = 8
  const MAX_ITEMS = 100

  // 載入設定
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          const valueStr = data.items_per_page
          // 如果值為 'unlimited' 或空字串，設為 null（不限）
          const value = valueStr === 'unlimited' || valueStr === '' || valueStr === null 
            ? null 
            : parseInt(valueStr) || 25
          setItemsPerPage(value)
          setOriginalValue(value)
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
    // 如果是不限，不需要驗證範圍
    if (itemsPerPage !== null && (itemsPerPage < MIN_ITEMS || itemsPerPage > MAX_ITEMS)) {
      setMessage({ type: 'error', text: t('paginationRangeError', { min: MIN_ITEMS, max: MAX_ITEMS }) })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      // 如果是不限，保存 'unlimited'
      const valueToSave = itemsPerPage === null ? 'unlimited' : itemsPerPage.toString()
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'items_per_page', value: valueToSave })
      })

      if (res.ok) {
        setOriginalValue(itemsPerPage)
        setMessage({ type: 'success', text: tMessages('saveSuccess') })
        // 刷新頁面以應用新設定
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
    setItemsPerPage(25)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || MIN_ITEMS
    setItemsPerPage(Math.max(MIN_ITEMS, Math.min(MAX_ITEMS, value)))
  }

  const handleUnlimitedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setItemsPerPage(null) // 不限
    } else {
      setItemsPerPage(25) // 恢復預設值
    }
  }

  const hasChanges = itemsPerPage !== originalValue

  if (isLoading) {
    return (
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📄 {t('paginationSettings')}
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
        📄 {t('paginationSettings')}
      </h2>
      
      <p className="text-gray-600 mb-4 text-sm">
        {t('paginationDesc')}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('itemsPerPageLabel')}
          </label>
          
          {/* 不限選項 */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={itemsPerPage === null}
                onChange={handleUnlimitedChange}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">{t('paginationUnlimited')}</span>
            </label>
          </div>

          {/* 數值設定（當不是「不限」時顯示） */}
          {itemsPerPage !== null && (
            <>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={MIN_ITEMS}
                  max={MAX_ITEMS}
                  step="2"
                  value={itemsPerPage}
                  onChange={handleInputChange}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <input
                  type="number"
                  min={MIN_ITEMS}
                  max={MAX_ITEMS}
                  step="2"
                  value={itemsPerPage}
                  onChange={handleInputChange}
                  className="w-24 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-gray-800 text-center font-semibold"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('paginationRange', { min: MIN_ITEMS, max: MAX_ITEMS })}
              </p>
            </>
          )}
        </div>

        {/* 預覽 */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">{t('preview')}:</p>
          <p className="text-lg text-gray-800">
            {itemsPerPage === null 
              ? t('paginationPreviewUnlimited')
              : t('paginationPreview', { count: itemsPerPage })
            }
          </p>
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

