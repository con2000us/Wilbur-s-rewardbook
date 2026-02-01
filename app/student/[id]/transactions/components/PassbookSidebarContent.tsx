'use client'

import { useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

interface PassbookSidebarContentProps {
  transactions: any[]
  summary: any
  selectedRewardType?: string | null
  onRewardTypeSelect?: (rewardType: string | null) => void
  subjects?: any[]
  assessments?: any[]
  selectedMonth?: string
}

export default function PassbookSidebarContent({
  transactions,
  summary,
  selectedRewardType,
  onRewardTypeSelect,
  subjects = [],
  assessments = [],
  selectedMonth = ''
}: PassbookSidebarContentProps) {
  const t = useTranslations('student')
  const tTransaction = useTranslations('transaction')
  const locale = useLocale()
  
  // 顯示模式：'count' 顯示筆數，'amount' 顯示金額
  const [displayMode, setDisplayMode] = useState<'count' | 'amount'>('count')

  // 根據月份過濾交易記錄
  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) {
      return transactions
    }
    return transactions.filter((t: any) => {
      if (!t.transaction_date) return false
      const date = new Date(t.transaction_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return monthKey === selectedMonth
    })
  }, [transactions, selectedMonth])

  // 建立 assessment_id → subject_id 映射
  const assessmentToSubject = useMemo(() => {
    const map = new Map<string, string>()
    assessments.forEach((a: any) => {
      if (a.id && a.subject_id) {
        map.set(a.id, a.subject_id)
      }
    })
    return map
  }, [assessments])

  // 建立 subject_id → subject 映射
  const subjectMap = useMemo(() => {
    const map = new Map<string, any>()
    subjects.forEach((s: any) => {
      if (s.id) {
        map.set(s.id, s)
      }
    })
    return map
  }, [subjects])

  // 按科目分組交易記錄（使用過濾後的交易）
  const transactionsBySubject = useMemo(() => {
    const map = new Map<string, any[]>()
    
    filteredTransactions.forEach((t: any) => {
      if (t.assessment_id) {
        const subjectId = assessmentToSubject.get(t.assessment_id)
        if (subjectId) {
          const existing = map.get(subjectId) || []
          map.set(subjectId, [...existing, t])
        }
      }
    })
    
    return map
  }, [filteredTransactions, assessmentToSubject])

  // 特殊事蹟交易（沒有 assessment_id，使用過濾後的交易）
  const specialTransactions = useMemo(() => {
    return filteredTransactions.filter((t: any) => !t.assessment_id)
  }, [filteredTransactions])

  // 判斷是否為 emoji
  const isEmojiIcon = (icon: string): boolean => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) || 
           icon.length <= 2 || 
           !/^[a-z_]+$/i.test(icon)
  }

  // 將 hex 顏色轉換為半透明版本
  const hexToRgba = (hex: string, alpha: number = 0.5): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 處理顏色格式（支援 hex 和 rgb）
  const getColorWithOpacity = (color: string, opacity: number = 0.5): string => {
    if (color.startsWith('#')) {
      return hexToRgba(color, opacity)
    } else if (color.startsWith('rgb')) {
      // 如果是 rgb，轉換為 rgba
      return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`)
    }
    return color
  }

  // 計算「全部顯示」的數量和金額（使用過濾後的交易）
  const totalCount = filteredTransactions.length
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum: number, t: any) => {
      const amount = Number(t.amount) || 0
      return sum + amount // 保留正負號，用於顏色顯示
    }, 0)
  }, [filteredTransactions])
  
  // 計算每個科目的金額總和（保留正負號）
  const subjectAmounts = useMemo(() => {
    const map = new Map<string, number>()
    transactionsBySubject.forEach((subjectTransactions, subjectId) => {
      const total = subjectTransactions.reduce((sum: number, t: any) => {
        const amount = Number(t.amount) || 0
        return sum + amount // 保留正負號
      }, 0)
      map.set(subjectId, total)
    })
    return map
  }, [transactionsBySubject])
  
  // 計算特殊事蹟的金額總和（保留正負號）
  const specialAmount = useMemo(() => {
    return specialTransactions.reduce((sum: number, t: any) => {
      const amount = Number(t.amount) || 0
      return sum + amount // 保留正負號
    }, 0)
  }, [specialTransactions])

  return (
    <div className="flex flex-col gap-6">
      {/* 獎金來源分類 */}
      <div className="glass-card-no-hover p-6 rounded-3xl shadow-sm border border-blue-50/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-blue-500">
            <span className="material-icons-outlined text-sm">label</span>
            <span className="text-xs font-bold uppercase tracking-wide">
              {locale === 'zh-TW' ? '獎金來源' : 'Money Source'}
            </span>
          </div>
          {/* 切換開關 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {locale === 'zh-TW' ? '筆數' : 'Count'}
            </span>
            <button
              onClick={() => setDisplayMode(displayMode === 'count' ? 'amount' : 'count')}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                displayMode === 'amount' ? 'bg-blue-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  displayMode === 'amount' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs text-slate-500">
              {locale === 'zh-TW' ? '金額' : 'Amount'}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {/* 全部顯示 */}
          <div 
            onClick={() => onRewardTypeSelect && onRewardTypeSelect(null)}
            className={`flex items-center justify-between p-3 rounded-xl border-l-4 transition-colors cursor-pointer ${
              selectedRewardType === null
                ? 'bg-blue-50 border-blue-500 shadow-sm'
                : 'border-blue-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: selectedRewardType === null 
                    ? '#3b82f6' 
                    : 'rgba(59, 130, 246, 0.5)' 
                }}
              ></span>
              <span className={`font-semibold ${
                selectedRewardType === null ? 'text-slate-800' : 'text-slate-600'
              }`}>
                {locale === 'zh-TW' ? '全部顯示' : 'Show All'}
              </span>
            </div>
            <span className={`text-sm font-bold ${
              displayMode === 'amount' 
                ? (totalAmount >= 0 ? 'text-green-600' : 'text-red-600')
                : 'text-slate-600'
            }`}>
              {displayMode === 'count' 
                ? totalCount 
                : `$${totalAmount.toLocaleString()}`
              }
            </span>
          </div>

          {/* 科目分類 - 按照科目的 order_index 排序 */}
          {subjects
            .filter((subject: any) => {
              // 只顯示有交易的科目
              const subjectTransactions = transactionsBySubject.get(subject.id)
              return subjectTransactions && subjectTransactions.length > 0
            })
            .sort((a: any, b: any) => {
              // 按照 order_index 排序
              const orderA = a.order_index ?? 0
              const orderB = b.order_index ?? 0
              return orderA - orderB
            })
            .map((subject: any) => {
              const subjectTransactions = transactionsBySubject.get(subject.id) || []
              if (subjectTransactions.length === 0) return null

              const subjectName = subject.name || ''
              const subjectColor = subject.color || '#3b82f6'
              const subjectIcon = subject.icon || '📚'
              const isSelected = selectedRewardType === `subject_${subject.id}`

              return (
                <div
                  key={subject.id}
                  onClick={() => onRewardTypeSelect && onRewardTypeSelect(`subject_${subject.id}`)}
                  className={`flex items-center justify-between p-3 rounded-xl border-l-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-50 shadow-sm'
                      : 'hover:bg-slate-50'
                  }`}
                  style={{ 
                    borderLeftColor: isSelected ? subjectColor : getColorWithOpacity(subjectColor, 0.5)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: isSelected 
                          ? subjectColor 
                          : getColorWithOpacity(subjectColor, 0.5)
                      }}
                    ></span>
                    <div className="flex items-center gap-2">
                      {isEmojiIcon(subjectIcon) ? (
                        <span className="text-lg">{subjectIcon}</span>
                      ) : (
                        <span className="material-icons-outlined text-lg" style={{ color: subjectColor }}>
                          {subjectIcon}
                        </span>
                      )}
                      <span className={`font-medium ${
                        isSelected ? 'text-slate-800 font-semibold' : 'text-slate-700'
                      }`}>
                        {subjectName}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${
                    displayMode === 'amount' 
                      ? ((subjectAmounts.get(subject.id) || 0) >= 0 ? 'text-green-600' : 'text-red-600')
                      : 'text-slate-600'
                  }`}>
                    {displayMode === 'count' 
                      ? subjectTransactions.length 
                      : `$${(subjectAmounts.get(subject.id) || 0).toLocaleString()}`
                    }
                  </span>
                </div>
              )
            })}

          {/* 特殊事蹟 */}
          {specialTransactions.length > 0 && (
            <div
              onClick={() => onRewardTypeSelect && onRewardTypeSelect('special')}
              className={`flex items-center justify-between p-3 rounded-xl border-l-4 transition-colors cursor-pointer ${
                selectedRewardType === 'special'
                  ? 'bg-slate-50 shadow-sm'
                  : 'hover:bg-slate-50'
              }`}
              style={{ 
                borderLeftColor: selectedRewardType === 'special' 
                  ? '#f97316' 
                  : getColorWithOpacity('#f97316', 0.5)
              }}
            >
              <div className="flex items-center gap-3">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: selectedRewardType === 'special' 
                      ? '#f97316' 
                      : getColorWithOpacity('#f97316', 0.5)
                  }}
                ></span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  <span className={`font-medium ${
                    selectedRewardType === 'special' ? 'text-slate-800 font-semibold' : 'text-slate-700'
                  }`}>
                    {locale === 'zh-TW' ? '特殊事蹟' : 'Special Events'}
                  </span>
                </div>
              </div>
              <span className={`text-sm font-bold ${
                displayMode === 'amount' 
                  ? (specialAmount >= 0 ? 'text-green-600' : 'text-red-600')
                  : 'text-slate-600'
              }`}>
                {displayMode === 'count' 
                  ? specialTransactions.length 
                  : `$${specialAmount.toLocaleString()}`
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
