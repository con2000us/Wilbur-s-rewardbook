'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { isParent } from '@/lib/utils/userRole'
import { formatRewardAmountWithUnit, getRewardDisplayName } from './rewardUnit'

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

interface CustomRewardTypeWithId extends CustomRewardType {
  id: string
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
  reward_item?: string
  is_active: boolean
}

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  description: string
  transaction_date: string
  assessment_id?: string
  created_at: string
}

interface RewardDetailModalProps {
  isOpen: boolean
  onClose: () => void
  rewardType: CustomRewardType
  studentId: string
  currentBalance: number
  totalEarned: number
  rewardTypes: (CustomRewardType & { id?: string })[]
  exchangeRules: ExchangeRule[]
  onExchange: (ruleId: string) => Promise<void>
  onUse: (amount: number, description: string) => void
  onAdd?: () => void
}

export default function RewardDetailModal({
  isOpen,
  onClose,
  rewardType,
  studentId,
  currentBalance,
  totalEarned,
  rewardTypes,
  exchangeRules,
  onExchange,
  onUse,
  onAdd
}: RewardDetailModalProps) {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const canManage = isParent()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'exchange' | 'history' | 'usage'>('exchange')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && activeTab !== 'exchange') {
      loadTransactions()
    }
  }, [isOpen, activeTab, rewardType.id])

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

  const loadTransactions = async () => {
    setLoading(true)
    try {
      let url = `/api/students/${studentId}/transactions/by-reward-type?rewardTypeId=${rewardType.id}`
      
      if (activeTab === 'history') {
        // 只顯示獲得記錄
        url += '&transactionType=earn'
      } else if (activeTab === 'usage') {
        // 顯示使用和兌換記錄
        // 需要分別查詢 use 和 exchange 類型
        const [useRes, exchangeRes] = await Promise.all([
          fetch(`${url}&transactionType=use`),
          fetch(`${url}&transactionType=exchange`)
        ])
        
        const useData = await useRes.json()
        const exchangeData = await exchangeRes.json()
        
        const allTransactions = [
          ...(useData.transactions || []),
          ...(exchangeData.transactions || [])
        ].sort((a, b) => {
          const dateA = new Date(a.transaction_date || a.created_at).getTime()
          const dateB = new Date(b.transaction_date || b.created_at).getTime()
          return dateB - dateA
        })
        
        setTransactions(allTransactions)
        setLoading(false)
        return
      }

      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.transactions || [])
      }
    } catch (err) {
      console.error('Failed to load transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }


  // 獲取可用的兌換規則（從當前獎勵類型兌換到其他類型）
  const availableExchangeRules = exchangeRules.filter(rule => 
    rule.required_reward_type_id === rewardType.id && 
    rule.is_active &&
    currentBalance >= rule.required_amount
  )

  const displayName = getRewardDisplayName(rewardType, locale)

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
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white flex items-center justify-between">
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
              <h2 className="text-2xl font-bold">{displayName}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span>
                  {locale === 'zh-TW' ? '現有量：' : 'Current: '}
                  <span className="font-bold">{formatRewardAmountWithUnit(currentBalance, rewardType, locale)}</span>
                </span>
                <span>
                  {locale === 'zh-TW' ? '獲得總量：' : 'Total Earned: '}
                  <span className="font-bold">{formatRewardAmountWithUnit(totalEarned, rewardType, locale)}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setActiveTab('exchange')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'exchange'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {locale === 'zh-TW' ? '兌換' : 'Exchange'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'history'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {locale === 'zh-TW' ? '來源歷史' : 'Earning History'}
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'usage'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {locale === 'zh-TW' ? '使用與兌換紀錄' : 'Usage & Exchange'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'exchange' && (
            <div className="space-y-4">
              {/* 添加獎勵按鈕 - 僅家長可見 */}
              {canManage && onAdd && (
                <div className="bg-green-50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    {locale === 'zh-TW' ? '添加獎勵' : 'Add Reward'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {locale === 'zh-TW' 
                      ? '主動為學生添加獎勵，例如：表現優異、完成任務、特殊獎勵等' 
                      : 'Manually add rewards for students, e.g., excellent performance, task completion, special rewards, etc.'}
                  </p>
                  <button
                    onClick={onAdd}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    {locale === 'zh-TW' ? '添加獎勵' : 'Add Reward'}
                  </button>
                </div>
              )}

              {/* 使用獎勵按鈕 */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {locale === 'zh-TW' ? '使用獎勵' : 'Use Reward'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {locale === 'zh-TW' 
                    ? '記錄獎勵在現實中的使用，例如：遊樂園使用、遊戲時間等' 
                    : 'Record reward usage in real life, e.g., amusement park visit, gaming time, etc.'}
                </p>
                <button
                  onClick={() => onUse(0, '')}
                  className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
                >
                  {locale === 'zh-TW' ? '使用獎勵' : 'Use Reward'}
                </button>
              </div>

              {/* 可用的兌換規則 */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {locale === 'zh-TW' ? '可用的兌換' : 'Available Exchanges'}
                </h3>
                {availableExchangeRules.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">
                      {locale === 'zh-TW' ? '暫無可用的兌換規則' : 'No available exchange rules'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableExchangeRules.map((rule) => {
                      const rewardTypeToReceive = rule.reward_type_id 
                        ? rewardTypes.find(t => t.id === rule.reward_type_id)
                        : null
                      
                      return (
                        <div
                          key={rule.id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-gray-900">
                                  {locale === 'zh-TW' ? rule.name_zh : (rule.name_en || rule.name_zh)}
                                </h4>
                              </div>
                              {rule.description_zh || rule.description_en ? (
                                <p className="text-sm text-gray-600 mb-3">
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
                            <button
                              onClick={() => onExchange(rule.id)}
                              className="ml-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                            >
                              {locale === 'zh-TW' ? '兌換' : 'Exchange'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">{locale === 'zh-TW' ? '載入中...' : 'Loading...'}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="text-gray-500">
                    {locale === 'zh-TW' ? '尚無獲得記錄' : 'No earning records'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-white border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(transaction.transaction_date || transaction.created_at).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            +{formatRewardAmountWithUnit(Math.abs(transaction.amount), rewardType, locale)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">{locale === 'zh-TW' ? '載入中...' : 'Loading...'}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="text-gray-500">
                    {locale === 'zh-TW' ? '尚無使用或兌換記錄' : 'No usage or exchange records'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-white border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              transaction.transaction_type === 'use'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {transaction.transaction_type === 'use'
                                ? (locale === 'zh-TW' ? '使用' : 'Use')
                                : (locale === 'zh-TW' ? '兌換' : 'Exchange')
                              }
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 mb-1">
                            {(() => {
                              // 解析描述：標題 (備註) 或只有標題
                              const desc = transaction.description || ''
                              const match = desc.match(/^(.+?)(?:\s*\((.+?)\))?$/)
                              return match ? match[1] : desc
                            })()}
                          </p>
                          {(() => {
                            // 如果有備註，顯示備註
                            const desc = transaction.description || ''
                            const match = desc.match(/^.+?\s*\((.+?)\)$/)
                            if (match) {
                              return (
                                <p className="text-sm text-gray-500 mb-1">
                                  {match[1]}
                                </p>
                              )
                            }
                            return null
                          })()}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{displayName}</span>
                            <span>·</span>
                            <span>
                              {new Date(transaction.transaction_date || transaction.created_at).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            -{formatRewardAmountWithUnit(Math.abs(transaction.amount), rewardType, locale)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}
