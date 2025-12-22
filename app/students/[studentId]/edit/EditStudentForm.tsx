'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

const AVATAR_EMOJIS = [
  '😊', '😃', '😎', '🤓', '🧐', '😇', '🥳', '🤩',
  '😄', '😁', '😆', '😋', '😍', '🤗', '🤔', '😴',
  '😌', '😏', '😉', '🙂', '😀', '😅', '😂', '🤣',
  '👦', '👧', '🧒', '👨‍🎓', '👩‍🎓', '🦸', '🦸‍♀️', '🧙',
  '👨', '👩', '👶', '🧑', '👱', '👴', '👵', '🧑‍💼',
  '🧑‍🔬', '🧑‍🏫', '🧑‍⚕️', '🧑‍🎨', '🧑‍🚀', '🧑‍✈️', '🧑‍🏭', '🧑‍💻',
  '🤴', '👸', '🦁', '🐯', '🐰', '🐻', '🐼', '🐨',
  '🐶', '🐱', '🐸', '🐷'
]

const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-green-400 to-green-600',
  'from-yellow-400 to-yellow-600',
  'from-red-400 to-red-600',
  'from-indigo-400 to-indigo-600',
  'from-teal-400 to-teal-600',
]

interface Student {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
}

interface Props {
  student: Student
  onSuccess?: () => void
  isModal?: boolean
}

