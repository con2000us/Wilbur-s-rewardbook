'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'

interface ExchangeRule {
  id?: string
  name_zh: string
  name_en?: string
  description_zh?: string
  description_en?: string
  required_reward_type_id: string
  required_amount: number
  reward_type_id?: string // 兌換得到的獎勵類型
  reward_amount?: number // 兌換得到的數量
  reward_item?: string
  is_active: boolean
  display_order: number
}

interface CustomRewardType {
  id: string
  type_key: string
  display_name: string
  display_name_zh?: string
  display_name_en?: string
}

interface ExchangeRulePopupProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rule: ExchangeRule) => Promise<void>
  onDelete?: (ruleId: string) => Promise<void>
  editingRule?: ExchangeRule | null
  rewardTypes: CustomRewardType[]
}

export default function ExchangeRulePopup({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingRule,
  rewardTypes
}: ExchangeRulePopupProps) {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const isEditing = !!editingRule

  const [formData, setFormData] = useState<ExchangeRule>({
    name_zh: '',
    name_en: '',
    description_zh: '',
    description_en: '',
    required_reward_type_id: '',
    required_amount: 0,
    reward_type_id: '',
    reward_amount: undefined,
    reward_item: '',
    is_active: true,
    display_order: 0
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editingRule) {
      setFormData({
        name_zh: editingRule.name_zh || '',
        name_en: editingRule.name_en || '',
        description_zh: editingRule.description_zh || '',
        description_en: editingRule.description_en || '',
        required_reward_type_id: editingRule.required_reward_type_id || '',
        required_amount: editingRule.required_amount || 0,
        reward_type_id: editingRule.reward_type_id || '',
        reward_amount: editingRule.reward_amount ?? undefined,
        reward_item: editingRule.reward_item || '',
        is_active: editingRule.is_active ?? true,
        display_order: editingRule.display_order || 0
      })
    } else {
      setFormData({
        name_zh: '',
        name_en: '',
        description_zh: '',
        description_en: '',
        required_reward_type_id: '',
        required_amount: 0,
        reward_type_id: '',
        reward_amount: undefined,
        reward_item: '',
        is_active: true,
        display_order: 0
      })
    }
    setError('')
  }, [editingRule, isOpen])

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
    if (!formData.name_zh.trim()) {
      setError(locale === 'zh-TW' ? '請輸入中文名稱' : 'Please enter Chinese name')
      setLoading(false)
      return
    }

    if (!formData.required_reward_type_id) {
      setError(locale === 'zh-TW' ? '請選擇獎勵類型' : 'Please select reward type')
      setLoading(false)
      return
    }

    if (formData.required_amount <= 0) {
      setError(locale === 'zh-TW' ? '請輸入有效的兌換數量' : 'Please enter a valid exchange amount')
      setLoading(false)
      return
    }

    // 必須設定 reward_type_id 和 reward_amount（類型對類型兌換是必需的）
    if (!formData.reward_type_id) {
      setError(locale === 'zh-TW' ? '請選擇兌換得到的獎勵類型' : 'Please select reward type to receive')
      setLoading(false)
      return
    }

    if (!formData.reward_amount || formData.reward_amount <= 0) {
      setError(locale === 'zh-TW' ? '請輸入有效的兌換得到數量' : 'Please enter a valid reward amount')
      setLoading(false)
      return
    }

    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '儲存失敗' : 'Save failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingRule?.id || !onDelete) return

    if (!confirm(locale === 'zh-TW' 
      ? '確定要刪除此兌換規則嗎？' 
      : 'Are you sure you want to delete this exchange rule?'
    )) {
      return
    }

    setDeleting(true)
    try {
      await onDelete(editingRule.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '刪除失敗' : 'Delete failed'))
    } finally {
      setDeleting(false)
    }
  }

  const popupContent = (
    <div 
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {isEditing 
                ? (locale === 'zh-TW' ? '編輯兌換規則' : 'Edit Exchange Rule')
                : (locale === 'zh-TW' ? '新增兌換規則' : 'Add Exchange Rule')
              }
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Form - Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 中文名稱 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '中文名稱 *' : 'Chinese Name *'}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {locale === 'zh-TW' ? '此兌換規則的顯示名稱，例如：遊樂園通行證、遊戲時間等' : 'Display name for this exchange rule, e.g., Amusement Park Pass, Gaming Time, etc.'}
            </p>
            <input
              type="text"
              value={formData.name_zh}
              onChange={(e) => setFormData({ ...formData, name_zh: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* 英文名稱 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '英文名稱' : 'English Name'}
            </label>
            <input
              type="text"
              value={formData.name_en || ''}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 中文描述 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '中文描述' : 'Chinese Description'}
            </label>
            <textarea
              value={formData.description_zh || ''}
              onChange={(e) => setFormData({ ...formData, description_zh: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* 英文描述 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '英文描述' : 'English Description'}
            </label>
            <textarea
              value={formData.description_en || ''}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* 獎勵類型 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '需要的獎勵類型 *' : 'Required Reward Type *'}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {locale === 'zh-TW' ? '選擇學生需要用來兌換的獎勵類型（例如：積分、鑽石、愛心等）' : 'Select the reward type that students need to use for exchange (e.g., Points, Diamonds, Hearts, etc.)'}
            </p>
            <select
              value={formData.required_reward_type_id}
              onChange={(e) => setFormData({ ...formData, required_reward_type_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">{locale === 'zh-TW' ? '請選擇' : 'Please select'}</option>
              {rewardTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {locale === 'zh-TW' 
                    ? (type.display_name_zh || type.display_name || type.type_key)
                    : (type.display_name_en || type.display_name || type.type_key)
                  }
                </option>
              ))}
            </select>
          </div>

          {/* 需要的數量 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {locale === 'zh-TW' ? '需要的數量 *' : 'Required Amount *'}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {locale === 'zh-TW' ? '輸入兌換此項目所需的獎勵數量（例如：5 個鑽石、100 積分等）' : 'Enter the amount of rewards needed to exchange for this item (e.g., 5 diamonds, 100 points, etc.)'}
            </p>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.required_amount || ''}
              onChange={(e) => {
                const value = e.target.value
                setFormData({ 
                  ...formData, 
                  required_amount: value === '' ? 0 : parseFloat(value) || 0
                })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* 兌換類型選擇：類型對類型 或 文字描述 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {locale === 'zh-TW' ? '兌換結果' : 'Exchange Result'}
            </h3>
            
            {/* 選項：類型對類型兌換 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {locale === 'zh-TW' ? '兌換得到的獎勵類型 *' : 'Reward Type to Receive *'}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {locale === 'zh-TW' ? '選擇學生兌換時會獲得的獎勵類型（例如：5個鑽石換1個遊樂券，選擇「遊樂券」）' : 'Select the reward type students will receive when exchanging (e.g., 5 diamonds → 1 amusement pass, select "Amusement Pass")'}
                </p>
                <select
                  value={formData.reward_type_id || ''}
                  onChange={(e) => setFormData({ ...formData, reward_type_id: e.target.value, reward_amount: e.target.value ? formData.reward_amount : 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">{locale === 'zh-TW' ? '請選擇' : 'Please select'}</option>
                  {rewardTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {locale === 'zh-TW' 
                        ? (type.display_name_zh || type.display_name || type.type_key)
                        : (type.display_name_en || type.display_name || type.type_key)
                      }
                    </option>
                  ))}
                </select>
              </div>

              {/* 兌換得到的數量 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {locale === 'zh-TW' ? '兌換得到的數量 *' : 'Reward Amount to Receive *'}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {locale === 'zh-TW' ? '輸入兌換後會獲得的獎勵數量（例如：選擇「遊樂券」類型，輸入 1，表示會得到 1 個遊樂券）' : 'Enter the amount of rewards students will receive after exchange (e.g., if "Amusement Pass" is selected, enter 1 to receive 1 pass)'}
                </p>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.reward_amount ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ 
                      ...formData, 
                      reward_amount: value === '' ? undefined : parseFloat(value) || undefined
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* 視覺化顯示兌換比例 */}
              {formData.required_reward_type_id && formData.reward_type_id && formData.required_amount > 0 && formData.reward_amount !== undefined && formData.reward_amount > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-4">
                    {/* 左側：需要的獎勵 */}
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formData.required_amount}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const type = rewardTypes.find(t => t.id === formData.required_reward_type_id)
                          return locale === 'zh-TW' 
                            ? (type?.display_name_zh || type?.display_name || '')
                            : (type?.display_name_en || type?.display_name || '')
                        })()}
                      </div>
                    </div>

                    {/* 箭頭 */}
                    <div className="flex items-center text-purple-500">
                      <span className="material-icons-outlined text-3xl">arrow_forward</span>
                    </div>

                    {/* 右側：得到的獎勵 */}
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {formData.reward_amount}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const type = rewardTypes.find(t => t.id === formData.reward_type_id)
                          return locale === 'zh-TW' 
                            ? (type?.display_name_zh || type?.display_name || '')
                            : (type?.display_name_en || type?.display_name || '')
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 是否啟用 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="is_active" className="text-sm font-semibold text-gray-700">
              {locale === 'zh-TW' ? '啟用此規則' : 'Enable this rule'}
            </label>
          </div>

          </div>

          {/* Buttons - Fixed at bottom */}
          <div className="flex items-center justify-between pt-4 border-t bg-white p-6 flex-shrink-0">
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {deleting 
                    ? (locale === 'zh-TW' ? '刪除中...' : 'Deleting...')
                    : (locale === 'zh-TW' ? '刪除' : 'Delete')
                  }
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {loading 
                  ? (locale === 'zh-TW' ? '儲存中...' : 'Saving...')
                  : (locale === 'zh-TW' ? '儲存' : 'Save')
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}
