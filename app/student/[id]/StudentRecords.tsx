'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SubjectTabs from './SubjectTabs'
import AssessmentModal from './components/AssessmentModal'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface Props {
  studentId: string
  studentName: string
  subjects: any[]
  assessments: any[]
  transactions: any[]
  summary: any
  rewardRules: any[]
}

export default function StudentRecords({ studentId, studentName, subjects, assessments, transactions, summary, rewardRules }: Props) {
  const t = useTranslations('student')
  const locale = useLocale()
  const router = useRouter()
  
  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<any>(null)
  const [mostCommonType, setMostCommonType] = useState<string>('exam')
  
  // 預設為當前月份
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState(assessments)
  const [filteredSummary, setFilteredSummary] = useState(summary)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [resetDate, setResetDate] = useState<Date | null>(null)
  const [calculateFromReset, setCalculateFromReset] = useState<boolean>(false)
  const [rewardBreakdown, setRewardBreakdown] = useState({
    assessmentEarned: 0,    // 評量獎金收入（保留用於向後兼容）
    assessmentSpent: 0,     // 評量相關支出（保留用於向後兼容）
    passbookEarned: 0,      // 存摺其他收入（保留用於向後兼容）
    passbookSpent: 0,       // 存摺其他支出（保留用於向後兼容）
    startingBalance: 0,     // 歸零基準金額
    totalRewardAmount: 0,   // 評量獎金（從評量記錄計算）
    totalPassbookEarned: 0, // 非評量收入
    totalPassbookSpent: 0,  // 非評量支出
    resetBaseInPeriod: 0,   // 該時間區段內的獎金存摺歸零基準
    nonAssessmentBalance: 0, // 獎金存摺非評量獎金部份的金額（收入-支出）
    averageScores: {        // 各評量類型平均分數
      exam: 0,
      quiz: 0,
      homework: 0,
      project: 0
    },
    totalAverage: 0         // 總平均分數
  })

  useEffect(() => {
    // 從評量記錄中提取所有月份
    const months = new Set<string>()
    assessments.forEach(assessment => {
      if (assessment.due_date) {
        const date = new Date(assessment.due_date)
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

    // 計算最常用的評量類型
    const typeCounts: { [key: string]: number } = {}
    assessments.forEach(assessment => {
      const type = assessment.assessment_type || 'exam'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
    setMostCommonType(mostCommon ? mostCommon[0] : 'exam')
  }, [assessments, currentMonth])

  // Modal 控制函數
  const handleOpenAddModal = () => {
    // 檢查是否有科目
    if (!subjects || subjects.length === 0) {
      // 顯示確認對話框，引導用戶到科目頁面
      const message = locale === 'zh-TW' 
        ? '目前還沒有任何科目。\n\n要添加評量記錄，請先添加科目。\n\n是否要前往科目管理頁面添加科目？'
        : 'No subjects found.\n\nTo add assessment records, please add subjects first.\n\nWould you like to go to the Subjects page to add subjects?'
      
      if (window.confirm(message)) {
        // 跳轉到科目頁面
        router.push(`/student/${studentId}/subjects`)
      }
      return
    }
    
    setEditingAssessment(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (assessment: any) => {
    setEditingAssessment(assessment)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAssessment(null)
  }

  const handleModalSuccess = () => {
    router.refresh()
  }

  useEffect(() => {
    // 找到最近的歸零記錄
    const findLastResetTransaction = (transactionList: any[]) => {
      const sortedTransactions = [...transactionList].sort((a, b) => {
        const dateA = new Date(a.transaction_date || a.created_at).getTime()
        const dateB = new Date(b.transaction_date || b.created_at).getTime()
        return dateB - dateA
      })
      return sortedTransactions.find(t => t.transaction_type === 'reset')
    }
    
    const lastReset = findLastResetTransaction(transactions)
    const lastResetDate = lastReset 
      ? new Date(lastReset.transaction_date || lastReset.created_at)
      : null
    const resetDateOnly = lastResetDate 
      ? new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate()).getTime()
      : null
    
    // 根據選中的月份篩選評量
    let filtered = assessments
    if (selectedMonth) {
      filtered = assessments.filter(assessment => {
        if (!assessment.due_date) return false
        const date = new Date(assessment.due_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return monthKey === selectedMonth
      })
    }
    
    // 如果勾選了"從最後歸零點計算"，過濾掉歸零點之前的評量（不包含歸零點當天）
    if (calculateFromReset && resetDateOnly) {
      filtered = filtered.filter(assessment => {
        if (!assessment.due_date && !assessment.completed_date) return true // 沒有日期的評量保留
        // 使用 due_date（考試日期）而非 completed_date（記錄日期）
        const assessmentDate = new Date(assessment.due_date || assessment.completed_date || assessment.created_at)
        const assessmentDateOnly = new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate()).getTime()
        // 只顯示歸零點隔天及之後的評量（不包含歸零點當天）
        return assessmentDateOnly > resetDateOnly
      })
    }
    
    setFilteredAssessments(filtered)
    
    // 當選擇具體月份時，自動取消勾選"從最後歸零點計算"
    if (selectedMonth && calculateFromReset) {
      setCalculateFromReset(false)
    }
  }, [selectedMonth, assessments, calculateFromReset, transactions])

  useEffect(() => {
    // 根據月份和科目篩選交易記錄並重新計算累積獎金
    
    // 1. 找到最近的歸零記錄（從所有交易中查找，不受篩選影響）
    const findLastResetTransaction = (transactionList: any[]) => {
      const sortedTransactions = [...transactionList].sort((a, b) => {
        const dateA = new Date(a.transaction_date || a.created_at).getTime()
        const dateB = new Date(b.transaction_date || b.created_at).getTime()
        return dateB - dateA
      })
      return sortedTransactions.find(t => t.transaction_type === 'reset')
    }

    // 從所有交易中找最近的歸零記錄
    const lastReset = findLastResetTransaction(transactions)
    const lastResetDate = lastReset 
      ? new Date(lastReset.transaction_date || lastReset.created_at)
      : null
    const resetDateOnly = lastResetDate 
      ? new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate()).getTime()
      : null
    
    // 設置 resetDate 供子組件使用
    setResetDate(lastResetDate)

    // 2. 根據歸零點選項過濾交易
    let filteredTransactions = transactions.filter(t => {
      // 排除歸零記錄本身
      if (t.transaction_type === 'reset') return false
      
      // 如果勾選了"從最後歸零點計算"，只計入歸零日期之後的交易
      if (calculateFromReset && resetDateOnly) {
        const tDate = new Date(t.transaction_date || t.created_at)
        const tDateOnly = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime()
        return tDateOnly > resetDateOnly
      }
      
      return true
    })

    // 3. 根據月份篩選
    if (selectedMonth) {
      filteredTransactions = filteredTransactions.filter(t => {
        if (!t.transaction_date) return false
        const date = new Date(t.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return monthKey === selectedMonth
      })
    }

    // 4. 計算該時間區段內的獎金存摺數據
    // 該時間區段內的獎金存摺歸零基準（在該時間區段內的 reset 記錄）
    const resetInPeriod = filteredTransactions.find(t => t.transaction_type === 'reset')
    const resetBaseInPeriod = resetInPeriod?.amount || 0
    
    // 5. 計算評量獎金（直接在這裡過濾評量，而不是依賴 state）
    // 先根據月份過濾
    let filteredAssessmentsForReward = assessments
    if (selectedMonth) {
      filteredAssessmentsForReward = assessments.filter(assessment => {
        if (!assessment.due_date) return false
        const date = new Date(assessment.due_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return monthKey === selectedMonth
      })
    }
    
    // 再根據歸零點過濾 - 優先使用 due_date（考試日期），而不是 completed_date（記錄日期）
    if (calculateFromReset && resetDateOnly) {
      filteredAssessmentsForReward = filteredAssessmentsForReward.filter(assessment => {
        if (!assessment.due_date && !assessment.completed_date) return true
        // 使用 due_date（考試日期）而非 completed_date（記錄日期）
        const assessmentDate = new Date(assessment.due_date || assessment.completed_date || assessment.created_at)
        const assessmentDateOnly = new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate()).getTime()
        return assessmentDateOnly > resetDateOnly
      })
    }
    
    // 計算所有科目的 reward_amount 總和（評量獎金）
    const assessmentReward = filteredAssessmentsForReward
      .filter(a => a.reward_amount && a.reward_amount > 0)
      .reduce((sum, a) => sum + (a.reward_amount || 0), 0) || 0
    
    // 6. 計算各評量類型的平均分數（根據選中的科目）
    let assessmentsForAverage = filteredAssessmentsForReward
    if (selectedSubject && selectedSubject !== '') {
      assessmentsForAverage = filteredAssessmentsForReward.filter(a => a.subject_id === selectedSubject)
    }
    
    const assessmentTypes = ['exam', 'quiz', 'homework', 'project'] as const
    const averageScores: { [key: string]: number } = {}
    let totalScoreSum = 0
    let totalCount = 0
    
    assessmentTypes.forEach(type => {
      const typeAssessments = assessmentsForAverage.filter(a => 
        a.assessment_type === type && a.score !== null && a.score !== undefined
      )
      if (typeAssessments.length > 0) {
        const sum = typeAssessments.reduce((s, a) => s + (a.score || 0), 0)
        const avg = sum / typeAssessments.length
        averageScores[type] = Math.round(avg * 10) / 10 // 保留一位小數
        totalScoreSum += sum
        totalCount += typeAssessments.length
      } else {
        averageScores[type] = 0
      }
    })
    
    // 計算總平均分數
    const totalAverage = totalCount > 0 ? Math.round((totalScoreSum / totalCount) * 10) / 10 : 0
    
    // 7. 計算獎金存摺非評量獎金部份的金額（沒有 assessment_id 的交易）
    const nonAssessmentTransactions = filteredTransactions.filter(t => !t.assessment_id)
    const nonAssessmentEarned = nonAssessmentTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0) || 0
    const nonAssessmentSpent = nonAssessmentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    const nonAssessmentBalance = nonAssessmentEarned - nonAssessmentSpent

    // 8. 計算評量相關的交易（只計算因評量給予的金額）
    const assessmentTransactions = filteredTransactions.filter(t => t.assessment_id)
    const assessmentEarned = assessmentTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
    const assessmentSpent = assessmentTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    
    const passbookTransactions = filteredTransactions.filter(t => !t.assessment_id)
    const passbookEarned = passbookTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
    const passbookSpent = passbookTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    
    const startingBalance = lastReset?.amount || 0
    
    // 設置獎金明細
    const newRewardBreakdown = {
      assessmentEarned,
      assessmentSpent,
      passbookEarned,
      passbookSpent,
      startingBalance,
      totalRewardAmount: assessmentReward,  // 評量獎金
      totalPassbookEarned: nonAssessmentEarned,  // 非評量收入
      totalPassbookSpent: nonAssessmentSpent,   // 非評量支出
      resetBaseInPeriod,
      nonAssessmentBalance,  // 非評量獎金部分的金額（收入-支出）
      averageScores: {
        exam: averageScores.exam || 0,
        quiz: averageScores.quiz || 0,
        homework: averageScores.homework || 0,
        project: averageScores.project || 0
      },
      totalAverage
    };
    setRewardBreakdown(newRewardBreakdown)

    // 5. 根據科目篩選（通過 assessment_id 關聯）
    let subjectFilteredTransactions = filteredTransactions
    if (selectedSubject && selectedSubject !== '') {
      // 找出該科目的所有評量 ID
      const subjectAssessmentIds = assessments
        .filter(a => a.subject_id === selectedSubject)
        .map(a => a.id)
      
      // 只保留與這些評量相關的交易記錄
      subjectFilteredTransactions = filteredTransactions.filter(t => {
        // 如果有 assessment_id，檢查是否屬於該科目
        if (t.assessment_id) {
          return subjectAssessmentIds.includes(t.assessment_id)
        }
        // 沒有 assessment_id 的記錄不計入科目篩選
        return false
      })
    }

    // 6. 計算統計數據
    const calculateFilteredStats = () => {
      // 只計算評量相關的交易（有 assessment_id 的交易）
      const assessmentFilteredTransactions = subjectFilteredTransactions.filter(t => t.assessment_id)
      const earned = assessmentFilteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
      const spent = assessmentFilteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

      // 如果是查看單科，不顯示起始金額（因為起始金額是總體的）
      // 單科只顯示該科目的收入和支出
      if (selectedSubject && selectedSubject !== '') {
        return {
          balance: earned - spent,
          total_earned: earned,
          total_spent: spent,
          total_subjects: summary?.total_subjects || 0,
          total_assessments: summary?.total_assessments || 0,
          completed_assessments: summary?.completed_assessments || 0
        }
      }

      // 全部科目時，加上歸零的起始金額
      return {
        balance: startingBalance + earned - spent,
        total_earned: earned,
        total_spent: spent,
        total_subjects: summary?.total_subjects || 0,
        total_assessments: summary?.total_assessments || 0,
        completed_assessments: summary?.completed_assessments || 0
      }
    }

    setFilteredSummary(calculateFilteredStats())
  }, [selectedMonth, selectedSubject, transactions, assessments, summary, calculateFromReset])

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

  return (
    <>
      {/* 月份選擇器 */}
      <div className="mb-6 no-print">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* 月份控制器 */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-bold text-gray-800 whitespace-nowrap">
              📅 {t('selectMonth')}
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
                title={t('previousMonth')}
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
                  {selectedMonth ? formatMonth(selectedMonth) : t('allMonths')}
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
                      {/* 全部月份選項 */}
                      <button
                        onClick={() => {
                          setSelectedMonth('')
                          setIsMonthPickerOpen(false)
                        }}
                        className={`w-full px-4 py-2 rounded-lg font-semibold transition-all mb-2 cursor-pointer ${
                          selectedMonth === ''
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t('allMonths')}
                      </button>

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
                          {t('scrollMoreMonths')} ↓
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
                title={t('nextMonth')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* 從最後歸零點計算選項（只在選擇全部月份時顯示） */}
            {!selectedMonth && (
              <div className="flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-4 py-2">
                <input
                  type="checkbox"
                  id="calculateFromReset"
                  checked={calculateFromReset}
                  onChange={(e) => setCalculateFromReset(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label 
                  htmlFor="calculateFromReset" 
                  className="text-sm font-semibold text-gray-700 cursor-pointer whitespace-nowrap"
                >
                  {locale === 'zh-TW' ? '從最後歸零點隔天計算' : 'Calculate from Day After Last Reset'}
                </label>
              </div>
            )}
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span>➕</span>
              <span>{t('addAssessment')}</span>
            </button>
            <Link
              href={`/student/${studentId}/print?${new URLSearchParams({
                ...(selectedMonth && { month: selectedMonth }),
                ...(selectedSubject && { subject: selectedSubject })
              }).toString()}`}
              target="_blank"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2"
            >
              🖨️ {t('printReport')}
            </Link>
          </div>
        </div>
      </div>

      {/* 科目標籤和評量列表 */}
      <SubjectTabs 
        subjects={subjects} 
        assessments={filteredAssessments} 
        studentId={studentId}
        summary={filteredSummary}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        resetDate={resetDate}
        rewardBreakdown={rewardBreakdown}
        onEditAssessment={handleOpenEditModal}
      />

      {/* 評量表單 Modal */}
      <AssessmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        studentId={studentId}
        subjects={subjects}
        rewardRules={rewardRules}
        assessment={editingAssessment}
        defaultAssessmentType={mostCommonType}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}
