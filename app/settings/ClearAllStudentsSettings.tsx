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
    <div className="mb-8 pb-8 border-b border-red-200 last:border-b-0">
      <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
        ⚠️ {t('clearAllStudents.title')}
      </h2>
      
      <p className="text-gray-600 mb-4 text-sm">
        {t('clearAllStudents.description')}
      </p>

      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800 font-semibold mb-1">
          💾 {t('clearAllStudents.backupSuggestionTitle')}
        </p>
        <p className="text-xs text-yellow-700">
          {t('clearAllStudents.backupSuggestionDesc')}
        </p>
      </div>

      <button
        onClick={handleClearAll}
        disabled={isDeleting}
        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
          isDeleting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
        }`}
      >
        {isDeleting ? t('clearAllStudents.deleting') : `🗑️ ${t('clearAllStudents.button')}`}
      </button>

      {/* 訊息 */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">{message.type === 'success' ? '✅' : '❌'}</span>
            <span className="whitespace-pre-line break-words">{message.text}</span>
          </div>
        </div>
      )}
    </div>
  )
}

