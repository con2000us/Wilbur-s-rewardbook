'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'

interface PassbookSidebarContentProps {
  transactions: any[]
  summary: any
}

export default function PassbookSidebarContent({
  transactions,
  summary
}: PassbookSidebarContentProps) {
  const t = useTranslations('student')
  const tTransaction = useTranslations('transaction')
  const locale = useLocale()
  
  // 月份選擇器狀態
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [calculateFromReset, setCalculateFromReset] = useState<boolean>(false)
  const currentMonth = new Date().toISOString().slice(0, 7)

  // 從交易記錄中提取所有月份
  useEffect(() => {
    const months = new Set<string>()
    transactions.forEach(transaction => {
      if (transaction.transaction_date) {
        const date = new Date(transaction.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        months.add(monthKey)
      }
    })
    
    const sortedMonths = Array.from(months).sort().reverse()
    setAvailableMonths(sortedMonths)
  }, [transactions])

  // 格式化月份
  const formatMonth = (monthKey: string) => {
    const [year, monthNum] = monthKey.split('-')
    if (locale === 'zh-TW') {
      return `${year}年${parseInt(monthNum)}月`
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[parseInt(monthNum) - 1]} ${year}`
    }
  }

  // 月份導航
  const goToPreviousMonth = () => {
    if (!selectedMonth || availableMonths.length === 0) return
    const currentIndex = availableMonths.indexOf(selectedMonth)
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1])
    }
  }

  const goToNextMonth = () => {
    if (!selectedMonth || availableMonths.length === 0) return
    const currentIndex = availableMonths.indexOf(selectedMonth)
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1])
    }
  }

  const canGoPrevious = !selectedMonth 
    ? availableMonths.length > 0 
    : availableMonths.indexOf(selectedMonth) < availableMonths.length - 1

  const canGoNext = selectedMonth && availableMonths.indexOf(selectedMonth) > 0

  // 根據選擇的月份過濾交易
  const filteredTransactions = selectedMonth
    ? transactions.filter(t => {
        if (!t.transaction_date) return false
        const date = new Date(t.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return monthKey === selectedMonth
      })
    : transactions

  // 計算過濾後的收支
  const filteredEarned = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0) || 0

  const filteredSpent = filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  const filteredBalance = filteredEarned - filteredSpent

  return (
    <div className="flex flex-col gap-6">
      {/* 月份選擇器 */}
      <div 
        className={`glass-card p-6 rounded-3xl shadow-sm border border-blue-50/50 dark:border-slate-700/50 transition-all duration-300 ease-in-out overflow-visible ${
          isMonthPickerOpen ? 'pb-80' : ''
        }`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider">{t('selectAssessmentMonth')}</span>
          </div>
          <div className="relative w-full">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <button
                onClick={goToPreviousMonth}
                disabled={!canGoPrevious}
                className="material-icons-outlined text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                chevron_left
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMonthPickerOpen(!isMonthPickerOpen)
                }}
                className="font-bold cursor-pointer hover:text-indigo-500 transition-colors"
              >
                {selectedMonth ? formatMonth(selectedMonth) : (calculateFromReset ? t('recentSettlement') : t('all'))}
              </button>
              <button
                onClick={goToNextMonth}
                disabled={!canGoNext}
                className="material-icons-outlined text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                chevron_right
              </button>
            </div>
          
            {/* Month picker dropdown */}
            {isMonthPickerOpen && (
              <div
                className="fixed inset-0 z-10 cursor-pointer"
                onClick={() => setIsMonthPickerOpen(false)}
              />
            )}
            <div
              className={`absolute top-full left-0 mt-2 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 min-w-full transition-all duration-300 ease-in-out ${
                isMonthPickerOpen 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 全部和最近結算選項 */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => {
                    setSelectedMonth('')
                    setCalculateFromReset(false)
                    setIsMonthPickerOpen(false)
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedMonth === '' && !calculateFromReset
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('all')}
                </button>
                <button
                  onClick={() => {
                    setSelectedMonth('')
                    setCalculateFromReset(true)
                    setIsMonthPickerOpen(false)
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                    calculateFromReset && !selectedMonth
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('recentSettlement')}
                </button>
              </div>

              {/* 月份網格 */}
              {availableMonths.length > 0 && (
                <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-2 border border-gray-200 dark:border-slate-700 rounded-lg p-2 max-h-[240px]">
                  {availableMonths.map(month => {
                    const [year, monthNum] = month.split('-')
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

                    return (
                      <button
                        key={month}
                        onClick={() => {
                          setSelectedMonth(month)
                          setIsMonthPickerOpen(false)
                        }}
                        className={`px-3 py-2 rounded-lg font-semibold transition-all flex flex-col items-center h-[85px] cursor-pointer ${
                          selectedMonth === month
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {locale === 'zh-TW' ? (
                          <>
                            <div className="text-xs">{year}{t('year')}</div>
                            <div className="text-lg">{parseInt(monthNum)}{t('month')}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs">{year}</div>
                            <div className="text-lg">{monthNames[parseInt(monthNum) - 1]}</div>
                          </>
                        )}
                        <div className="text-xs h-4 flex items-center justify-center">
                          {month === currentMonth ? '📍' : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 收支概況 */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-blue-50/50 dark:border-slate-700/50">
        <div className="flex items-center gap-2 text-blue-500 mb-6">
          <span className="material-icons-outlined text-sm">account_balance_wallet</span>
          <span className="text-xs font-bold uppercase tracking-wide">{t('financialOverview')}</span>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">{t('income')}</span>
            <span className="text-emerald-500 font-bold">${filteredEarned}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">{t('expense')}</span>
            <span className="text-rose-500 font-bold">${filteredSpent}</span>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="font-bold">{t('balance')}</span>
            <span className="text-2xl font-black">${filteredBalance}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
