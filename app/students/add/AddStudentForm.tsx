'use client'

import { useRef, useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { EMOJI_CATEGORIES, findEmojiCategory } from '@/app/lib/constants/emojiCategories'

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

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AddStudentForm({ onSuccess, onCancel }: Props) {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const tStudentManagement = useTranslations('studentManagement')
  const locale = useLocale()
  const importFileInputRef = useRef<HTMLInputElement>(null)
  // 將 Tailwind 漸變類名轉換為 hex 顏色
  const gradientToHex = (gradient: string): string => {
    const match = gradient.match(/from-(\w+)-(\d+)/)
    if (match) {
      const [, colorName, shade] = match
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
    return '#3b82f6'
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

  const [loading, setLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('😊')
  const [selectedColorHex, setSelectedColorHex] = useState('#3b82f6') // 預設藍色
  const [selectedCategory, setSelectedCategory] = useState<string>(
    Object.keys(EMOJI_CATEGORIES)[0] || '表情'
  )
  const [emojiSearchTerm, setEmojiSearchTerm] = useState('')
  
  // 當選擇的 Emoji 改變時，自動切換到正確的分類
  useEffect(() => {
    const category = findEmojiCategory(selectedEmoji)
    if (category && category !== selectedCategory) {
      setSelectedCategory(category)
    }
  }, [selectedEmoji])
  
  // 獲取當前分類的 Emoji，並支持搜索
  const getFilteredEmojis = () => {
    const categoryEmojis = EMOJI_CATEGORIES[selectedCategory] || []
    if (!emojiSearchTerm) return categoryEmojis
    // 簡單搜索：如果搜索詞是 Emoji 本身，直接匹配
    return categoryEmojis.filter(emoji => emoji === emojiSearchTerm)
  }
  
  const filteredEmojis = getFilteredEmojis()

  // 驗證備份格式（建立新學生用，不驗證 student_id）
  const validateCreateBackupFormat = (backup: any): { valid: boolean; error?: string } => {
    if (!backup || typeof backup !== 'object') {
      return { valid: false, error: tStudentManagement('invalidJSONFormat') }
    }
    if (!backup.version) {
      return { valid: false, error: tStudentManagement('invalidBackupVersion') }
    }
    if (backup.type !== 'student_export') {
      return { valid: false, error: tStudentManagement('invalidBackupType') }
    }
    if (!backup.data || typeof backup.data !== 'object') {
      return { valid: false, error: tStudentManagement('invalidBackupData') }
    }

    const requiredFields = ['student', 'subjects', 'assessments', 'transactions', 'reward_rules']
    const missingFields = requiredFields.filter((field) => !(field in backup.data))
    if (missingFields.length > 0) {
      const fieldsText = missingFields.join(locale === 'zh-TW' ? '、' : ', ')
      return { valid: false, error: tStudentManagement('invalidBackupFields', { fields: fieldsText }) }
    }

    if (!backup.data.student || typeof backup.data.student !== 'object') {
      return { valid: false, error: tStudentManagement('invalidBackupStudentData') }
    }

    const arrayFields = ['subjects', 'assessments', 'transactions', 'reward_rules']
    const invalidArrayFields = arrayFields.filter((field) => !Array.isArray(backup.data[field]))
    if (invalidArrayFields.length > 0) {
      const fieldsText = invalidArrayFields.join(locale === 'zh-TW' ? '、' : ', ')
      return { valid: false, error: tStudentManagement('invalidBackupArrays', { fields: fieldsText }) }
    }

    return { valid: true }
  }

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setError(tStudentManagement('selectJSONFile'))
      if (importFileInputRef.current) importFileInputRef.current.value = ''
      return
    }

    setIsImporting(true)
    setError('')

    try {
      const text = await file.text()
      let backup: any
      try {
        backup = JSON.parse(text)
      } catch {
        throw new Error(tStudentManagement('jsonParseFailed'))
      }

      const validation = validateCreateBackupFormat(backup)
      if (!validation.valid) {
        throw new Error(validation.error || tStudentManagement('backupValidationFailed'))
      }

      const name = backup?.student_name || backup?.data?.student?.name || ''
      const confirmMessage = `${tStudentManagement('importCreateConfirm', { name })}\n\n${tStudentManagement('importCreateWarning')}`
      if (!confirm(confirmMessage)) {
        return
      }

      const response = await fetch('/api/students/import-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup }),
      })

      const result = await response.json()
      if (!response.ok) {
        const detailsText = typeof result.details === 'string' ? result.details : JSON.stringify(result.details)
        const errorMessage = result.details
          ? `${result.error}\n\n${tStudentManagement('detailsPrefix')}${detailsText}`
          : result.error || tMessages('createFailed')
        throw new Error(errorMessage)
      }

      // 成功後沿用既有 onSuccess 行為（Modal 會關閉並刷新列表）
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tStudentManagement('importFailedFormat'))
    } finally {
      setIsImporting(false)
      if (importFileInputRef.current) importFileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    // 直接儲存 hex 顏色值，不再轉換成 Tailwind 類名
    const colorToSave = selectedColorHex || '#3b82f6' // 預設藍色
    
    try {
      const response = await fetch('/api/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          avatar_emoji: selectedEmoji,
          avatar_color: colorToSave,
        })
      })

      const result = await response.json()

      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(result.error || tMessages('saveFailed') || '創建失敗，請稍後再試')
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 第一行：頭像和基本資料（對齊 Edit Student 的版面） */}
        <div className="flex items-start gap-6 mb-6">
          {/* 大頭照 */}
          <div className="flex-shrink-0" style={{ marginTop: '2%' }}>
            <div 
              className="w-32 h-32 rounded-full flex items-center justify-center text-white text-[4.3rem] shadow-xl"
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
                {tStudentManagement('studentNameRequired')}
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={tStudentManagement('studentNamePlaceholder')}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {tStudentManagement('emailOptional')}
              </label>
              <input
                name="email"
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={tStudentManagement('emailPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* 第二行：選擇背景顏色和選擇 Emoji（對齊 Edit Student 的版面） */}
        <div className="flex items-start gap-6 mb-6">
          {/* 選擇背景顏色 */}
          <div className="flex-shrink-0 w-32">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {tStudentManagement('selectColor')}
            </label>
            <div className="flex flex-col gap-2" style={{ minHeight: '131px', marginTop: '8pt' }}>
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
                {tStudentManagement('preview')}
              </div>
            </div>
          </div>

          {/* 選擇 Emoji */}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {tStudentManagement('selectEmoji')}
            </label>
            
            {/* 獎勵類別 */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {Object.keys(EMOJI_CATEGORIES).map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category)
                    setEmojiSearchTerm('')
                  }}
                  className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 font-semibold cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white hover:-translate-y-1 hover:shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:-translate-y-1 hover:shadow-md'
                  }`}
                >
                  {tStudentManagement(`emojiCategories.${category}` as any)}
                </button>
              ))}
            </div>
            
            {/* Emoji 網格（固定高度，可滾動） */}
            <div className="border border-gray-200 rounded-lg p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <div className="grid grid-cols-10 gap-2">
                {filteredEmojis.map((emoji, index) => (
                  <button
                    key={`${selectedCategory}-${index}-${emoji}`}
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
              {filteredEmojis.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {tStudentManagement('noEmojisInCategory')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 匯入建立（從編輯學生匯出的 JSON） */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-bold text-blue-800 flex items-center gap-2">
                📦 {tStudentManagement('importCreateTitle')}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {tStudentManagement('importCreateDesc')}
              </div>
            </div>

            <div className="flex-shrink-0">
              <input
                ref={importFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                disabled={loading || isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer whitespace-nowrap"
              >
                {isImporting ? tStudentManagement('importing') : tStudentManagement('importJSON')}
              </button>
            </div>
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || isImporting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 text-lg cursor-pointer"
          >
            {loading ? tMessages('creating') : `✅ ${t('addStudent')}`}
          </button>
          
          <button
            type="button"
            onClick={onCancel || (() => {})}
            disabled={loading || isImporting}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
        </div>
      </form>
    </>
  )
}

