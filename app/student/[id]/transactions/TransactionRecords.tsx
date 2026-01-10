'use client'

import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import TransactionModal from './components/TransactionModal'

interface Props {
  studentId: string
  transactions: any[]
  onEditTransaction?: (transaction: any) => void
  onAddTransaction?: () => void
}

export default function TransactionRecords({ studentId, transactions, onEditTransaction, onAddTransaction }: Props) {
  const t = useTranslations('transaction')
  const tStudent = useTranslations('student')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  // 預設為當前月份
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState(transactions)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [calculateFromReset, setCalculateFromReset] = useState<boolean>(false)
  const monthPickerButtonRef = useRef<HTMLButtonElement>(null)
  const monthPickerContainerRef = useRef<HTMLDivElement>(null)
  const monthNavigationContainerRef = useRef<HTMLDivElement>(null)
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 })
  const [canInteractWithBackground, setCanInteractWithBackground] = useState(false)
  const pickerPanelRef = useRef<HTMLDivElement>(null)

  // 計算月份選擇器面板位置
  useEffect(() => {
    if (isMonthPickerOpen && monthNavigationContainerRef.current) {
      // 延遲允許背景交互，避免當前點擊事件立即觸發
      setTimeout(() => {
        setCanInteractWithBackground(true)
      }, 100)
      requestAnimationFrame(() => {
        const navContainerRect = monthNavigationContainerRef.current?.getBoundingClientRect()
        const buttonRect = monthPickerButtonRef.current?.getBoundingClientRect()
        if (navContainerRect && monthNavigationContainerRef.current) {
          const top = buttonRect ? buttonRect.bottom + 8 : navContainerRect.bottom + 8
          // 直接對齊導航器容器和選單的左邊外框
          const panelWidth = 320 // 選單最大寬度
          let left = navContainerRect.left
          
          if (left + panelWidth > window.innerWidth) {
            left = window.innerWidth - panelWidth - 16 // 16px padding
          }
          setPickerPosition({ top, left })
        }
      })
    } else {
      setCanInteractWithBackground(false)
    }
  }, [isMonthPickerOpen])

  // 監聽窗口大小變化，更新選單位置
  useEffect(() => {
    const handleResize = () => {
      if (isMonthPickerOpen && monthPickerButtonRef.current && monthNavigationContainerRef.current) {
        const buttonRect = monthPickerButtonRef.current.getBoundingClientRect()
        const navContainerRect = monthNavigationContainerRef.current.getBoundingClientRect()
        if (navContainerRect && monthNavigationContainerRef.current) {
          const top = buttonRect.bottom + 8
          // 直接對齊導航器容器和選單的左邊外框
          const panelWidth = 320 // 選單最大寬度
          let left = navContainerRect.left
          
          if (left + panelWidth > window.innerWidth) {
            left = window.innerWidth - panelWidth - 16 // 16px padding
          }
          setPickerPosition({ top, left })
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [isMonthPickerOpen])

  // 載入分頁設定
  useEffect(() => {
    async function loadPaginationSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          const valueStr = data.items_per_page
          // 如果值為 'unlimited'，設為 null（不限）
          const value = valueStr === 'unlimited' || valueStr === '' || valueStr === null
            ? null
            : parseInt(valueStr) || 25
          setItemsPerPage(value)
        }
      } catch (error) {
        console.error('Failed to load pagination settings:', error)
      }
    }
    loadPaginationSettings()
  }, [])

  // 自訂義排序：同一天的歸零記錄視為當天最後發生（在倒序列表中排在當天最上方）
  const sortTransactions = (txs: any[]) => {
    return [...txs].sort((a, b) => {
      const aDate = new Date(a.transaction_date || a.created_at)
      const bDate = new Date(b.transaction_date || b.created_at)
      
      // 先按日期降序排列（最新的在前）
      const dateA = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate()).getTime()
      const dateB = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate()).getTime()
      
      if (dateA !== dateB) {
        return dateB - dateA // 日期不同，較新的在前
      }
      
      // 同一天的記錄
      // 歸零記錄視為當天最後發生，在倒序列表中應該排在當天最上方
      if (a.transaction_type === 'reset' && b.transaction_type !== 'reset') {
        return -1 // a 是歸零，排在前面（倒序列表中的上方）
      }
      if (b.transaction_type === 'reset' && a.transaction_type !== 'reset') {
        return 1 // b 是歸零，排在前面（倒序列表中的上方）
      }
      
      // 都是歸零或都不是歸零，按創建時間倒序排序
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  useEffect(() => {
    // 從交易記錄中提取所有月份
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
    
    // 保留使用者目前選擇的月份；只有在選擇的月份已不存在時才自動切換
    // selectedMonth === '' 代表「全部」或「最近結算」
    if (selectedMonth === '') return
    if (sortedMonths.length === 0) return

    const hasCurrentMonth = sortedMonths.includes(currentMonth)
    const hasSelectedMonth = selectedMonth ? sortedMonths.includes(selectedMonth) : false

    if (!hasSelectedMonth) {
      setSelectedMonth(hasCurrentMonth ? currentMonth : sortedMonths[0])
    }
  }, [transactions, currentMonth, selectedMonth])

  useEffect(() => {
    // 根據選中的月份篩選交易
    let result
    if (!selectedMonth) {
      result = sortTransactions(transactions)
    } else {
      const filtered = transactions.filter(transaction => {
        if (!transaction.transaction_date) return false
        const date = new Date(transaction.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return monthKey === selectedMonth
      })
      result = sortTransactions(filtered)
    }
    
    // 如果選擇了"最近結算"，過濾掉歸零點之前的交易
    if (calculateFromReset && !selectedMonth) {
      const lastReset = findLastResetTransaction(transactions)
      if (lastReset) {
        const resetDate = new Date(lastReset.transaction_date || lastReset.created_at)
        const resetDateOnly = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate()).getTime()
        
        result = result.filter(t => {
          if (t.transaction_type === 'reset') return false
          const tDate = new Date(t.transaction_date || t.created_at)
          const tDateOnly = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime()
          return tDateOnly > resetDateOnly
        })
      }
    }
    
    setFilteredTransactions(result)
  }, [selectedMonth, transactions, calculateFromReset])

  // 找到最近的歸零記錄
  const findLastResetTransaction = (transactionList: any[]) => {
    const sortedTransactions = [...transactionList].sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.created_at).getTime()
      const dateB = new Date(b.transaction_date || b.created_at).getTime()
      return dateB - dateA
    })
    return sortedTransactions.find(t => t.transaction_type === 'reset')
  }

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    if (locale === 'zh-TW') {
      return `${year}年${parseInt(month)}月`
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    }
  }

  // 切換到上一個月
  const goToPreviousMonth = () => {
    if (!selectedMonth && availableMonths.length > 0) {
      // 如果當前是"全部"，切換到最新月份
      setSelectedMonth(availableMonths[0])
    } else {
      const currentIndex = availableMonths.indexOf(selectedMonth)
      if (currentIndex < availableMonths.length - 1) {
        setSelectedMonth(availableMonths[currentIndex + 1])
      }
    }
  }

  // 切換到下一個月
  const goToNextMonth = () => {
    if (!selectedMonth) return
    
    const currentIndex = availableMonths.indexOf(selectedMonth)
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1])
    }
  }

  // 檢查是否可以切換
  const canGoPrevious = !selectedMonth 
    ? availableMonths.length > 0 
    : availableMonths.indexOf(selectedMonth) < availableMonths.length - 1

  const canGoNext = selectedMonth && availableMonths.indexOf(selectedMonth) > 0

  // 分頁邏輯（支援「不限」）
  const [itemsPerPage, setItemsPerPage] = useState<number | null>(25)
  const [currentPage, setCurrentPage] = useState(1)

  const isUnlimited = itemsPerPage === null
  const totalPages = isUnlimited ? 1 : Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = isUnlimited
    ? filteredTransactions
    : filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
  const showPagination = !isUnlimited && filteredTransactions.length > itemsPerPage

  return (
    <>
      {/* 月份選擇器和添加記錄按鈕 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm font-medium text-gray-700 bg-white/40 px-2 py-2.5 rounded-xl border border-white/50 flex items-center gap-1 h-[40px]">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            {tStudent('selectMonth')}
          </span>
          
          {/* 月份導航器 */}
          <div
            ref={monthNavigationContainerRef}
            className="relative flex items-center bg-white/50 rounded-xl p-1 border border-white/70 shadow-sm backdrop-blur-sm"
            style={{ height: '40px' }}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {/* 上一個月按鈕 */}
            <button
              onClick={goToPreviousMonth}
              disabled={!canGoPrevious}
              className={`p-2 rounded-lg transition-colors ${
                canGoPrevious
                  ? 'hover:bg-white/60 text-gray-600 hover:text-gray-900 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={tStudent('previousMonth')}
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>

            {/* 當前月份顯示（可點擊打開選擇器） */}
            <div className="relative" ref={monthPickerContainerRef}>
              <button
                ref={monthPickerButtonRef}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMonthPickerOpen(!isMonthPickerOpen)
                }}
                className="px-6 text-sm font-bold text-gray-900 tabular-nums text-center min-w-[100px] cursor-pointer"
              >
                {selectedMonth 
                  ? formatMonth(selectedMonth) 
                  : calculateFromReset 
                    ? tStudent('recentSettlement')
                    : tStudent('all')}
              </button>

              {/* 月份選擇器面板 */}
              {isMonthPickerOpen && ReactDOM.createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[9999] bg-black/20"
                    onClick={(e) => {
                      if (canInteractWithBackground) {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsMonthPickerOpen(false)
                      }
                    }}
                  />
                  <div
                    ref={pickerPanelRef}
                    className="fixed bg-white/95 backdrop-blur-sm border border-white/70 rounded-xl shadow-2xl z-[10000] p-3 min-w-[280px] max-w-[320px]"
                    style={{
                      top: `${pickerPosition.top}px`,
                      left: `${pickerPosition.left}px`,
                      opacity: 1,
                      visibility: 'visible',
                      position: 'fixed',
                      zIndex: 10000
                    }}
                    onClick={(e) => {
                      // 阻止点击事件冒泡到背景遮罩
                      e.stopPropagation()
                    }}
                  >
                    {/* 全部和最近結算選項 */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => {
                          setSelectedMonth('')
                          setCalculateFromReset(false)
                          setIsMonthPickerOpen(false)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          selectedMonth === '' && !calculateFromReset
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tStudent('all')}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMonth('')
                          setCalculateFromReset(true)
                          setIsMonthPickerOpen(false)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          calculateFromReset && !selectedMonth
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tStudent('recentSettlement')}
                      </button>
                    </div>

                    {/* 月份網格 */}
                    <div 
                      className="grid grid-cols-3 gap-1.5 overflow-y-auto pr-1 border border-gray-200 rounded-lg p-1.5"
                      style={{
                        maxHeight: '180px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9'
                      }}
                    >
                      {availableMonths.map(monthKey => {
                        const [year, monthNum] = monthKey.split('-')
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        
                        return (
                          <button
                            key={monthKey}
                            onClick={() => {
                              setSelectedMonth(monthKey)
                              setCalculateFromReset(false)
                              setIsMonthPickerOpen(false)
                            }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center h-[50px] cursor-pointer ${
                              selectedMonth === monthKey
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-blue-50 text-gray-700'
                            }`}
                          >
                            {locale === 'zh-TW' ? (
                              <>
                                <div className="text-xs">{year}年</div>
                                <div className="text-lg">{parseInt(monthNum)}月</div>
                              </>
                            ) : (
                              <>
                                <div className="text-xs">{year}</div>
                                <div className="text-lg">{monthNames[parseInt(monthNum) - 1]}</div>
                              </>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>

            {/* 下一個月按鈕 */}
            <button
              onClick={goToNextMonth}
              disabled={!canGoNext}
              className={`p-2 rounded-lg transition-colors ${
                canGoNext 
                  ? 'hover:bg-white/60 text-gray-600 hover:text-gray-900 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={tStudent('nextMonth')}
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </div>
        <button
          onClick={onAddTransaction}
          className="bg-emerald-400 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl shadow-[0_4px_12px_rgba(52,211,153,0.3)] hover:shadow-[0_6px_16px_rgba(52,211,153,0.4)] transition-all flex items-center justify-center gap-2 font-bold tracking-wide"
        >
          <span className="material-symbols-outlined">add_circle</span> {t('addRecord')}
        </button>
      </div>

      {/* 統計卡片 */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
        onClick={() => {
          console.log('[DEBUG] Statistics grid clicked')
        }}
      >
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center gap-3 border-t-4 border-t-emerald-400 hover:-translate-y-1">
          <div className="text-gray-600 font-medium tracking-wide">{t('totalIncome')}</div>
          <div className="text-4xl lg:text-5xl font-bold text-emerald-600 drop-shadow-sm tabular-nums tracking-tight">
            {selectedMonth || calculateFromReset
              ? '+$' + filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
              : '+$' + transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
            }
          </div>
        </div>
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center gap-3 border-t-4 border-t-rose-400 hover:-translate-y-1">
          <div className="text-gray-600 font-medium tracking-wide">{t('totalExpense')}</div>
          <div className="text-4xl lg:text-5xl font-bold text-rose-500 drop-shadow-sm tabular-nums tracking-tight">
            {selectedMonth || calculateFromReset
              ? '-$' + Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
              : '-$' + Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
            }
          </div>
        </div>
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center gap-3 border-t-4 border-t-blue-400 hover:-translate-y-1 bg-blue-50/20">
          <div className="text-gray-600 font-medium tracking-wide">{t('currentBalance')}</div>
          <div className="text-4xl lg:text-5xl font-bold text-blue-600 drop-shadow-sm tabular-nums tracking-tight">
            {selectedMonth || calculateFromReset
              ? filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
              : transactions.reduce((sum, t) => sum + t.amount, 0)
            }
          </div>
        </div>
      </div>

      {/* 交易記錄列表 */}
      <div className="space-y-4">
        {paginatedTransactions.map(transaction => {
          // 如果是測驗獎金，顯示事件名稱（title），否則顯示分類標籤
          const categoryLabel = transaction.category === '測驗獎金' 
            ? (transaction.title || transaction.description || '測驗獎金')
            : (transaction.category || '其他')
          return (
            <div
              key={transaction.id}
              className="glass-card p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-rose-50/40 transition-colors"
              onClick={() => onEditTransaction && onEditTransaction(transaction)}
            >
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border group-hover:scale-105 transition-transform shadow-sm ${
                  transaction.amount > 0 
                    ? 'bg-emerald-200/50 text-emerald-600 border-emerald-300/30' 
                    : 'bg-rose-200/50 text-rose-500 border-rose-300/30'
                }`}>
                  {transaction.category === 'shopping' ? (
                    <span className="material-symbols-outlined text-3xl">shopping_bag</span>
                  ) : transaction.amount > 0 ? (
                    <span className="material-symbols-outlined text-3xl">paid</span>
                  ) : (
                    <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg mb-0.5 group-hover:text-rose-600 transition-colors">
                    {transaction.title}
                  </div>
                  <div className="text-sm text-gray-500 font-medium flex items-center gap-2">
                    <span className={`bg-white/50 px-2 py-0.5 rounded border border-white/60 text-xs`}>
                      {categoryLabel}
                    </span>
                    <span>
                      {transaction.transaction_date 
                        ? new Date(transaction.transaction_date).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })
                        : new Date(transaction.created_at).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div className={`text-3xl font-bold tabular-nums text-right md:text-right w-full md:w-auto pl-0 md:pl-0 ${transaction.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount}
              </div>
            </div>
          )
        })}
      </div>

      {/* 分頁控制 */}
      {showPagination && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-white/60 text-gray-600 hover:text-gray-900 cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined">⏮️</span>
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-white/60 text-gray-600 hover:text-gray-900 cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined">◀️ Previous</span>
          </button>
          <div className="px-4 text-sm font-medium text-gray-500">
            Page {currentPage} of {totalPages} ({paginatedTransactions.length} items)
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-white/60 text-gray-600 hover:text-gray-900 cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined">Next ▶️</span>
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-white/60 text-gray-600 hover:text-gray-900 cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined">⏭️</span>
          </button>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={false}
        onClose={() => {}}
        studentId={studentId}
        transaction={null}
        onSuccess={() => {}}
      />
    </>
  )
}