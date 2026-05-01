'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { formatRewardAmountWithUnit, getRewardDisplayName, getRewardUnit } from './rewardUnit'

interface CustomRewardType {
  id?: string
  type_key: string
  display_name: string
  display_name_zh?: string
  display_name_en?: string
  icon: string
  color: string
  default_unit?: string | null
}

interface ExchangeRule {
  id?: string
  name_zh: string
  name_en?: string
  description_zh?: string
  description_en?: string
  required_reward_type_id: string
  required_amount: number
  reward_type_id?: string
  reward_amount?: number
  is_active: boolean
}

interface UseRewardPopupProps {
  isOpen: boolean
  onClose: () => void
  rewardType: CustomRewardType
  currentBalance: number
  exchangeRules?: ExchangeRule[]
  rewardTypes?: CustomRewardType[]
  onUse: (title: string, amount: number, notes: string) => Promise<void>
  onExchange?: (ruleId: string) => Promise<void>
}

export default function UseRewardPopup({
  isOpen,
  onClose,
  rewardType,
  currentBalance,
  exchangeRules = [],
  rewardTypes = [],
  onUse,
  onExchange
}: UseRewardPopupProps) {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const tReward = useTranslations('studentRewardManager')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionType, setActionType] = useState<'use' | 'exchange'>('use')
  const [selectedExchangeRuleId, setSelectedExchangeRuleId] = useState<string>('')
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    notes: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // 重置表單
      setFormData({
        title: '',
        amount: '',
        notes: ''
      })
      setActionType('use')
      setSelectedExchangeRuleId('')
      setError('')
    }
  }, [isOpen])

  // 獲取可用的兌換規則（從當前獎勵類型兌換到其他類型）
  const availableExchangeRules = exchangeRules.filter(rule => 
    rewardType.id &&
    rule.required_reward_type_id === rewardType.id && 
    rule.is_active &&
    currentBalance >= rule.required_amount
  )

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

    if (actionType === 'exchange') {
      // 兌換操作
      if (!selectedExchangeRuleId) {
        setError(locale === 'zh-TW' ? '請選擇兌換規則' : 'Please select an exchange rule')
        setLoading(false)
        return
      }

      if (!onExchange) {
        setError(locale === 'zh-TW' ? '兌換功能未啟用' : 'Exchange function not enabled')
        setLoading(false)
        return
      }

      try {
        await onExchange(selectedExchangeRuleId)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '兌換失敗' : 'Exchange failed'))
      } finally {
        setLoading(false)
      }
    } else {
      // 使用操作
      if (!formData.title.trim()) {
        setError(locale === 'zh-TW' ? '請輸入標題' : 'Please enter a title')
        setLoading(false)
        return
      }

      const amount = parseFloat(formData.amount)
      if (!amount || amount <= 0) {
        setError(tReward('validValueRequired'))
        setLoading(false)
        return
      }

      if (amount > currentBalance) {
        setError(locale === 'zh-TW' 
          ? `餘額不足，目前只有 ${formatRewardAmountWithUnit(currentBalance, rewardType, locale)}` 
          : `Insufficient balance. Current balance: ${formatRewardAmountWithUnit(currentBalance, rewardType, locale)}`
        )
        setLoading(false)
        return
      }

      try {
        await onUse(formData.title.trim(), amount, formData.notes.trim())
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '使用失敗' : 'Use failed'))
      } finally {
        setLoading(false)
      }
    }
  }

  const displayName = getRewardDisplayName(rewardType, locale)
  const unitLabel = getRewardUnit(rewardType, locale)

  const isEmojiIcon = (icon: string) => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) || 
           icon.length <= 2 || 
           !/^[a-z_]+$/i.test(icon)
  }

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
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${rewardType.color}20` }}
              >
                {isEmojiIcon(rewardType.icon) ? (
                  <span className="text-3xl">{rewardType.icon}</span>
                ) : (
                  <span 
                    className="material-icons-outlined text-3xl"
                    style={{ color: rewardType.color }}
                  >
                    {rewardType.icon}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {locale === 'zh-TW' ? '使用與兌換' : 'Use & Exchange'}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {displayName} · {locale === 'zh-TW' ? '現有量：' : 'Current: '}
                  <span className="font-bold">{formatRewardAmountWithUnit(currentBalance, rewardType, locale)}</span>
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

          {/* 操作類型選擇 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {locale === 'zh-TW' ? '操作類型 *' : 'Action Type *'}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setActionType('use')
                  setSelectedExchangeRuleId('')
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                  actionType === 'use'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {locale === 'zh-TW' ? '使用' : 'Use'}
              </button>
              {availableExchangeRules.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActionType('exchange')
                    setFormData({ title: '', amount: '', notes: '' })
                  }}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                    actionType === 'exchange'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {locale === 'zh-TW' ? '兌換' : 'Exchange'}
                </button>
              )}
            </div>
          </div>

          {actionType === 'use' ? (
            <>
              {/* 標題 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {locale === 'zh-TW' ? '標題 *' : 'Title *'}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {locale === 'zh-TW' ? '輸入此次使用獎勵的標題（例如：遊樂園使用、遊戲時間 1 小時等）' : 'Enter a title for this reward usage (e.g., Amusement park visit, 1 hour gaming time, etc.)'}
                </p>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required={actionType === 'use'}
                  placeholder={locale === 'zh-TW' ? '例如：遊樂園使用' : 'e.g., Amusement park visit'}
                />
              </div>

              {/* 使用數量 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {tReward('valueWithUnit', { unit: unitLabel })} *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {`${tReward('valueInputHintWithUnit', { unit: unitLabel })} - ${displayName} (max ${formatRewardAmountWithUnit(currentBalance, rewardType, locale)})`}
                </p>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={currentBalance}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required={actionType === 'use'}
                  placeholder={tReward('enterUnitValue', { unit: unitLabel })}
                />
              </div>

              {/* 細項備註 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {locale === 'zh-TW' ? '細項備註' : 'Notes'}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {locale === 'zh-TW' ? '可選：輸入此次使用的詳細說明或備註' : 'Optional: Enter detailed notes or description for this usage'}
                </p>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={4}
                  placeholder={locale === 'zh-TW' ? '例如：在遊樂園玩了雲霄飛車和旋轉木馬' : 'e.g., Rode roller coaster and carousel at amusement park'}
                />
              </div>

              {/* 預覽資訊 */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {locale === 'zh-TW' ? '使用後餘額：' : 'Balance after use: '}
                  </span>
                  <span className="font-bold text-gray-900">
                    {(() => {
                      const amount = parseFloat(formData.amount) || 0
                      const newBalance = currentBalance - amount
                      return formatRewardAmountWithUnit(newBalance >= 0 ? newBalance : 0, rewardType, locale)
                    })()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 兌換規則選擇 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {locale === 'zh-TW' ? '選擇兌換規則 *' : 'Select Exchange Rule *'}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {locale === 'zh-TW' ? '選擇要使用的兌換規則' : 'Select the exchange rule to use'}
                </p>
                {availableExchangeRules.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                    {locale === 'zh-TW' ? '暫無可用的兌換規則' : 'No available exchange rules'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableExchangeRules.map((rule) => {
                      const rewardTypeToReceive = rule.reward_type_id 
                        ? rewardTypes.find(t => t.id === rule.reward_type_id)
                        : null
                      
                      return (
                        <label
                          key={rule.id}
                          className={`block p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                            selectedExchangeRuleId === rule.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="exchangeRule"
                              value={rule.id}
                              checked={selectedExchangeRuleId === rule.id}
                              onChange={(e) => setSelectedExchangeRuleId(e.target.value)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900">
                                  {locale === 'zh-TW' ? rule.name_zh : (rule.name_en || rule.name_zh)}
                                </h4>
                              </div>
                              {rule.description_zh || rule.description_en ? (
                                <p className="text-sm text-gray-600 mb-2">
                                  {locale === 'zh-TW' 
                                    ? (rule.description_zh || rule.description_en)
                                    : (rule.description_en || rule.description_zh)
                                  }
                                </p>
                              ) : null}
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-gray-700">
                                  {formatRewardAmountWithUnit(rule.required_amount, rewardType, locale)}
                                </span>
                                <span className="text-gray-400">→</span>
                                {rewardTypeToReceive ? (
                                  <span className="font-semibold" style={{ color: rewardTypeToReceive.color }}>
                                    {formatRewardAmountWithUnit(
                                      rule.reward_amount || 0,
                                      rewardTypeToReceive,
                                      locale
                                    )}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-gray-700">
                                    {rule.reward_item || (locale === 'zh-TW' ? '獎勵項目' : 'Reward Item')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 兌換預覽 */}
              {selectedExchangeRuleId && (() => {
                const selectedRule = availableExchangeRules.find(r => r.id === selectedExchangeRuleId)
                if (!selectedRule) return null
                
                const rewardTypeToReceive = selectedRule.reward_type_id 
                  ? rewardTypes.find(t => t.id === selectedRule.reward_type_id)
                  : null

                return (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">
                        {locale === 'zh-TW' ? '兌換後餘額：' : 'Balance after exchange: '}
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatRewardAmountWithUnit(currentBalance - selectedRule.required_amount, rewardType, locale)}
                      </span>
                    </div>
                    {rewardTypeToReceive && (
                      <div className="text-sm text-gray-600">
                        {locale === 'zh-TW' ? '將獲得：' : 'Will receive: '}
                        <span className="font-bold" style={{ color: rewardTypeToReceive.color }}>
                          {formatRewardAmountWithUnit(
                            selectedRule.reward_amount || 0,
                            rewardTypeToReceive,
                            locale
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          )}

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
              disabled={
                loading || 
                (actionType === 'use' && (!formData.title.trim() || !formData.amount)) ||
                (actionType === 'exchange' && !selectedExchangeRuleId)
              }
              className={`px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                actionType === 'exchange'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {loading 
                ? (actionType === 'exchange' 
                    ? (locale === 'zh-TW' ? '兌換中...' : 'Exchanging...')
                    : (locale === 'zh-TW' ? '使用中...' : 'Using...')
                  )
                : (actionType === 'exchange'
                    ? (locale === 'zh-TW' ? '確認兌換' : 'Confirm Exchange')
                    : (locale === 'zh-TW' ? '確認使用' : 'Confirm Use')
                  )
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}
