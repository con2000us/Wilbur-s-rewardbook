'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function ClearAllStudentsSettings() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleClearAll = async () => {
    const confirmMessage = '確定要刪除所有學生資料嗎？\n\n此操作將刪除：\n• 所有學生\n• 所有科目\n• 所有評量記錄\n• 所有存摺收支\n• 所有獎勵規則\n\n⚠️ 此操作無法復原！\n\n首頁設定（網站名稱、分頁設定等）將被保留。'
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    // 二次確認
    const confirmText = prompt('請輸入 "DELETE ALL" 以確認刪除所有學生資料：')
    if (confirmText !== 'DELETE ALL') {
      alert('確認文字不正確，操作已取消')
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
        throw new Error(result.error || '刪除失敗')
      }

      setMessage({ 
        type: 'success', 
        text: result.message || '已成功刪除所有學生資料' 
      })
      
      // 3秒後重新載入頁面
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
    } catch (error) {
      console.error('Clear all error:', error)
      setMessage({ 
        type: 'error', 
        text: `刪除失敗：${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mb-8 pb-8 border-b border-red-200 last:border-b-0">
      <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
        ⚠️ 刪除所有學生資料
      </h2>
      
      <p className="text-gray-600 mb-4 text-sm">
        此操作將刪除所有學生、科目、評量記錄、存摺收支和獎勵規則，但會保留首頁設定（網站名稱、分頁設定等）。
      </p>

      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800 font-semibold mb-1">
          💾 建議：執行此操作前，請先備份資料
        </p>
        <p className="text-xs text-yellow-700">
          您可以使用上方的「資料備份」功能來備份所有資料，以便需要時可以還原。
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
        {isDeleting ? '刪除中...' : '🗑️ 刪除所有學生資料'}
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

