'use client'

import { useState, useEffect } from 'react'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | null>(25)
  const [calculateFromReset, setCalculateFromReset] = useState<boolean>(false)

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

  // 自定義排序：同一天的歸零記錄視為當天最後發生（在倒序列表中排在當天最上方）
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
    
    // 如果當前月份沒有資料，預設顯示最新有資料的月份
    if (!sortedMonths.includes(currentMonth) && sortedMonths.length > 0) {
      setSelectedMonth(sortedMonths[0])
    }
  }, [transactions, currentMonth])

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
    // 月份變更時重置頁碼
    setCurrentPage(1)
    
    // 當選擇具體月份時，自動取消勾選"最近結算"
    if (selectedMonth && calculateFromReset) {
      setCalculateFromReset(false)
    }
  }, [selectedMonth, transactions, calculateFromReset])

  // 找到最近的歸零記錄
  const findLastResetTransaction = (transactionList: any[]) => {
    // 按日期排序，找最近的歸零記錄
    const sortedTransactions = [...transactionList].sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.created_at).getTime()
      const dateB = new Date(b.transaction_date || b.created_at).getTime()
      return dateB - dateA
    })
    
    return sortedTransactions.find(t => t.transaction_type === 'reset')
  }

  // 計算當前顯示的統計（只從最近的歸零記錄開始計算）
  const calculateStats = () => {
    // 如果選擇了"最近結算"，使用 filteredTransactions（已經過濾過的）
    // 否則根據 selectedMonth 決定使用哪個交易列表
    const transactionsToUse = calculateFromReset && !selectedMonth 
      ? filteredTransactions 
      : (selectedMonth ? filteredTransactions : transactions)
    
    const lastReset = findLastResetTransaction(transactionsToUse)
    
    let transactionsToCalculate = transactionsToUse
    let startingBalance = 0 // 起始金額
    
    // 如果有歸零記錄，只計算歸零之後的交易
    if (lastReset) {
      startingBalance = lastReset.amount || 0 // 歸零記錄的金額就是起始金額
      
      // 如果沒有選擇"最近結算"，需要手動過濾
      if (!calculateFromReset || selectedMonth) {
        // 獲取歸零記錄的日期和時間戳
        const resetDate = new Date(lastReset.transaction_date || lastReset.created_at)
        const resetDateOnly = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate()).getTime()
        
        transactionsToCalculate = transactionsToCalculate.filter(t => {
          if (t.transaction_type === 'reset') return false // 排除歸零記錄本身
          
          const tDate = new Date(t.transaction_date || t.created_at)
          const tDateOnly = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime()
          
          // 比較邏輯（簡化）：
          // 歸零記錄視為該天最後發生，所以只計入日期晚於歸零日期的交易
          // 同一天的記錄全部不計入（因為歸零是該天最後）
          return tDateOnly > resetDateOnly
        })
      }
    }
    
    const earned = transactionsToCalculate.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
    const spent = transactionsToCalculate.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    
    return { 
      earned, 
      spent, 
      balance: startingBalance + earned - spent, // 餘額 = 起始金額 + 收入 - 支出
      lastResetDate: lastReset?.transaction_date,
      startingBalance
    }
  }

  const { earned: totalEarned, spent: totalSpent, balance, lastResetDate, startingBalance } = calculateStats()

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    if (locale === 'zh-TW') {
      return `${year}年${parseInt(month)}月`
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    }
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const dateStr = locale === 'zh-TW' 
      ? date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    if (date.toDateString() === today.toDateString()) {
      return `${t('today')} ${dateStr}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `${t('yesterday')} ${dateStr}`
    } else {
      return locale === 'zh-TW' 
        ? `${date.getFullYear()}/${dateStr}`
        : `${dateStr}, ${date.getFullYear()}`
    }
  }

  // 分頁邏輯
  // 分頁邏輯（支援「不限」）
  const isUnlimited = itemsPerPage === null
  const totalPages = isUnlimited ? 1 : Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = isUnlimited
    ? filteredTransactions
    : filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
  const showPagination = !isUnlimited && filteredTransactions.length > itemsPerPage

  // 切換到上一個月
  const goToPreviousMonth = () => {
    if (!selectedMonth && availableMonths.length > 0) {
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

  return (
    <>
      {/* 月份選擇器和添加記錄按鈕 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-gray-800 whitespace-nowrap">
              📅 {tStudent('selectMonth')}
            </label>
            
            {/* 月份导航器 */}
            <div className="flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg p-1">
            {/* 上一個月按鈕 */}
            <button
              onClick={goToPreviousMonth}
              disabled={!canGoPrevious}
              className={`p-2 rounded-lg transition-all ${
                canGoPrevious
                  ? 'hover:bg-gray-100 text-gray-700 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={tStudent('previousMonth')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 當前月份顯示（可點擊打開選擇器） */}
            <div className="relative">
              <button
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="px-4 py-2 font-semibold text-gray-800 hover:bg-gray-50 rounded-lg transition-all min-w-[140px] text-center cursor-pointer"
              >
                {selectedMonth 
                  ? formatMonth(selectedMonth) 
                  : calculateFromReset 
                    ? tStudent('recentSettlement')
                    : tStudent('all')}
                {selectedMonth === currentMonth && ' 📍'}
              </button>

              {/* 月份選擇器面板 */}
              {isMonthPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMonthPickerOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-2xl z-20 p-4 min-w-[300px]">
                    {/* 全部和最近結算選項 */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => {
                          setSelectedMonth('')
                          setCalculateFromReset(false)
                          setIsMonthPickerOpen(false)
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
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
                        className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
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
                      className="grid grid-cols-3 gap-2 overflow-y-auto pr-2 border border-gray-200 rounded-lg p-2"
                      style={{
                        maxHeight: '200px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9'
                      }}
                    >
                      {availableMonths.map(month => {
                        const [year, monthNum] = month.split('-')
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        
                        return (
                          <button
                            key={month}
                            onClick={() => {
                              setSelectedMonth(month)
                              setCalculateFromReset(false)
                              setIsMonthPickerOpen(false)
                            }}
                            className={`px-3 py-2 rounded-lg font-semibold transition-all flex flex-col items-center h-[85px] cursor-pointer ${
                              selectedMonth === month
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
                            <div className="text-xs h-4 flex items-center justify-center">
                              {month === currentMonth ? '📍' : ''}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* 滾動提示 */}
                    {availableMonths.length > 6 && (
                      <div className="text-xs text-gray-500 text-center mt-2 animate-pulse">
                        {tStudent('scrollMoreMonths')} ↓
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 下一個月按鈕 */}
            <button
              onClick={goToNextMonth}
              disabled={!canGoNext}
              className={`p-2 rounded-lg transition-all ${
                canGoNext
                  ? 'hover:bg-gray-100 text-gray-700 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={tStudent('nextMonth')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* 從最後歸零點計算說明（只在選擇最近結算時顯示） */}
            {!selectedMonth && calculateFromReset && (
              <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-2">
                <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                  {tStudent('calculateFromResetDescription')}
                </span>
              </div>
            )}
          </div>
          </div>
          
          {/* 添加記錄按鈕 */}
          {onAddTransaction && (
            <button
              onClick={onAddTransaction}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span>➕</span>
              <span>{t('addRecord')}</span>
            </button>
          )}
        </div>

        {/* 歸零提示 */}
        {lastResetDate && !selectedMonth && !calculateFromReset && (
          <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                {t('statsFrom', { date: formatRelativeDate(lastResetDate) })}
                {startingBalance > 0 && (
                  <span>
                    {locale === 'zh-TW' ? '，' : ', '}
                    {t('startingBalance')}: <span className="font-bold">${startingBalance}</span>
                  </span>
                )}
              </span>
            </p>
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 font-semibold mb-2">
              {selectedMonth ? `${formatMonth(selectedMonth)} ${t('income')}` : t('totalIncome')}
            </p>
            <p className="text-4xl font-bold text-green-600">+${totalEarned}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 font-semibold mb-2">
              {selectedMonth ? `${formatMonth(selectedMonth)} ${t('expense')}` : t('totalExpense')}
            </p>
            <p className="text-4xl font-bold text-red-600">-${totalSpent}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 font-semibold mb-2">
              {selectedMonth ? t('monthBalance') : t('currentBalance')}
            </p>
            <p className="text-4xl font-bold text-blue-600">${balance}</p>
          </div>
        </div>
      </div>

      {/* 存摺記錄 */}
      {filteredTransactions && filteredTransactions.length > 0 ? (
        <>
        <div className="space-y-3">
          {paginatedTransactions.map((transaction: any) => {
            // 檢查是否有同一天的其他記錄
            const hasSameDayRecords = transaction.transaction_type === 'reset' && 
              filteredTransactions.some((t: any) => {
                if (t.id === transaction.id || t.transaction_type === 'reset') return false
                const tDate = new Date(t.transaction_date || t.created_at).toDateString()
                const resetDate = new Date(transaction.transaction_date || transaction.created_at).toDateString()
                return tDate === resetDate
              })

            return (
              <div
                key={transaction.id}
                className={`group p-5 rounded-lg border-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ${
                  transaction.transaction_type === 'reset'
                    ? 'bg-blue-50 border-blue-300 hover:border-blue-400'
                    : transaction.amount > 0 
                      ? 'bg-green-50 border-green-200 hover:border-green-400' 
                      : 'bg-red-50 border-red-200 hover:border-red-400'
                }`}
              >
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-3xl`}>
                        {transaction.transaction_type === 'reset' ? '🔄' :
                         transaction.transaction_type === 'earn' ? '💰' :
                         transaction.transaction_type === 'spend' ? '🛍️' :
                         transaction.transaction_type === 'bonus' ? '🎁' : '⚠️'}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                          {transaction.description}
                          {transaction.transaction_type === 'reset' && (
                            <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                              {t('reset')}
                            </span>
                          )}
                          {hasSameDayRecords && (
                            <span className="text-xs px-2 py-1 bg-yellow-500 text-white rounded-full">
                              {t('lastOfDay')}
                            </span>
                          )}
                        </h3>
                        {hasSameDayRecords && (
                          <p className="text-xs text-gray-600 mt-1">
                            ℹ️ {t('resetIsLast')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {transaction.category || t('categories.other')}
                          </span>
                          <span className="text-sm text-gray-400">
                            {transaction.transaction_date 
                              ? formatRelativeDate(transaction.transaction_date)
                              : new Date(transaction.created_at).toLocaleString('zh-TW')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                <div className="text-right flex flex-col items-end gap-2">
                  {transaction.transaction_type === 'reset' ? (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">{t('startingBalance')}</div>
                      <div className="text-3xl font-bold text-blue-600">
                        ${transaction.amount || 0}
                      </div>
                    </div>
                  ) : (
                    <div className={`text-3xl font-bold ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}${transaction.amount}
                    </div>
                  )}
                  
                  {/* 編輯按鈕 - 預設隱藏，hover 時顯示 */}
                  {onEditTransaction ? (
                    <button
                      onClick={() => onEditTransaction(transaction)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
                    >
                      ✏️ {tCommon('edit')}
                    </button>
                  ) : (
                    <Link
                      href={`/student/${studentId}/transactions/${transaction.id}/edit`}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
                    >
                      ✏️ {tCommon('edit')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>

        {/* 分頁控制 */}
        {showPagination && (
          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⏮️
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ◀️ {tCommon('prevPage')}
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tCommon('nextPage')} ▶️
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⏭️
            </button>
            
            <span className="ml-4 text-sm text-gray-500">
              {tCommon('pageInfo', { current: currentPage, total: totalPages, count: filteredTransactions.length })}
            </span>
          </div>
        )}
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-2">📭 {selectedMonth ? t('noRecordsThisMonth') : t('emptyPassbook')}</p>
          <p className="text-gray-400 text-sm mb-4">
            {selectedMonth ? t('selectOtherMonthOrAdd') : t('clickToAddRecord')}
          </p>
        </div>
      )}
    </>
  )
}

