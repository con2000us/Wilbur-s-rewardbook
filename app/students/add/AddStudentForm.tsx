'use client'

import { useState } from 'react'
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

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AddStudentForm({ onSuccess, onCancel }: Props) {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const locale = useLocale()
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
  const [error, setError] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('😊')
  const [selectedColorHex, setSelectedColorHex] = useState('#3b82f6') // 預設藍色
  const [showAllEmojis, setShowAllEmojis] = useState(false)
  
  // 計算要顯示的 emoji 數量（預設只顯示 2 行，每行 10 個 = 20 個）
  const displayedEmojis = showAllEmojis ? AVATAR_EMOJIS : AVATAR_EMOJIS.slice(0, 20)

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
        {/* 頭像預覽 */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-32 h-32 rounded-full flex items-center justify-center text-white text-6xl shadow-xl"
            style={{
              background: `linear-gradient(to bottom right, ${selectedColorHex}, ${hexToDarker(selectedColorHex)})`
            }}
          >
            {selectedEmoji}
          </div>
        </div>

        {/* 選擇 Emoji */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              {locale === 'zh-TW' ? '選擇頭像 Emoji' : 'Select Avatar Emoji'}
            </label>
            {AVATAR_EMOJIS.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAllEmojis(!showAllEmojis)}
                className="px-3 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 font-semibold cursor-pointer"
              >
                {showAllEmojis 
                  ? (locale === 'zh-TW' ? '顯示較少' : 'Show Less')
                  : (locale === 'zh-TW' ? '顯示更多' : 'Show More')
                }
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

        {/* 選擇顏色 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {locale === 'zh-TW' ? '選擇背景顏色' : 'Select Background Color'}
          </label>
          <div className="flex gap-4 items-start" style={{ minHeight: '131px' }}>
            <div className="flex flex-col gap-2">
              <input
                name="color"
                type="color"
                required
                value={selectedColorHex}
                onChange={(e) => {
                  const hex = e.target.value
                  setSelectedColorHex(hex)
                }}
                className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
              />
              <div 
                className="px-4 py-2 rounded-full text-white font-semibold"
                style={{
                  background: `linear-gradient(to bottom right, ${selectedColorHex}, ${hexToDarker(selectedColorHex)})`
                }}
              >
                {locale === 'zh-TW' ? '預覽' : 'Preview'}
              </div>
            </div>
          </div>
        </div>

        {/* 學生姓名 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {locale === 'zh-TW' ? '學生姓名 *' : 'Student Name *'}
          </label>
          <input
            name="name"
            type="text"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={locale === 'zh-TW' ? '例如：王小明' : 'e.g., John Doe'}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {locale === 'zh-TW' ? 'Email（選填）' : 'Email (Optional)'}
          </label>
          <input
            name="email"
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example@email.com"
          />
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading ? (locale === 'zh-TW' ? '創建中...' : 'Creating...') : (locale === 'zh-TW' ? '✅ 創建學生' : '✅ Create Student')}
          </button>
          
          <button
            type="button"
            onClick={onCancel || (() => {})}
            disabled={loading}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {tCommon('cancel')}
          </button>
        </div>
      </form>
    </>
  )
}

