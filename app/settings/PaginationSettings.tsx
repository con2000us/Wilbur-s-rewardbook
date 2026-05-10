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
      <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-7">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('paginationSettings')}</h2>
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
          <h2 className="text-lg font-bold text-slate-800">{t('paginationSettings')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('paginationDesc')}</p>
        </div>

        <div className="space-y-5 max-w-xl">
          <div className="flex items-center">
            <input
              id="unlimited-pagination"
              type="checkbox"
              checked={itemsPerPage === null}
              onChange={handleUnlimitedChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="unlimited-pagination" className="ml-2 block text-sm text-slate-900 cursor-pointer">
              {t('paginationUnlimited')}
            </label>
          </div>

          <div className={`p-4 border border-slate-200 rounded-xl bg-white space-y-4 transition-opacity ${itemsPerPage === null ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-slate-700">{t('itemsPerPageLabel')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={MIN_ITEMS}
                  max={MAX_ITEMS}
                  step={2}
                  value={itemsPerPage ?? 25}
                  onChange={handleInputChange}
                  className="w-20 px-2 py-1 text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
                <span className="text-sm text-slate-500">筆</span>
              </div>
            </div>
            <input
              type="range"
              min={MIN_ITEMS}
              max={MAX_ITEMS}
              step={2}
              value={itemsPerPage ?? 25}
              onChange={handleInputChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-slate-500">{t('paginationRange', { min: MIN_ITEMS, max: MAX_ITEMS })}</p>
          </div>

          <p className="text-sm font-medium text-blue-600">
            {itemsPerPage === null 
              ? t('paginationPreviewUnlimited')
              : t('paginationPreview', { count: itemsPerPage })
            }
          </p>

          {message && (
            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
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
          className={`w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-white border border-transparent rounded-xl transition-opacity ${hasChanges && !isSaving ? 'bg-primary hover:opacity-90' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          {isSaving ? tCommon('loading') : tCommon('save')}
        </button>
      </div>
    </section>
  )
}

