'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  order_index: number
}

interface SubjectBasic {
  id: string
  name: string
  icon: string
  order_index: number
}

interface Props {
  studentId: string
  subject: Subject
  allSubjects: SubjectBasic[]
}

// 預設 emoji 選項
const PRESET_EMOJIS = [
  '📖', '🔢', '🌍', '🔬', '🌏', '🎵', '🎨', '⚽',
  '📚', '✏️', '🧮', '🔭', '🌱', '🎹', '🖌️', '🏀',
  '📝', '💻', '🧪', '🌿', '📜', '🎸', '🎭', '🏐',
  '📐', '🖥️', '⚗️', '🌳', '📰', '🥁', '🩰', '🎾',
]

export default function EditSubjectForm({ studentId, subject, allSubjects }: Props) {
  const router = useRouter()
  const t = useTranslations('subject')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Emoji 相關狀態
  const [selectedEmoji, setSelectedEmoji] = useState(subject.icon)
  const [customEmoji, setCustomEmoji] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // 排序相關狀態
  const currentIndex = allSubjects.findIndex(s => s.id === subject.id)
  const [selectedPosition, setSelectedPosition] = useState<number>(currentIndex)
  const [subjectName, setSubjectName] = useState(subject.name)
  const [subjectColor, setSubjectColor] = useState(subject.color)

  // 過濾掉當前科目的其他科目
  const otherSubjects = allSubjects.filter(s => s.id !== subject.id)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const icon = customEmoji || selectedEmoji
    
    try {
      const response = await fetch('/api/subjects/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subject.id,
          name: formData.get('name'),
          icon: icon,
          color: formData.get('color'),
          order_index: selectedPosition,
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/student/${studentId}/subjects`)
          router.refresh()
        }, 1000)
      } else {
        setError(result.error || tMessages('updateFailed'))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
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
        alert(`✅ ${tMessages('deleteSuccess')}`)
        router.push(`/student/${studentId}/subjects`)
        router.refresh()
      } else {
        setError(result.error || tMessages('deleteFailed'))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setDeleting(false)
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
          <p className="text-green-700">✅ {t('updateSuccess')}</p>
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
            onChange={(e) => setSubjectName(e.target.value)}
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
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold text-sm"
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
                    className={`text-2xl p-2 rounded-lg transition-all hover:bg-blue-100 ${
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

        {/* 順序選擇 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('order')}
          </label>
          
          {/* 排序預覽 */}
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-3">{t('orderPreviewEdit')}</p>
            
            {otherSubjects.length === 0 ? (
              <div 
                className="flex items-center gap-2 p-3 rounded-lg border-2 border-blue-400"
                style={{ backgroundColor: `${subjectColor}20` }}
              >
                <span className="text-2xl">{currentIcon}</span>
                <span className="font-semibold text-gray-800">
                  {subjectName || subject.name}
                </span>
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full ml-auto">
                  {t('currentLabel')}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 在最前面的位置 */}
                <button
                  type="button"
                  onClick={() => setSelectedPosition(0)}
                  className={`w-full text-left p-2 rounded-lg border-2 border-dashed transition-all ${
                    selectedPosition === 0
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedPosition === 0 && (
                      <>
                        <span className="text-2xl">{currentIcon}</span>
                        <span className="font-semibold text-blue-800">
                          {subjectName || subject.name}
                        </span>
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full ml-auto">
                          {t('currentLabel')}
                        </span>
                      </>
                    )}
                    {selectedPosition !== 0 && (
                      <span className="text-gray-500 text-sm">↑ {t('moveHere')}</span>
                    )}
                  </div>
                </button>

                {otherSubjects.map((s, index) => (
                  <div key={s.id}>
                    {/* 其他科目 */}
                    <div className="p-3 bg-white border-2 border-gray-200 rounded-lg flex items-center gap-2">
                      <span className="text-2xl">{s.icon}</span>
                      <span className="font-semibold text-gray-800">{s.name}</span>
                    </div>

                    {/* 在此科目後的位置 */}
                    <button
                      type="button"
                      onClick={() => setSelectedPosition(index + 1)}
                      className={`w-full text-left p-2 rounded-lg border-2 border-dashed transition-all mt-2 ${
                        selectedPosition === index + 1
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedPosition === index + 1 && (
                          <>
                            <span className="text-2xl">{currentIcon}</span>
                            <span className="font-semibold text-blue-800">
                              {subjectName || subject.name}
                            </span>
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full ml-auto">
                              {t('currentLabel')}
                            </span>
                          </>
                        )}
                        {selectedPosition !== index + 1 && (
                          <span className="text-gray-500 text-sm">↑ {t('moveHere')}</span>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 按鈕區域 */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || success || deleting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading ? `${tCommon('save')}...` : success ? `✅ ${tMessages('updateSuccess')}` : `💾 ${tCommon('save')}`}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading || deleting}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {tCommon('cancel')}
          </button>
        </div>

        {/* 獎金規則管理 */}
        <div className="border-t-2 border-purple-200 pt-6 mt-6">
          <h3 className="text-lg font-bold text-purple-600 mb-2">💎 {t('rewardRules')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('rewardRulesDesc')}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/student/${studentId}/subjects/${subject.id}/rewards`)}
            disabled={loading || deleting}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold disabled:opacity-50"
          >
            💎 {t('manageRewardRules')}
          </button>
        </div>

        {/* 危險區域：刪除 */}
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
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {deleting ? `${tCommon('delete')}...` : `🗑️ ${t('deleteSubject')}`}
          </button>
        </div>
      </form>
    </>
  )
}
