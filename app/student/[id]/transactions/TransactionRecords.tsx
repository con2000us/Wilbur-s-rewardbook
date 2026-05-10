'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import StudentHomeNavButton from '@/app/components/StudentHomeNavButton'
import TransactionModal from './components/TransactionModal'
import { useRewardType } from './TransactionsContent'
import { findRewardTypeForTransaction, getRewardUnit } from '../rewards/rewardUnit'

interface Props {
  studentId: string
  transactions: any[]
  studentName?: string
  onEditTransaction?: (transaction: any) => void
  onAddTransaction?: () => void
  selectedRewardType?: string | null
  onRewardTypeSelect?: (rewardType: string | null) => void
  subjects?: any[]
  assessments?: any[]
  rewardTypes?: any[]
}

const ASSESSMENT_TYPE_KEYS = ['exam', 'quiz', 'homework', 'project'] as const

export default function TransactionRecords({ studentId, transactions, studentName, onEditTransaction, onAddTransaction, selectedRewardType, onRewardTypeSelect, subjects = [], assessments = [], rewardTypes = [] }: Props) {
  const t = useTranslations('transaction')
  const tStudent = useTranslations('student')
  const tCommon = useTranslations('common')
  const tAssessment = useTranslations('assessment')
  const locale = useLocale()

  const assessmentById = useMemo(() => {
    const m = new Map<string, any>()
    assessments.forEach((a: any) => {
      if (a?.id != null) m.set(String(a.id), a)
    })
    return m
  }, [assessments])

  const subjectById = useMemo(() => {
    const m = new Map<string, any>()
    subjects.forEach((s: any) => {
      if (s?.id != null) m.set(String(s.id), s)
    })
    return m
  }, [subjects])

  /** 由 assessment_id join 評量／科目，顯示評量來源上下文 */
  const getAssessmentContextLine = (transaction: any): string | null => {
    if (!transaction.assessment_id) return null
    const a = assessmentById.get(String(transaction.assessment_id))
    if (!a) {
      return locale === 'zh-TW' ? '評量紀錄已無法載入（可能已刪除）' : 'Assessment unavailable (may have been deleted)'
    }
    const subjectId = a.subject_id != null ? String(a.subject_id) : ''
    const subject = subjectId ? subjectById.get(subjectId) : null
    const subjectName = (subject?.name || '').trim()
    const typeRaw = (a.assessment_type || '').trim()
    const typeLabel =
      typeRaw &&
      ASSESSMENT_TYPE_KEYS.includes(typeRaw as (typeof ASSESSMENT_TYPE_KEYS)[number])
        ? tAssessment(`types.${typeRaw}` as 'types.exam')
        : typeRaw

    const sep = locale === 'zh-TW' ? ' · ' : ' · '
    const parts: string[] = []
    if (subjectName) parts.push(`${tAssessment('subject')}: ${subjectName}`)
    if (typeLabel) parts.push(typeLabel)

    return parts.length > 0 ? parts.join(sep) : null
  }

  // 從 Context 獲取月份選擇狀態
  const { selectedMonth, setSelectedMonth } = useRewardType()

  // 預設為最近結算
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState(transactions)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [calculateFromReset, setCalculateFromReset] = useState<boolean>(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const categoryButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const monthPickerButtonRef = useRef<HTMLButtonElement>(null)

  const getTransactionUnit = (transaction: any) => {
    const rewardType = findRewardTypeForTransaction(transaction, rewardTypes)
    if (rewardType) return getRewardUnit(rewardType, locale)
    return ''
  }
  const formatTransactionAmount = (amount: number, transaction: any) => {
    const unit = getTransactionUnit(transaction)
    const number = Math.abs(amount).toLocaleString()
    return unit ? `${number} ${unit}` : number
  }
  const getCategoryLabel = (transaction: any) => {
    const rewardType = findRewardTypeForTransaction(transaction, rewardTypes)
    if (rewardType) {
      return locale === 'zh-TW'
        ? (rewardType.display_name_zh || rewardType.display_name || rewardType.type_key)
        : (rewardType.display_name_en || rewardType.display_name || rewardType.type_key)
    }
    return transaction.category || (locale === 'zh-TW' ? '其他' : 'Other')
  }

  // 判斷 icon 字串是 emoji 還是 Material Icon 名稱（與 RewardTypePopup 同邏輯）
  const isEmojiIcon = (icon: string) => {
    if (!icon) return false
    if (/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon)) return true
    if (icon.length <= 2) return true
    return !/^[a-z_]+$/i.test(icon)
  }


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
    
    // 根據選擇的分類過濾（依獎勵來源：學業或課外）
    if (selectedCategory) {
      if (selectedCategory === '學業獎勵') {
        // 有 assessment_id 表示來自評量（學業）
        result = result.filter(t => t.assessment_id != null && t.transaction_type !== 'reset')
      } else if (selectedCategory === '課外表現') {
        // 沒有 assessment_id 表示來自課外表現（手動新增）
        result = result.filter(t => t.assessment_id == null && t.transaction_type !== 'reset')
      }
    }
    
    // 根據選擇的獎勵來源分類過濾
    if (selectedRewardType) {
      if (selectedRewardType.startsWith('subject_')) {
        // 科目分類：subject_${subjectId}
        const subjectId = selectedRewardType.replace('subject_', '')
        // 建立 assessment_id → subject_id 映射
        const assessmentToSubject = new Map<string, string>()
        assessments.forEach((a: any) => {
          if (a.id && a.subject_id) {
            assessmentToSubject.set(a.id, a.subject_id)
          }
        })
        // 過濾出該科目的交易
        result = result.filter(t => {
          if (t.assessment_id) {
            const tSubjectId = assessmentToSubject.get(t.assessment_id)
            return tSubjectId === subjectId
          }
          return false
        })
      } else if (selectedRewardType === 'special') {
        // 特殊事蹟：沒有 assessment_id 的交易
        result = result.filter(t => !t.assessment_id)
      } else {
        // 向後兼容：直接匹配獎勵類別名稱
        result = result.filter(t => {
          if (t.category === selectedRewardType) {
            return true
          }
          return false
        })
      }
    }
    
    setFilteredTransactions(result)
  }, [selectedMonth, transactions, calculateFromReset, selectedCategory, selectedRewardType, assessments])

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
  const statsTransactions = (selectedMonth || calculateFromReset) ? filteredTransactions : transactions
  const statsByCategory = Object.values(
    statsTransactions.reduce((acc: Record<string, any>, tx: any) => {
      const key = tx.category || '__other__'
      if (!acc[key]) {
        acc[key] = {
          key,
          label: getCategoryLabel(tx),
          unit: getTransactionUnit(tx),
          income: 0,
          expense: 0,
          balance: 0
        }
      }
      const amount = Number(tx.amount) || 0
      if (amount > 0) {
        acc[key].income += amount
      } else if (amount < 0) {
        acc[key].expense += Math.abs(amount)
      }
      acc[key].balance += amount
      return acc
    }, {})
  )

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col min-[360px]:flex-row min-[360px]:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-green-600 material-icons-outlined text-3xl drop-shadow-sm flex-shrink-0">attach_money</span>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tight">{t('passbook')}</h1>
              {studentName && (
                <p className="text-sm text-slate-500">
                  {locale === 'zh-TW' 
                    ? `記錄${studentName}的獎勵收支明細`
                    : `Tracking ${studentName}'s reward income and expenses`
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* 添加交易按鈕 */}
            {onAddTransaction && (
              <button 
                onClick={onAddTransaction}
                className="student-toolbar-primary px-6 py-2.5 min-h-11 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-icons-outlined text-lg">add_circle</span>
                {locale === 'zh-TW' ? '添加記錄' : 'Add Record'}
              </button>
            )}
            
            <StudentHomeNavButton className="hidden lg:inline-flex" />
          </div>
        </div>
        
        {/* 分類過濾器和月份選擇器 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* 分類過濾器 */}
          <div className="w-full md:w-auto bg-white/60 backdrop-blur-sm p-1.5 rounded-full flex flex-nowrap items-center gap-1 border border-white/40 shadow-sm overflow-hidden overflow-x-auto">
            {/* 全部 */}
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                !selectedCategory || selectedCategory === ''
                  ? 'bg-white shadow-sm font-bold text-slate-800'
                  : 'font-medium text-slate-500 hover:bg-white/50'
              }`}
            >
              {locale === 'zh-TW' ? '全部' : 'All'}
            </button>

            {/* 學業獎勵 */}
            <button
              ref={(el) => { categoryButtonRefs.current['學業獎勵'] = el }}
              onClick={() => {
                Object.values(categoryButtonRefs.current).forEach(btn => {
                  if (btn) {
                    btn.style.borderColor = 'transparent'
                    btn.style.backgroundColor = ''
                  }
                })
                setSelectedCategory('學業獎勵')
              }}
              className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                selectedCategory === '學業獎勵'
                  ? 'bg-white shadow-sm font-bold text-slate-800'
                  : 'font-medium text-slate-500'
              }`}
              style={selectedCategory === '學業獎勵' ? {
                border: '2px solid transparent'
              } : {
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== '學業獎勵') {
                  e.currentTarget.style.borderColor = '#4ade80'
                  e.currentTarget.style.backgroundColor = '#4ade8015'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== '學業獎勵') {
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.backgroundColor = ''
                }
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4ade80' }}></span>
              {locale === 'zh-TW' ? '學業獎勵' : 'Academic Reward'}
            </button>

            {/* 課外表現 */}
            <button
              ref={(el) => { categoryButtonRefs.current['課外表現'] = el }}
              onClick={() => {
                Object.values(categoryButtonRefs.current).forEach(btn => {
                  if (btn) {
                    btn.style.borderColor = 'transparent'
                    btn.style.backgroundColor = ''
                  }
                })
                setSelectedCategory('課外表現')
              }}
              className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                selectedCategory === '課外表現'
                  ? 'bg-white shadow-sm font-bold text-slate-800'
                  : 'font-medium text-slate-500'
              }`}
              style={selectedCategory === '課外表現' ? {
                border: '2px solid transparent'
              } : {
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== '課外表現') {
                  e.currentTarget.style.borderColor = '#fbbf24'
                  e.currentTarget.style.backgroundColor = '#fbbf2415'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== '課外表現') {
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.backgroundColor = ''
                }
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#fbbf24' }}></span>
              {locale === 'zh-TW' ? '課外表現' : 'Extra Performance'}
            </button>
          </div>

          <div className="w-full md:w-auto flex items-center gap-3 md:ml-auto justify-end md:justify-start">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{tStudent('selectAssessmentMonth')}</span>
            <div className="relative min-w-[180px]">
              <div className="flex items-center bg-white/60 backdrop-blur-sm p-1.5 rounded-full border border-white/40 shadow-sm">
                <div className="flex items-center justify-between bg-white px-4 py-1.5 rounded-full border border-slate-100 gap-6 w-full">
                  <button
                    onClick={goToPreviousMonth}
                    disabled={!canGoPrevious}
                    className="material-icons-outlined text-slate-400 cursor-pointer text-lg hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    chevron_left
                  </button>
                  <button
                    ref={monthPickerButtonRef}
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsMonthPickerOpen(!isMonthPickerOpen)
                    }}
                    className="font-bold text-sm min-w-[6rem] text-center cursor-pointer hover:text-primary transition-colors whitespace-nowrap"
                  >
                    {selectedMonth 
                      ? formatMonth(selectedMonth) 
                      : calculateFromReset 
                        ? tStudent('recentSettlement')
                        : tStudent('all')}
                  </button>
                  <button
                    onClick={goToNextMonth}
                    disabled={!canGoNext}
                    className="material-icons-outlined text-slate-400 cursor-pointer text-lg hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    chevron_right
                  </button>
                </div>
                {/* 月份選擇器下拉選單 */}
                {isMonthPickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10 cursor-pointer"
                      onClick={() => setIsMonthPickerOpen(false)}
                    />
                    <div
                      className="absolute top-full right-0 mt-2 z-50 bg-white/95 backdrop-blur-xl rounded-xl border border-slate-200 shadow-2xl p-4 min-w-[280px] transition-all duration-300 ease-in-out"
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
                      {availableMonths && availableMonths.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-2 border border-gray-200 rounded-lg p-2 max-h-[240px]">
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
                                    : 'hover:bg-blue-50 text-gray-900'
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
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 統計卡片（依獎勵類型分開） */}
      <div className="space-y-3 mb-6">
        {statsByCategory.map((stat: any) => (
          <div key={stat.key} className="bg-white p-3 rounded-3xl shadow-sm border border-pink-50">
            <p className="text-xs text-slate-500 font-semibold mb-2">{stat.label}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">{t('totalIncome')}</p>
                <p className="text-emerald-600 text-lg font-bold">{stat.income.toLocaleString()} {stat.unit}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">{t('totalExpense')}</p>
                <p className="text-rose-500 text-lg font-bold">{stat.expense.toLocaleString()} {stat.unit}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium mb-1">{t('currentBalance')}</p>
                <p className="text-blue-600 text-lg font-bold">{stat.balance.toLocaleString()} {stat.unit}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 交易記錄列表 */}
      <div className="space-y-4">
        {paginatedTransactions.map(transaction => {
          // 對應的獎勵類型（提供 icon／顏色／單位）
          const rewardType = findRewardTypeForTransaction(transaction, rewardTypes)
          const rewardColor = rewardType?.color || ''
          const rewardIcon = rewardType?.icon || ''
          const categoryLabel = getCategoryLabel(transaction)

          // 卡片底色：以獎勵類型主題色作淡色（找不到時保留原本白底）
          const cardStyle: React.CSSProperties | undefined = rewardColor
            ? {
                borderColor: `${rewardColor}66`     // ~40% alpha
              }
            : undefined

          // 圖示框：以獎勵類型主題色作淡背景；找不到時依正負金額顯示
          const iconWrapperStyle: React.CSSProperties | undefined = rewardColor
            ? {
                backgroundColor: `${rewardColor}4D`, // ~30% alpha
                color: rewardColor
              }
            : undefined
          const iconWrapperFallbackClass = transaction.amount > 0
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-rose-100 text-rose-600'

          // 類別標籤色：跟著主題色
          const tagStyle: React.CSSProperties = rewardColor
            ? {
                backgroundColor: `${rewardColor}1F`,
                color: rewardColor,
                borderColor: `${rewardColor}4D`
              }
            : {
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                color: '#f97316',
                borderColor: 'rgba(249, 115, 22, 0.3)'
              }

          const assessmentContext = getAssessmentContextLine(transaction)

          return (
            <div
              key={transaction.id}
              className="bg-white p-4 rounded-[2rem] shadow-sm flex items-center gap-4 group transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-pink-50"
              style={cardStyle}
              onClick={() => onEditTransaction && onEditTransaction(transaction)}
            >
              <div className="flex items-center gap-4 w-full md:w-auto flex-1 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    rewardColor ? '' : iconWrapperFallbackClass
                  }`}
                  style={iconWrapperStyle}
                >
                  {rewardIcon ? (
                    isEmojiIcon(rewardIcon) ? (
                      <span className="text-2xl leading-none">{rewardIcon}</span>
                    ) : (
                      <span className="material-icons-outlined text-2xl">{rewardIcon}</span>
                    )
                  ) : transaction.category === 'shopping' ? (
                    <span className="material-icons-outlined text-2xl">shopping_bag</span>
                  ) : transaction.amount > 0 ? (
                    <span className="material-icons-outlined text-2xl">attach_money</span>
                  ) : (
                    <span className="material-icons-outlined text-2xl">account_balance_wallet</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                      {(() => {
                        const date = transaction.transaction_date 
                          ? new Date(transaction.transaction_date)
                          : new Date(transaction.created_at)
                        if (locale === 'zh-TW') {
                          return `${date.getMonth() + 1}月${date.getDate()}日`
                        } else {
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }
                      })()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={tagStyle}>
                      {categoryLabel}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate text-slate-600">
                    {transaction.description || transaction.title || ''}
                  </p>
                  {assessmentContext && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate" title={assessmentContext}>
                      {assessmentContext}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`font-bold tabular-nums ${transaction.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`} style={{ fontSize: '1.6875rem' }}>
                  {formatTransactionAmount(transaction.amount, transaction)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 分頁控制 */}
      {showPagination && (
        <div className="mt-8 pt-4 flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`glass-btn px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
            {tCommon('prevPage')}
          </button>

          {/* 頁碼按鈕 */}
          {(() => {
            const pages: (number | string)[] = []
            
            if (totalPages <= 7) {
              // 如果總頁數少於等於7，顯示所有頁碼
              for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
              }
            } else {
              // 總是顯示第一頁
              pages.push(1)
              
              if (currentPage <= 4) {
                // 當前頁在前4頁，顯示 1, 2, 3, 4, 5, ..., totalPages
                for (let i = 2; i <= 5; i++) {
                  pages.push(i)
                }
                pages.push('...')
                pages.push(totalPages)
              } else if (currentPage >= totalPages - 3) {
                // 當前頁在後4頁，顯示 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
                pages.push('...')
                for (let i = totalPages - 4; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                // 當前頁在中間，顯示 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
                pages.push('...')
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                  pages.push(i)
                }
                pages.push('...')
                pages.push(totalPages)
              }
            }
            
            return pages.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-600">
                    ...
                  </span>
                )
              }
              
              const pageNum = page as number
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`glass-btn px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-white/60 text-gray-900 shadow-lg ring-1 ring-white/70'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })
          })()}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`glass-btn px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 cursor-pointer'
            }`}
          >
            {tCommon('nextPage')}
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={false}
        onClose={() => {}}
        studentId={studentId}
        transaction={undefined}
        onSuccess={() => {}}
      />
    </>
  )
}