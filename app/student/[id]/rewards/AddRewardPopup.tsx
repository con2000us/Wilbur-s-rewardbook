'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { getRewardDisplayName, getRewardUnit } from './rewardUnit'

interface CustomRewardType {
  id?: string
  type_key?: string
  display_name: string
  icon: string
  color: string
  default_unit?: string | null
}

interface AddRewardPopupProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  rewardTypes: CustomRewardType[]
  achievementEvents?: Array<{ id: string; name: string; icon?: string }>
  onAdd: (rewardTypeId: string, title: string, amount: number, notes: string) => Promise<void>
}

export default function AddRewardPopup({
  isOpen,
  onClose,
  studentId,
  rewardTypes,
  achievementEvents = [],
  onAdd
}: AddRewardPopupProps) {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const tReward = useTranslations('studentRewardManager')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    rewardTypeId: '',
    amount: '',
    notes: ''
  })

  const selectedRewardType = rewardTypes.find(t => t.id === formData.rewardTypeId)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // 重置表單
      setFormData({
        title: '',
        rewardTypeId: '',
        amount: '',
        notes: ''
      })
      setError('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 驗證
    if (!formData.title.trim()) {
      setError(locale === 'zh-TW' ? '請輸入表現/行為' : 'Please enter performance/behavior')
      setLoading(false)
      return
    }

    if (!formData.rewardTypeId) {
      setError(locale === 'zh-TW' ? '請選擇獎勵類型' : 'Please select a reward type')
      setLoading(false)
      return
    }

    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      setError(tReward('validValueRequired'))
      setLoading(false)
      return
    }

    try {
      await onAdd(formData.rewardTypeId, formData.title.trim(), amount, formData.notes.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '添加失敗' : 'Add failed'))
    } finally {
      setLoading(false)
    }
  }

  const isEmojiIcon = (icon: string) => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) || 
           icon.length <= 2 || 
           !/^[a-z_]+$/i.test(icon)
  }

  const getDisplayName = (type: CustomRewardType) => getRewardDisplayName(type, locale)
  const selectedUnit = selectedRewardType ? getRewardUnit(selectedRewardType, locale) : ''

  const popupContent = (
    <div 
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-icons-outlined text-3xl">card_giftcard</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {locale === 'zh-TW' ? '添加獎勵' : 'Add Reward'}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {locale === 'zh-TW' ? '根據表現選擇獎勵' : 'Select reward based on performance'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 表現/行為 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '表現/行為 *' : 'Performance/Behavior *'}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {locale === 'zh-TW' ? '輸入學生的表現或行為（例如：表現優異、完成任務、幫助同學、主動打掃等）' : 'Enter student performance or behavior (e.g., Excellent performance, Task completed, Helped classmates, Proactively cleaned, etc.)'}
            </p>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              placeholder={locale === 'zh-TW' ? '例如：表現優異、幫助同學完成作業' : 'e.g., Excellent performance, Helped classmates with homework'}
            />
            {/* 常用標籤 */}
            {achievementEvents.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {achievementEvents.slice(0, 6).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, title: event.name })}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                  >
                    {event.icon || '🏆'} {event.name}
                  </button>
                ))}
              </div>
            )}
            {achievementEvents.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { label: locale === 'zh-TW' ? '🏆 考試滿分' : '🏆 Perfect Score', name: locale === 'zh-TW' ? '考試滿分' : 'Perfect Score' },
                  { label: locale === 'zh-TW' ? '📝 作業優良' : '📝 Great Homework', name: locale === 'zh-TW' ? '作業優良' : 'Great Homework' },
                  { label: locale === 'zh-TW' ? '🤝 幫助同學' : '🤝 Helped Others', name: locale === 'zh-TW' ? '幫助同學' : 'Helped Others' },
                  { label: locale === 'zh-TW' ? '📈 進步顯著' : '📈 Improvement', name: locale === 'zh-TW' ? '進步顯著' : 'Improvement' },
                  { label: locale === 'zh-TW' ? '⭐ 準時完成' : '⭐ On Time', name: locale === 'zh-TW' ? '準時完成' : 'On Time' },
                ].map((tag, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, title: tag.name })}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 選擇獎勵類型 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '選擇獎勵類型 *' : 'Select Reward Type *'}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {locale === 'zh-TW' ? '根據上述表現，選擇要給予的獎勵類型' : 'Based on the performance above, select the reward type to give'}
            </p>
            {rewardTypes.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                {locale === 'zh-TW' ? '暫無可用的獎勵類型' : 'No reward types available'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rewardTypes.map((type) => {
                  const isSelected = formData.rewardTypeId === type.id
                  const displayName = getDisplayName(type)
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, rewardTypeId: type.id || '', amount: '' })}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50 shadow-md scale-105'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isSelected ? 'scale-110' : ''
                          }`}
                          style={{ backgroundColor: `${type.color}20` }}
                        >
                          {isEmojiIcon(type.icon) ? (
                            <span className="text-2xl">{type.icon}</span>
                          ) : (
                            <span 
                              className="material-icons-outlined text-2xl"
                              style={{ color: type.color }}
                            >
                              {type.icon}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-semibold ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                          {displayName}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 數量 */}
          {selectedRewardType && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {tReward('valueWithUnit', { unit: selectedUnit })} *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {`${tReward('valueInputHintWithUnit', { unit: selectedUnit })} - ${getDisplayName(selectedRewardType)}`}
              </p>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                placeholder={tReward('enterUnitValue', { unit: selectedUnit })}
              />
            </div>
          )}

          {/* 細項備註 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '細項備註' : 'Notes'}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {locale === 'zh-TW' ? '可選：輸入此次添加獎勵的詳細說明或備註' : 'Optional: Enter detailed notes or description for this reward addition'}
            </p>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={4}
              placeholder={locale === 'zh-TW' ? '例如：幫助同學完成作業、主動打掃教室等' : 'e.g., Helped classmates with homework, proactively cleaned the classroom, etc.'}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.rewardTypeId || !formData.amount}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (locale === 'zh-TW' ? '添加中...' : 'Adding...')
                : (locale === 'zh-TW' ? '確認添加' : 'Confirm Add')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}
