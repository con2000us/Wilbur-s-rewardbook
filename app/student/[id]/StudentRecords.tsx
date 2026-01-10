'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import SubjectTabs from './SubjectTabs'
import AssessmentModal from './components/AssessmentModal'
import SidebarContent from './SidebarContent'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import StudentSidebarHeader from './components/StudentSidebarHeader'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface Props {
  studentId: string
  studentName: string
  studentAvatar: any
  allStudents: any[]
  subjects: any[]
  assessments: any[]
  transactions: any[]
  summary: any
  rewardRules: any[]
}

export default function StudentRecords({ 
  studentId, 
  studentName,
  studentAvatar,
  allStudents,
  subjects, 
  assessments, 
  transactions, 
  summary, 
  rewardRules
}: Props) {
  const t = useTranslations('student')
  const tAssessment = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  
  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<any>(null)
  const [mostCommonType, setMostCommonType] = useState<string>('exam')
  
  // 預設為當前月份（會在 useEffect 中根據最近結算調整）
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [lastSelectedSubject, setLastSelectedSubject] = useState<string>('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState(assessments)
  const [filteredSummary, setFilteredSummary] = useState(summary)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [resetDate, setResetDate] = useState<Date | null>(null)
  const [calculateFromReset, setCalculateFromReset] = useState<boolean>(false)
  const isInitialized = useRef(false)
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
    
    // 只在第一次初始化時設定預設月份（根據最近結算）
    if (!isInitialized.current && sortedMonths.length > 0) {
      // 找到最近的結算記錄
      const findLastResetTransaction = (transactionList: any[]) => {
        const sortedTransactions = [...transactionList].sort((a, b) => {
          const dateA = new Date(a.transaction_date || a.created_at).getTime()
          const dateB = new Date(b.transaction_date || b.created_at).getTime()
          return dateB - dateA
        })
        return sortedTransactions.find(t => t.transaction_type === 'reset')
      }
      
      const lastReset = findLastResetTransaction(transactions)
      let defaultMonth = ''
      
      if (lastReset) {
        const lastResetDate = new Date(lastReset.transaction_date || lastReset.created_at)
        const resetMonth = `${lastResetDate.getFullYear()}-${String(lastResetDate.getMonth() + 1).padStart(2, '0')}`
        
        // 如果結算月份在可用月份中，使用結算月份
        if (sortedMonths.includes(resetMonth)) {
          defaultMonth = resetMonth
        } else {
          // 結算月份不在可用月份中，選擇全部月份
          defaultMonth = ''
        }
      } else {
        // 沒有結算記錄，選擇全部月份
        defaultMonth = ''
      }
      
      setSelectedMonth(defaultMonth)
      isInitialized.current = true
    }
    
    // 重要：資料更新（例如新增/編輯評量後 router.refresh）時，保留使用者原本選擇的月份
    // - selectedMonth === '' 代表「全部」或「最近結算」，不應被自動改寫
    // - 只有當目前選擇的月份已不存在（例如編輯後月份被移除）才自動切到合理的預設
    if (isInitialized.current && selectedMonth && sortedMonths.length > 0) {
      const hasSelectedMonth = sortedMonths.includes(selectedMonth)
      if (!hasSelectedMonth) {
        const hasCurrentMonth = sortedMonths.includes(currentMonth)
        setSelectedMonth(hasCurrentMonth ? currentMonth : sortedMonths[0])
      }
    }

    // 計算最常用的評量類型
    const typeCounts: { [key: string]: number } = {}
    assessments.forEach(assessment => {
      const type = assessment.assessment_type || 'exam'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
    setMostCommonType(mostCommon ? mostCommon[0] : 'exam')
  }, [assessments, currentMonth, selectedMonth, transactions])

  // 記住使用者「最後一次選擇的具體科目」
  // 目的：當目前 focused tab 是「全部」時，新增評量 popup 仍可預選上次的科目
  useEffect(() => {
    if (selectedSubject) {
      setLastSelectedSubject(selectedSubject)
    }
  }, [selectedSubject])

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
      {/* 側邊欄 */}
      <div className="relative z-20 lg:w-[360px] lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8 p-4 lg:p-0 rounded-2xl lg:rounded-none lg:min-w-0">
        <header className="flex flex-col lg:items-start lg:sticky lg:top-0 w-full lg:min-w-0">
          {/* Student Sidebar Header - 包含學生頭像和快速導覽 */}
          <StudentSidebarHeader
            studentId={studentId}
            studentName={studentName}
            studentAvatar={studentAvatar}
            recordsTitle={t('recordsTitle')}
            allStudents={allStudents}
            basePath=""
            currentPage="records"
            showHeader={true}
          />

          {/* 側邊欄內容（統計卡片等） */}
          <div className="mt-3 w-full">
            <SidebarContent
            studentId={studentId}
            studentName={studentName}
            subjects={subjects}
            assessments={assessments}
            transactions={transactions}
            summary={filteredSummary}
            rewardBreakdown={rewardBreakdown}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            availableMonths={availableMonths}
            currentMonth={currentMonth}
            calculateFromReset={calculateFromReset}
            setCalculateFromReset={setCalculateFromReset}
            isMonthPickerOpen={isMonthPickerOpen}
            setIsMonthPickerOpen={setIsMonthPickerOpen}
            formatMonth={formatMonth}
            goToPreviousMonth={goToPreviousMonth}
            goToNextMonth={goToNextMonth}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            filteredAssessments={filteredAssessments}
            onOpenAddModal={handleOpenAddModal}
            studentAvatar={studentAvatar}
          />
          </div>
        </header>
      </div>

      {/* 主內容區 */}
      <main className="relative z-10 flex-1">
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
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          availableMonths={availableMonths}
          currentMonth={currentMonth}
          calculateFromReset={calculateFromReset}
          setCalculateFromReset={setCalculateFromReset}
          isMonthPickerOpen={isMonthPickerOpen}
          setIsMonthPickerOpen={setIsMonthPickerOpen}
          formatMonth={formatMonth}
          goToPreviousMonth={goToPreviousMonth}
          goToNextMonth={goToNextMonth}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />
      </main>

      {/* 評量表單 Modal */}
      <AssessmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        studentId={studentId}
        subjects={subjects}
        rewardRules={rewardRules}
        assessment={editingAssessment}
        initialSubjectId={selectedSubject || lastSelectedSubject || subjects?.[0]?.id || ''}
        defaultAssessmentType={mostCommonType}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}