export default function EditStudentForm({ student, onSuccess, isModal = false }: Props) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('studentManagement')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // 將 Tailwind 漸變類名轉換為 hex 顏色
  const gradientToHex = (gradient: string): string => {
    // 從 "from-blue-400 to-blue-600" 提取主色
    const match = gradient.match(/from-(\w+)-(\d+)/)
    if (match) {
      const [, colorName, shade] = match
      // 簡單映射 Tailwind 顏色到 hex
      const colorMap: Record<string, Record<string, string>> = {
        blue: { '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb' },
        purple: { '400': '#a78bfa', '500': '#9333ea', '600': '#7e22ce' },
        pink: { '400': '#f472b6', '500': '#ec4899', '600': '#db2777' },
        green: { '400': '#4ade80', '500': '#22c55e', '600': '#16a34a' },
        yellow: { '400': '#facc15', '500': '#eab308', '600': '#ca8a04' },
        red: { '400': '#f87171', '500': '#ef4444', '600': '#dc2626' },
        indigo: { '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5' },
        teal: { '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488' },
      }
      return colorMap[colorName]?.[shade] || '#3b82f6'
    }
    return '#3b82f6' // 預設藍色
  }

  // 將 hex 顏色轉換為較深的版本（用於漸變效果）
  const hexToDarker = (hex: string, factor: number = 0.7): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    
    const darkerR = Math.floor(r * factor)
    const darkerG = Math.floor(g * factor)
    const darkerB = Math.floor(b * factor)
    
    return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`
  }

  // 將 hex 顏色轉換為 Tailwind 漸變類名
  // 由於 Tailwind 不支援動態類名，我們使用內聯樣式來實現自定義漸變
  // 但為了保持與現有系統的兼容性，我們仍然嘗試匹配最接近的 Tailwind 顏色
  const hexToGradient = (hex: string): string => {
    // 確保 hex 格式正確（轉為小寫並確保有 #）
    const normalizedHex = hex.toLowerCase().startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`
    
    // 精確匹配的顏色映射（擴展更多顏色）
    const hexToColorMap: Record<string, string> = {
      '#60a5fa': 'from-blue-400 to-blue-600',
      '#3b82f6': 'from-blue-500 to-blue-700',
      '#2563eb': 'from-blue-600 to-blue-800',
      '#93c5fd': 'from-blue-300 to-blue-500',
      '#1d4ed8': 'from-blue-700 to-blue-900',
      '#a78bfa': 'from-purple-400 to-purple-600',
      '#9333ea': 'from-purple-500 to-purple-700',
      '#7e22ce': 'from-purple-600 to-purple-800',
      '#c4b5fd': 'from-purple-300 to-purple-500',
      '#6b21a8': 'from-purple-700 to-purple-900',
      '#f472b6': 'from-pink-400 to-pink-600',
      '#ec4899': 'from-pink-500 to-pink-700',
      '#db2777': 'from-pink-600 to-pink-800',
      '#f9a8d4': 'from-pink-300 to-pink-500',
      '#be185d': 'from-pink-700 to-pink-900',
      '#4ade80': 'from-green-400 to-green-600',
      '#22c55e': 'from-green-500 to-green-700',
      '#16a34a': 'from-green-600 to-green-800',
      '#86efac': 'from-green-300 to-green-500',
      '#15803d': 'from-green-700 to-green-900',
      '#facc15': 'from-yellow-400 to-yellow-600',
      '#eab308': 'from-yellow-500 to-yellow-700',
      '#ca8a04': 'from-yellow-600 to-yellow-800',
      '#fde047': 'from-yellow-300 to-yellow-500',
      '#a16207': 'from-yellow-700 to-yellow-900',
      '#f87171': 'from-red-400 to-red-600',
      '#ef4444': 'from-red-500 to-red-700',
      '#dc2626': 'from-red-600 to-red-800',
      '#fca5a5': 'from-red-300 to-red-500',
      '#b91c1c': 'from-red-700 to-red-900',
      '#818cf8': 'from-indigo-400 to-indigo-600',
      '#6366f1': 'from-indigo-500 to-indigo-700',
      '#4f46e5': 'from-indigo-600 to-indigo-800',
      '#a5b4fc': 'from-indigo-300 to-indigo-500',
      '#4338ca': 'from-indigo-700 to-indigo-900',
      '#2dd4bf': 'from-teal-400 to-teal-600',
      '#14b8a6': 'from-teal-500 to-teal-700',
      '#0d9488': 'from-teal-600 to-teal-800',
      '#5eead4': 'from-teal-300 to-teal-500',
      '#0f766e': 'from-teal-700 to-teal-900',
    }
    
    // 如果找到精確匹配，直接返回
    if (hexToColorMap[normalizedHex]) {
      return hexToColorMap[normalizedHex]
    }
    
    // 否則，根據 hex 值找到最接近的顏色
    const r = parseInt(normalizedHex.slice(1, 3), 16)
    const g = parseInt(normalizedHex.slice(3, 5), 16)
    const b = parseInt(normalizedHex.slice(5, 7), 16)
    
    // 計算亮度
    const brightness = (r + g + b) / 3
    
    // 判斷主要色相（改進邏輯 - 使用 HSL 色相判斷）
    const maxComponent = Math.max(r, g, b)
    const minComponent = Math.min(r, g, b)
    const delta = maxComponent - minComponent
    
    // 計算色相（HSL）
    let hue = 0
    if (delta !== 0) {
      if (maxComponent === r) {
        hue = ((g - b) / delta) % 6
      } else if (maxComponent === g) {
        hue = (b - r) / delta + 2
      } else {
        hue = (r - g) / delta + 4
      }
      hue = hue * 60
      if (hue < 0) hue += 360
    }
    
    // 判斷色相範圍（按優先順序，避免重疊）
    if (delta < 30) {
      // 接近灰色，使用藍色
      return brightness > 180 ? 'from-blue-400 to-blue-600' : 'from-blue-500 to-blue-700'
    } else if (hue >= 270 && hue < 330) {
      // 紫色系 (270-330度) - 優先判斷
      return brightness > 180 ? 'from-purple-400 to-purple-600' : 'from-purple-500 to-purple-700'
    } else if (hue >= 300 && hue < 360) {
      // 粉色/洋紅色系 (300-360度)
      return brightness > 200 ? 'from-pink-400 to-pink-600' : 'from-pink-500 to-pink-700'
    } else if ((hue >= 0 && hue < 30) || (hue >= 330 && hue < 360)) {
      // 紅色系 (0-30度 或 330-360度)
      return brightness > 180 ? 'from-red-400 to-red-600' : 'from-red-500 to-red-700'
    } else if (hue >= 60 && hue < 120) {
      // 黃色/黃綠色系 (60-120度)
      return brightness > 220 ? 'from-yellow-400 to-yellow-600' : 'from-yellow-500 to-yellow-700'
    } else if (hue >= 120 && hue < 180) {
      // 綠色系 (120-180度)
      return brightness > 180 ? 'from-green-400 to-green-600' : 'from-green-500 to-green-700'
    } else if (hue >= 180 && hue < 210) {
      // 青色系 (180-210度)
      return brightness > 180 ? 'from-teal-400 to-teal-600' : 'from-teal-500 to-teal-700'
    } else if (hue >= 210 && hue < 270) {
      // 藍色/靛藍色系 (210-270度)
      return brightness > 180 ? 'from-blue-400 to-blue-600' : 'from-blue-500 to-blue-700'
    }
    
    // 預設藍色
    return 'from-blue-400 to-blue-600'
  }

  // 解析現有的頭像（如果是 emoji:color 格式）
  const parseAvatar = (avatarUrl: string | null) => {
    if (!avatarUrl) return { emoji: '😊', hex: '#3b82f6' }
    if (avatarUrl.startsWith('emoji:')) {
      const parts = avatarUrl.replace('emoji:', '').split('|')
      const colorPart = parts[1] || '#3b82f6'
      // 判斷是 hex 顏色還是舊的 Tailwind 類名
      const hex = colorPart.startsWith('#') ? colorPart : gradientToHex(colorPart)
      return {
        emoji: parts[0] || '😊',
        hex: hex
      }
    }
    return { emoji: '😊', hex: '#3b82f6' }
  }

  const parsedAvatar = parseAvatar(student.avatar_url)
  const [selectedEmoji, setSelectedEmoji] = useState(parsedAvatar.emoji)
  const [selectedColorHex, setSelectedColorHex] = useState(parsedAvatar.hex)
  const [showAllEmojis, setShowAllEmojis] = useState(false)
  
  // 計算要顯示的 emoji 數量（預設只顯示 2 行，每行 10 個 = 20 個）
  const displayedEmojis = showAllEmojis ? AVATAR_EMOJIS : AVATAR_EMOJIS.slice(0, 20)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    
    // 直接儲存 hex 顏色值，不再轉換成 Tailwind 類名
    const colorToSave = selectedColorHex || '#3b82f6' // 預設藍色
    
    try {
      const response = await fetch('/api/students/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          name: formData.get('name'),
          email: formData.get('email'),
          avatar_emoji: selectedEmoji,
          avatar_color: colorToSave,
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        // 如果是 Modal 模式，使用回調函數；否則重新載入頁面
        if (isModal && onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 1500)
        } else {
          // 完整重新載入頁面以確保顏色正確顯示
          setTimeout(() => {
            window.location.href = '/'
          }, 1500)
        }
      } else {
        console.error('❌ Update failed:', result)
        setError(result.error || t('updateFailed'))
      }
    } catch (err) {
      console.error('Update error:', err)
      setError(t('errorOccurred') + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 匯出學生個人記錄
  const handleExport = async () => {
    setIsExporting(true)
    setError('')
    
    try {
      const response = await fetch(`/api/students/${student.id}/export`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export student data')
      }

      // 下載檔案
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `student-${student.name}-${new Date().toISOString().split('T')[0]}.json`
      
      a.download = decodeURIComponent(filename)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Export error:', error)
      setError(error instanceof Error ? error.message : t('exportFailed'))
    } finally {
      setIsExporting(false)
    }
  }

  // 驗證備份格式
  const validateBackupFormat = (backup: any): { valid: boolean; error?: string } => {
    // 檢查基本結構
    if (!backup || typeof backup !== 'object') {
      return { valid: false, error: t('invalidJSONFormat') }
    }

    // 檢查版本和類型
    if (!backup.version) {
      return { valid: false, error: t('invalidBackupVersion') }
    }

    if (backup.type !== 'student_export') {
      return { valid: false, error: t('invalidBackupType') }
    }

    // 檢查資料結構
    if (!backup.data || typeof backup.data !== 'object') {
      return { valid: false, error: t('invalidBackupData') }
    }

    // 檢查必要的資料欄位
    const requiredFields = ['student', 'subjects', 'assessments', 'transactions', 'reward_rules']
    const missingFields = requiredFields.filter(field => !(field in backup.data))
    
    if (missingFields.length > 0) {
      const fieldsText = missingFields.join(locale === 'zh-TW' ? '、' : ', ')
      return { 
        valid: false, 
        error: t('invalidBackupFields', { fields: fieldsText })
      }
    }

    // 檢查學生 ID 是否匹配
    if (backup.student_id && backup.student_id !== student.id) {
      return { 
        valid: false, 
        error: t('invalidBackupStudentId', { backupId: backup.student_id, currentId: student.id })
      }
    }

    // 檢查學生資料
    if (!backup.data.student || typeof backup.data.student !== 'object') {
      return { valid: false, error: t('invalidBackupStudentData') }
    }

    // 檢查陣列欄位是否為陣列
    const arrayFields = ['subjects', 'assessments', 'transactions', 'reward_rules']
    const invalidArrayFields = arrayFields.filter(field => 
      !Array.isArray(backup.data[field])
    )
    
    if (invalidArrayFields.length > 0) {
      const fieldsText = invalidArrayFields.join(locale === 'zh-TW' ? '、' : ', ')
      return { 
        valid: false, 
        error: t('invalidBackupArrays', { fields: fieldsText })
      }
    }

    return { valid: true }
  }

  // 處理檔案選擇
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setError(t('selectJSONFile'))
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsImporting(true)
    setError('')

    try {
      // 讀取檔案內容
      const text = await file.text()
      
      // 嘗試解析 JSON
      let backup: any
      try {
        backup = JSON.parse(text)
      } catch (parseError) {
        throw new Error(t('jsonParseFailed'))
      }

      // 驗證備份格式
      const validation = validateBackupFormat(backup)
      if (!validation.valid) {
        throw new Error(validation.error || t('backupValidationFailed'))
      }

      // 確認匯入
      const confirmMessage = `${t('importConfirm', { name: student.name })}\n\n${t('importWarning')}\n${t('importWarningItems')}\n\n${t('importWarningFinal')}`
      if (!confirm(confirmMessage)) {
        setIsImporting(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      const response = await fetch(`/api/students/${student.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup })
      })

      const result = await response.json()

      if (!response.ok) {
        // 處理後端返回的詳細錯誤訊息
        const detailsText = typeof result.details === 'string' ? result.details : JSON.stringify(result.details)
        const errorMessage = result.details 
          ? `${result.error}\n\n${locale === 'zh-TW' ? '詳細資訊：' : 'Details: '}${detailsText}`
          : result.error || t('importFailed')
        throw new Error(errorMessage)
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        // 如果是 Modal 模式，使用回調函數；否則重新載入頁面
        if (isModal && onSuccess) {
          onSuccess()
        } else {
          // 重新載入頁面以顯示更新後的資料
          window.location.reload()
        }
      }, 2000)
    } catch (error) {
      console.error('Import error:', error)
      // 顯示友好的錯誤訊息
      const errorMessage = error instanceof Error 
        ? error.message 
        : t('importFailedFormat')
      setError(errorMessage)
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDelete() {
    const deleteConfirmMessage = `${t('deleteConfirm')}\n\n⚠️ ${t('deleteWarning')}\n• ${t('deleteWarning2')}\n• ${t('deleteWarning3')}\n• ${t('deleteWarning4')}\n• ${t('deleteWarning5')}\n\n${t('deleteWarningFinal')}`
    if (!confirm(deleteConfirmMessage)) {
      return
    }

    const confirmText = prompt(t('deleteConfirmPrompt'))
    if (confirmText !== student.name) {
      alert(t('deleteConfirmMismatch'))
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/students/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(t('deleteSuccess'))
        // 刪除成功後，無論是否為 Modal 模式，都跳轉到首頁
        if (isModal) {
          // Modal 模式下，先關閉 Modal，然後跳轉到首頁
          if (onSuccess) {
            onSuccess()
          }
          // 使用 window.location 確保完整跳轉
          setTimeout(() => {
            window.location.href = '/'
          }, 200)
        } else {
          router.push('/')
          router.refresh()
        }
      } else {
        setError(result.error || t('deleteFailed'))
      }
    } catch (err) {
      setError(t('errorOccurred') + (err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* 一般錯誤提示（非匯入相關錯誤） */}
      {error && !error.includes('JSON') && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 whitespace-pre-line">❌ {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">✅ {t('updateSuccess')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
         {/* 第一行：頭像和基本資料 */}
         <div className="flex items-start gap-6 mb-6">
           {/* 大頭照 */}
           <div className="flex-shrink-0" style={{ marginTop: '2%' }}>
             <div 
               className="w-32 h-32 rounded-full flex items-center justify-center text-white text-6xl shadow-xl"
               style={{
                 background: `linear-gradient(to bottom right, ${selectedColorHex}, ${hexToDarker(selectedColorHex)})`
               }}
             >
               {selectedEmoji}
             </div>
           </div>

          {/* 學生姓名和 Email */}
          <div className="flex-1 max-w-md space-y-4">
            {/* 學生姓名 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('studentNameRequired')}
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={student.name}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('studentNamePlaceholder')}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('emailOptional')}
              </label>
              <input
                name="email"
                type="email"
                defaultValue={student.email || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('emailPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* 第二行：選擇背景顏色和選擇 Emoji */}
        <div className="flex items-start gap-6 mb-6">
          {/* 選擇背景顏色 */}
          <div className="flex-shrink-0 w-32">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('selectColor')}
            </label>
            <div className="flex flex-col gap-2" style={{ minHeight: '131px' }}>
              <input
                name="color"
                type="color"
                required
                value={selectedColorHex}
                onChange={(e) => {
                  const hex = e.target.value
                  setSelectedColorHex(hex)
                }}
                className="h-12 w-full border border-gray-300 rounded-lg cursor-pointer"
              />
              <div 
                className="px-4 py-2 rounded-full text-white font-semibold text-sm text-center"
                style={{
                  background: `linear-gradient(to bottom right, ${selectedColorHex}, ${hexToDarker(selectedColorHex)})`
                }}
              >
                {t('preview')}
              </div>
            </div>
          </div>

          {/* 選擇 Emoji */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('selectEmoji')}
              </label>
              {AVATAR_EMOJIS.length > 20 && (
                <button
                  type="button"
                  onClick={() => setShowAllEmojis(!showAllEmojis)}
                  className="px-3 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 font-semibold cursor-pointer"
                >
                  {showAllEmojis ? t('showLessEmojis') : t('showMoreEmojis')}
                </button>
              )}
            </div>
            <div 
              className="overflow-y-hidden overflow-x-visible transition-all duration-500 ease-in-out"
              style={{
                maxHeight: showAllEmojis ? '500px' : '115px',
                padding: '8px'
              }}
            >
              <div className="grid grid-cols-10 gap-2">
                {displayedEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`text-2xl p-1.5 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center cursor-pointer ${
                      selectedEmoji === emoji
                        ? 'border-blue-500 bg-blue-50 scale-110'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 資料匯出/匯入 */}
        <div className="border-t-2 border-blue-200 pt-6 mt-6">
          <h3 className="text-lg font-bold text-blue-600 mb-4">📦 {t('dataExportImport')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('dataExportImportDesc')}
          </p>
          
          {/* 匯入錯誤提示（僅在匯入相關錯誤時顯示） */}
          {error && error.includes('JSON') && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm whitespace-pre-line">❌ {error}</p>
            </div>
          )}
          
          <div className="flex gap-4 flex-wrap">
            {/* 匯出按鈕 */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || loading || deleting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer flex items-center gap-2"
            >
              <span>📥</span>
              <span>{isExporting ? t('exporting') : t('exportJSON')}</span>
            </button>
            
            {/* 匯入按鈕 */}
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || loading || deleting}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer flex items-center gap-2"
              >
                <span>📤</span>
                <span>{isImporting ? t('importing') : t('importJSON')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || success || deleting || isExporting || isImporting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none text-lg cursor-pointer"
          >
            {loading ? tMessages('updating') : success ? `✅ ${tMessages('updated')}` : `💾 ${tMessages('saveChanges')}`}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading || deleting || isExporting || isImporting}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
        </div>

        {/* 危險區域：刪除 */}
        <div className="border-t-2 border-red-200 pt-6 mt-6">
          <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ {t('dangerZone')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('deleteWarning')}
          </p>
          <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
            <li>{t('deleteWarning1')}</li>
            <li>{t('deleteWarning2')}</li>
            <li>{t('deleteWarning3')}</li>
            <li>{t('deleteWarning4')}</li>
            <li>{t('deleteWarning5')}</li>
            <li className="text-red-600 font-bold">{t('deleteWarningFinal')}</li>
          </ul>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleting || success || isExporting || isImporting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none font-semibold cursor-pointer"
          >
            {deleting ? t('deleting') : `🗑️ ${t('deleteThisStudent')}`}
          </button>
        </div>
      </form>
    </>
  )
}

