'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function ClearAllStudentsSettings() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleClearAll = async () => {
    const confirmMessage = t('clearAllStudents.confirmMessage')
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    // 二次確認
    const requiredText = t('clearAllStudents.requiredConfirmText')
    const confirmText = prompt(t('clearAllStudents.confirmPrompt', { text: requiredText }))
    if (confirmText !== requiredText) {
      alert(t('clearAllStudents.confirmTextMismatch'))
      return
    }

    setIsDeleting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/system/clear-all-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('clearAllStudents.deleteFailed'))
      }

      setMessage({ 
        type: 'success', 
        text: result.message || t('clearAllStudents.deleteSuccess')
      })
      
      // 3秒後重新載入頁面
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
    } catch (error) {
      console.error('Clear all error:', error)
      setMessage({ 
        type: 'error', 
        text: `${t('clearAllStudents.deleteFailed')}：${error instanceof Error ? error.message : t('clearAllStudents.unknownError')}` 
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="bg-red-50 rounded-2xl border border-red-200 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7">
        <h2 className="text-lg font-bold text-red-700 mb-3">{t('clearAllStudents.title')}</h2>
        <p className="text-sm text-red-900/80 mb-4">{t('clearAllStudents.description')}</p>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl mb-4">
          <p className="text-sm text-amber-800 font-bold mb-1">{t('clearAllStudents.backupSuggestionTitle')}</p>
          <p className="text-xs text-amber-700">{t('clearAllStudents.backupSuggestionDesc')}</p>
        </div>
      </div>

      <div className="bg-red-100/50 px-6 py-4 border-t border-red-200 flex sm:justify-end">
        <button
          onClick={handleClearAll}
          disabled={isDeleting}
          className={`w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-white border border-transparent rounded-xl transition-colors ${
            isDeleting ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-sm'
          }`}
        >
          {isDeleting ? t('clearAllStudents.deleting') : t('clearAllStudents.button')}
        </button>
      </div>

      {message && (
        <div className="px-6 pb-6">
          <div className={`mt-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            <span className="whitespace-pre-line break-words">{message.text}</span>
          </div>
        </div>
      )}
    </section>
  )
}

