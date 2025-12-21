'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface ExistingSubject {
  id: string
  name: string
  icon: string
  order_index: number
}

interface Props {
  studentId: string
  existingSubjects: ExistingSubject[]
}

// 預設 emoji 選項
const PRESET_EMOJIS = [
  '📖', '🔢', '🌍', '🔬', '🌏', '🎵', '🎨', '⚽',
  '📚', '✏️', '🧮', '🔭', '🌱', '🎹', '🖌️', '🏀',
  '📝', '💻', '🧪', '🌿', '📜', '🎸', '🎭', '🏐',
  '📐', '🖥️', '⚗️', '🌳', '📰', '🥁', '🩰', '🎾',
]

export default function AddSubjectForm({ studentId, existingSubjects }: Props) {
  const router = useRouter()
  const t = useTranslations('subject')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState('📖')
  const [customEmoji, setCustomEmoji] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<number>(existingSubjects.length)
  const [subjectName, setSubjectName] = useState('')

  // 預設科目選擇（根據語言動態生成）
  const PRESET_SUBJECTS = locale === 'zh-TW' ? [
    { name: '國語', icon: '📖', color: '#4a9eff' },
    { name: '數學', icon: '🔢', color: '#ff4a6a' },
    { name: '英文', icon: '🌍', color: '#4accff' },
    { name: '自然', icon: '🔬', color: '#4ade80' },
    { name: '社會', icon: '🌏', color: '#fb923c' },
    { name: '音樂', icon: '🎵', color: '#c084fc' },
    { name: '美術', icon: '🎨', color: '#f472b6' },
    { name: '體育', icon: '⚽', color: '#10b981' },
  ] : [
    { name: 'Language Arts', icon: '📖', color: '#4a9eff' },
    { name: 'Math', icon: '🔢', color: '#ff4a6a' },
    { name: 'English', icon: '🌍', color: '#4accff' },
    { name: 'Science', icon: '🔬', color: '#4ade80' },
    { name: 'Social Studies', icon: '🌏', color: '#fb923c' },
    { name: 'Music', icon: '🎵', color: '#c084fc' },
    { name: 'Art', icon: '🎨', color: '#f472b6' },
    { name: 'PE', icon: '⚽', color: '#10b981' },
  ]

  // 計算預覽排列
  const getPreviewOrder = () => {
    const newSubject = {
      id: 'new',
      name: subjectName || t('newSubject'),
      icon: customEmoji || selectedEmoji,
      order_index: selectedPosition
    }

    // 將新科目插入到正確位置
    const allSubjects = [...existingSubjects]
    allSubjects.splice(selectedPosition, 0, newSubject)
    return allSubjects
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const icon = customEmoji || selectedEmoji
    
    try {
      const response = await fetch('/api/subjects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          name: formData.get('name'),
          icon: icon,
          color: formData.get('color'),
          order_index: selectedPosition,
        })
      })

      const result = await response.json()

      if (response.ok) {
        router.push(`/student/${studentId}/subjects`)
        router.refresh()
      } else {
        setError(result.error || tMessages('createFailed'))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function handlePresetClick(index: number) {
    setSelectedPreset(index)
    const preset = PRESET_SUBJECTS[index]
    setSubjectName(preset.name)
    setSelectedEmoji(preset.icon)
    setCustomEmoji('')
    const form = document.querySelector('form') as HTMLFormElement
    if (form) {
      (form.elements.namedItem('name') as HTMLInputElement).value = preset.name;
      (form.elements.namedItem('color') as HTMLInputElement).value = preset.color
    }
  }

  function handleEmojiSelect(emoji: string) {
    setSelectedEmoji(emoji)
    setCustomEmoji('')
    setShowEmojiPicker(false)
  }

  const currentIcon = customEmoji || selectedEmoji

  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* 預設科目選擇 */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-3">{t('quickSelect')}</h3>
        <div className="grid grid-cols-4 gap-3">
          {PRESET_SUBJECTS.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handlePresetClick(index)}
              className={`p-3 rounded-lg border-2 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                selectedPreset === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{ backgroundColor: selectedPreset === index ? `${preset.color}20` : undefined }}
            >
              <div className="text-3xl mb-1">{preset.icon}</div>
              <div className="text-sm font-semibold text-gray-800">{preset.name}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 科目名稱 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('name')} *
          </label>
          <input
            name="name"
            type="text"
            required
            value={subjectName}
            onChange={(e) => {
              setSubjectName(e.target.value)
              setSelectedPreset(null)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('namePlaceholder')}
          />
        </div>

        {/* 圖標選擇 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('icon')} *
          </label>
          
          {/* 當前選擇的圖標 */}
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
              {currentIcon}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">{t('currentIcon')}</p>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 font-semibold text-sm cursor-pointer"
              >
                {showEmojiPicker ? t('hideEmojiPicker') : t('selectEmoji')}
              </button>
            </div>
          </div>

          {/* Emoji 選擇器 */}
          {showEmojiPicker && (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('presetEmojis')}</p>
              <div className="grid grid-cols-8 gap-2 mb-4">
                {PRESET_EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className={`text-2xl p-2 rounded-lg transition-all hover:bg-blue-100 hover:scale-110 cursor-pointer ${
                      selectedEmoji === emoji && !customEmoji
                        ? 'bg-blue-200 ring-2 ring-blue-500'
                        : 'bg-white'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* 自訂輸入 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{t('customEmoji')}</p>
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl"
                  placeholder={t('typeEmoji')}
                  maxLength={4}
                />
              </div>
            </div>
          )}
        </div>

        {/* 顏色 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('colorTag')} *
          </label>
          <div className="flex gap-4 items-center">
            <input
              name="color"
              type="color"
              required
              defaultValue="#4a9eff"
              className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
            />
            <span className="text-sm text-gray-600">
              {t('colorHint')}
            </span>
          </div>
        </div>

        {/* 順序選擇 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('order')}
          </label>
          
          {/* 排序預覽 */}
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-3">{t('orderPreview')}</p>
            
            {existingSubjects.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-100 border-2 border-green-400 rounded-lg">
                <span className="text-2xl">{currentIcon}</span>
                <span className="font-semibold text-green-800">
                  {subjectName || t('newSubject')}
                </span>
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full ml-auto">
                  {t('newLabel')}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 在最前面插入的選項 */}
                <button
                  type="button"
                  onClick={() => setSelectedPosition(0)}
                  className={`w-full text-left p-2 rounded-lg border-2 border-dashed transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                    selectedPosition === 0
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedPosition === 0 && (
                      <>
                        <span className="text-2xl">{currentIcon}</span>
                        <span className="font-semibold text-green-800">
                          {subjectName || t('newSubject')}
                        </span>
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full ml-auto">
                          {t('newLabel')}
                        </span>
                      </>
                    )}
                    {selectedPosition !== 0 && (
                      <span className="text-gray-500 text-sm">↑ {t('insertHere')}</span>
                    )}
                  </div>
                </button>

                {existingSubjects.map((subject, index) => (
                  <div key={subject.id}>
                    {/* 現有科目 */}
                    <div className="p-3 bg-white border-2 border-gray-200 rounded-lg flex items-center gap-2">
                      <span className="text-2xl">{subject.icon}</span>
                      <span className="font-semibold text-gray-800">{subject.name}</span>
                    </div>

                    {/* 在此科目後插入的選項 */}
                    <button
                      type="button"
                      onClick={() => setSelectedPosition(index + 1)}
                      className={`w-full text-left p-2 rounded-lg border-2 border-dashed transition-all mt-2 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                        selectedPosition === index + 1
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedPosition === index + 1 && (
                          <>
                            <span className="text-2xl">{currentIcon}</span>
                            <span className="font-semibold text-green-800">
                              {subjectName || t('newSubject')}
                            </span>
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full ml-auto">
                              {t('newLabel')}
                            </span>
                          </>
                        )}
                        {selectedPosition !== index + 1 && (
                          <span className="text-gray-500 text-sm">↑ {t('insertHere')}</span>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none text-lg cursor-pointer"
          >
            {loading ? `${tCommon('loading')}` : `✅ ${t('createSubject')}`}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
        </div>
      </form>
    </>
  )
}
