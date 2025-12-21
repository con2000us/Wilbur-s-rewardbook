'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  order_index: number
}

interface ExistingSubject {
  id: string
  name: string
  icon: string
  order_index: number
}

interface Props {
  studentId: string
  subject?: Subject  // 如果有值就是編輯模式
  existingSubjects: ExistingSubject[]
  onSuccess?: () => void  // 成功後的回調
  onCancel?: () => void  // 取消的回調
}

// 預設 emoji 選項
const PRESET_EMOJIS = [
  '📖', '🔢', '🌍', '🔬', '🌏', '🎵', '🎨', '⚽',
  '📚', '✏️', '🧮', '🔭', '🌱', '🎹', '🖌️', '🏀',
  '📝', '💻', '🧪', '🌿', '📜', '🎸', '🎭', '🏐',
  '📐', '🖥️', '⚗️', '🌳', '📰', '🥁', '🩰', '🎾',
]

export default function SubjectForm({ studentId, subject, existingSubjects, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const t = useTranslations('subject')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const locale = useLocale()
  
  // 判斷是編輯還是新增模式
  const isEditMode = !!subject
  
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState(subject?.icon || '📖')
  const [customEmoji, setCustomEmoji] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [subjectName, setSubjectName] = useState(subject?.name || '')
  const [subjectColor, setSubjectColor] = useState(subject?.color || '#4a9eff')

  // 預設科目選擇（根據語言動態生成，僅新增模式）
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const icon = customEmoji || selectedEmoji
    
    try {
      const apiUrl = isEditMode ? '/api/subjects/update' : '/api/subjects/create'
      const payload: any = {
        student_id: studentId,
        name: formData.get('name'),
        icon: icon,
        color: formData.get('color'),
        order_index: isEditMode ? subject.order_index : existingSubjects.length,
      }

      if (isEditMode) {
        payload.subject_id = subject.id
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        if (onSuccess) {
          // Modal 模式：調用回調並刷新
          router.refresh()
          setTimeout(() => {
            onSuccess()
          }, 1000)
        } else {
          // 獨立頁面模式：跳轉回科目頁面
          setTimeout(() => {
            router.push(`/student/${studentId}/subjects`)
            router.refresh()
          }, 1000)
        }
      } else {
        setError(result.error || (isEditMode ? tMessages('updateFailed') : tMessages('createFailed')))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!isEditMode || !subject) return

    if (!confirm(t('deleteConfirmFull', { name: subject.name }))) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/subjects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subject.id,
        })
      })

      const result = await response.json()

      if (response.ok) {
        if (onSuccess) {
          // Modal 模式：調用回調並刷新
          router.refresh()
          setTimeout(() => {
            onSuccess()
          }, 500)
        } else {
          // 獨立頁面模式：跳轉回科目頁面
          router.push(`/student/${studentId}/subjects`)
          router.refresh()
        }
      } else {
        setError(result.error || tMessages('deleteFailed'))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  function handlePresetClick(index: number) {
    setSelectedPreset(index)
    const preset = PRESET_SUBJECTS[index]
    setSubjectName(preset.name)
    setSelectedEmoji(preset.icon)
    setCustomEmoji('')
    setSubjectColor(preset.color)
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

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">
            ✅ {isEditMode ? tMessages('updateSuccess') : tMessages('createSuccess')}
          </p>
        </div>
      )}

      {/* 預設科目選擇（僅新增模式） */}
      {!isEditMode && (
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
      )}

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
            <div 
              className="text-5xl p-3 rounded-lg border-2 border-gray-300"
              style={{ backgroundColor: `${subjectColor}20` }}
            >
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
              value={subjectColor}
              onChange={(e) => setSubjectColor(e.target.value)}
              className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
            />
            <div 
              className="px-4 py-2 rounded-full text-white font-semibold"
              style={{ backgroundColor: subjectColor }}
            >
              {t('preview')}
            </div>
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || success || deleting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none text-lg cursor-pointer"
          >
            {loading 
              ? tCommon('loading')
              : success 
              ? `✅ ${isEditMode ? tMessages('updateSuccess') : tMessages('createSuccess')}`
              : isEditMode 
                ? `💾 ${tCommon('save')}`
                : `✅ ${t('createSubject')}`
            }
          </button>
          
          <button
            type="button"
            onClick={() => onCancel ? onCancel() : router.back()}
            disabled={loading || deleting}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
        </div>


        {/* 危險區域：刪除（僅編輯模式） */}
        {isEditMode && (
          <div className="border-t-2 border-red-200 pt-6 mt-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ {t('dangerZone')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('deleteWarningIntro')}
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
              <li>{t('deleteWarning1')}</li>
              <li>{t('deleteWarning2')}</li>
              <li>{t('deleteWarning3')}</li>
              <li>{t('deleteWarning4')}</li>
              <li className="text-red-600 font-bold">{t('deleteWarning5')}</li>
            </ul>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting || success}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none font-semibold cursor-pointer"
            >
              {deleting ? `${tCommon('delete')}...` : `🗑️ ${t('deleteSubject')}`}
            </button>
          </div>
        )}
      </form>
    </>
  )
}

