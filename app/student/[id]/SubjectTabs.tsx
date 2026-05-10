'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import AssessmentRecordCard from './components/AssessmentRecordCard'
import StudentHomeNavButton from '@/app/components/StudentHomeNavButton'

/** 與下方評量卡片列表共用斷點，需與卡片 grid 同步 */
const ASSESSMENT_RECORDS_GRID =
  'grid grid-cols-1 min-[880px]:max-[1023px]:grid-cols-2 min-[1192px]:grid-cols-2 gap-6'

interface Subject {
  id: string
  name: string
  color: string
  icon: string
  grade_mapping?: any
}

interface Assessment {
  id: string
  subject_id: string
  title: string
  status: string
  score: number | null
  max_score: number
  percentage: number | null
  reward_amount: number
  due_date: string | null
  assessment_type?: string
  grade?: string | null
  score_type?: string | null
  description?: string | null
  subjects?: {
    name: string
    color: string
    icon: string
    grade_mapping?: any
  }
}

interface Summary {
  balance: number
  total_earned: number
  total_spent: number
  total_subjects: number
  total_assessments: number
  completed_assessments: number
}

interface RewardBreakdown {
  assessmentEarned: number
  assessmentSpent: number
  passbookEarned: number
  passbookSpent: number
  startingBalance: number
  totalRewardAmount?: number      // 評量獎金（從評量記錄計算）
  totalPassbookEarned?: number    // 非評量收入
  totalPassbookSpent?: number     // 非評量支出
  resetBaseInPeriod?: number      // 該時間區段內的獎金存摺歸零基準
  nonAssessmentBalance?: number,  // 獎金存摺非評量獎金部份的金額（收入-支出）
  averageScores?: {               // 各評量類型平均分數
    exam: number
    quiz: number
    homework: number
    project: number
  },
  totalAverage?: number           // 總平均分數
}

interface Props {
  subjects: Subject[]
  assessments: Assessment[]
  studentId: string
  studentName?: string
  summary: Summary | null
  selectedSubject: string
  setSelectedSubject: (subject: string) => void
  resetDate: Date | null
  rewardBreakdown: RewardBreakdown
  onEditAssessment?: (assessment: Assessment) => void
  onOpenAddModal?: () => void
  selectedMonth?: string
  setSelectedMonth?: (month: string) => void
  availableMonths?: string[]
  currentMonth?: string
  calculateFromReset?: boolean
  setCalculateFromReset?: (value: boolean) => void
  isMonthPickerOpen?: boolean
  setIsMonthPickerOpen?: (value: boolean) => void
  formatMonth?: (monthKey: string) => string
  goToPreviousMonth?: () => void
  goToNextMonth?: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
}

export default function SubjectTabs({ 
  subjects, 
  assessments, 
  studentId, 
  studentName,
  summary, 
  selectedSubject, 
  setSelectedSubject, 
  resetDate, 
  rewardBreakdown, 
  onEditAssessment,
  onOpenAddModal,
  selectedMonth,
  setSelectedMonth,
  availableMonths = [],
  currentMonth = '',
  calculateFromReset = false,
  setCalculateFromReset,
  isMonthPickerOpen = false,
  setIsMonthPickerOpen,
  formatMonth,
  goToPreviousMonth,
  goToNextMonth,
  canGoPrevious = false,
  canGoNext = false
}: Props) {
  const t = useTranslations('student')
  const tAssessment = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const tSubject = useTranslations('subject')
  const locale = useLocale()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | null>(25)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(selectedSubject ? [selectedSubject] : [])
  const [selectedAssessmentTypes, setSelectedAssessmentTypes] = useState<string[]>([])
  const subjectButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const monthButtonRef = useRef<HTMLButtonElement | null>(null)
  const subjectFilterContainerRef = useRef<HTMLDivElement | null>(null)
  const [shouldEnableSubjectScroll, setShouldEnableSubjectScroll] = useState(false)
  const [isSingleColumnLayout, setIsSingleColumnLayout] = useState(false)

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
  }, [assessments])

  const assessmentTypes = ['exam', 'quiz', 'homework', 'project'] as const
  // 與評量表單 / 卡片一致（AssessmentForm、AssessmentRecordCard）
  const assessmentTypeMeta: Record<(typeof assessmentTypes)[number], { icon: string; color: string }> = {
    exam: { icon: 'assignment', color: '#dc2626' },
    quiz: { icon: 'checklist_rtl', color: '#2563eb' },
    homework: { icon: 'edit_note', color: '#16a34a' },
    project: { icon: 'palette', color: '#9333ea' }
  }

  // 過濾評量（科目多選 + 類型多選）
  const filteredBySubject = selectedSubjectIds.length > 0
    ? assessments.filter(a => selectedSubjectIds.includes(a.subject_id))
    : assessments
  const filteredAssessments = selectedAssessmentTypes.length > 0
    ? filteredBySubject.filter(a => selectedAssessmentTypes.includes(a.assessment_type || 'exam'))
    : filteredBySubject
  const subjectFilterCount = Math.max(subjects?.length || 0, 1)
  const subjectFilterMinItemWidth = isSingleColumnLayout
    ? 46
    : (subjectFilterCount <= 5 ? 73 : 78)

  const getCompactFilterLabel = (label: string) => {
    const trimmed = (label || '').trim()
    if (!trimmed) return ''
    const firstChar = Array.from(trimmed)[0] || ''
    return /^[A-Za-z]$/.test(firstChar) ? firstChar.toUpperCase() : firstChar
  }

  const isEmojiIcon = (icon: string) => {
    if (!icon) return false
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) ||
      icon.length <= 2 ||
      !/^[a-z_]+$/i.test(icon)
  }

  useEffect(() => {
    const updateLayoutMode = () => {
      const width = window.innerWidth
      // 僅在「卡片 1 欄 + 快速選單上置」的窄版（<880）才啟用精簡 filter 樣式
      const isSingleColumn = width < 880
      setIsSingleColumnLayout(isSingleColumn)
    }

    updateLayoutMode()
    window.addEventListener('resize', updateLayoutMode)
    return () => {
      window.removeEventListener('resize', updateLayoutMode)
    }
  }, [])

  useEffect(() => {
    const container = subjectFilterContainerRef.current
    if (!container) return

    const updateSubjectFilterLayout = () => {
      const gapWidth = 4
      const computedStyle = window.getComputedStyle(container)
      const horizontalPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight)
      const availableWidth = container.clientWidth - horizontalPadding
      const totalGapWidth = (subjectFilterCount - 1) * gapWidth
      const averageItemWidth = (availableWidth - totalGapWidth) / subjectFilterCount
      // 預留 1px 容差，避免次像素計算造成臨界值誤判
      setShouldEnableSubjectScroll((subjectFilterMinItemWidth - averageItemWidth) > 1)
    }

    updateSubjectFilterLayout()

    const resizeObserver = new ResizeObserver(() => {
      updateSubjectFilterLayout()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [subjectFilterCount, subjectFilterMinItemWidth])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSubjectIds, selectedAssessmentTypes, selectedMonth])

  // 分頁邏輯（支援「不限」）
  const isUnlimited = itemsPerPage === null
  const totalPages = isUnlimited ? 1 : Math.ceil(filteredAssessments.length / itemsPerPage)
  const paginatedAssessments = isUnlimited
    ? filteredAssessments
    : filteredAssessments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
  const showPagination = !isUnlimited && filteredAssessments.length > itemsPerPage

  // 獲取選中的科目資訊
  const selectedSubjectInfo = selectedSubject && selectedSubject !== ''
    ? subjects.find(s => s.id === selectedSubject)
    : null


  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col min-[360px]:flex-row min-[360px]:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 material-icons-outlined text-3xl drop-shadow-sm flex-shrink-0">assessment</span>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tight">{t('recordsTitle')}</h1>
              {studentName && (
                <p className="text-sm text-slate-500">
                  {locale === 'zh-TW' 
                    ? `記錄${studentName}的評量與作業表現`
                    : `Tracking ${studentName}'s assessments and homework performance`
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* 添加評量按鈕 */}
            {onOpenAddModal && (
              <button 
                onClick={onOpenAddModal}
                className="student-toolbar-primary px-6 py-2.5 min-h-11 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-icons-outlined text-lg">add_circle</span>
                {t('addAssessment')}
              </button>
            )}
            
            {/* 返回首頁 - lg 以下改由側邊欄學生名稱列顯示 */}
            <StudentHomeNavButton className="hidden lg:inline-flex" />
          </div>
        </div>
        
        {/* 科目與月份過濾器 */}
        <div className="flex flex-col gap-2">
          {/* 科目過濾器（與列表同寬） */}
          <div
            ref={subjectFilterContainerRef}
            className={`w-full mt-[2px] min-w-0 bg-white/60 backdrop-blur-sm px-2 py-[3px] border border-white/40 shadow-sm overflow-y-hidden rounded-[26px] ${
              shouldEnableSubjectScroll ? 'overflow-x-auto' : 'overflow-x-hidden'
            }`}
            style={{ paddingBottom: shouldEnableSubjectScroll ? '6px' : undefined }}
          >
              <div
                className="min-w-full grid items-center gap-1 py-0.5"
                style={{
                  gridTemplateColumns: shouldEnableSubjectScroll
                    ? `repeat(${subjectFilterCount}, minmax(${subjectFilterMinItemWidth}px, 1fr))`
                    : `repeat(${subjectFilterCount}, minmax(0, 1fr))`,
                  minWidth: shouldEnableSubjectScroll
                    ? `${(subjectFilterCount * subjectFilterMinItemWidth) + ((subjectFilterCount - 1) * 4)}px`
                    : '100%'
                }}
              >
                {subjects && subjects.length > 0 && subjects.map(subject => {
                  const isSelected = selectedSubjectIds.includes(subject.id)
                  return (
                    <button
                      key={subject.id}
                      ref={(el) => { subjectButtonRefs.current[subject.id] = el }}
                      onClick={() => {
                      // 桌面樣式使用 hover 動態邊框，切換時先清除避免殘留
                      if (!isSingleColumnLayout) {
                        Object.values(subjectButtonRefs.current).forEach(btn => {
                          if (btn) {
                            btn.style.borderColor = 'transparent'
                            btn.style.backgroundColor = ''
                          }
                        })
                      }
                        const nextSelectedSubjectIds = isSelected
                          ? selectedSubjectIds.filter((id) => id !== subject.id)
                          : [...selectedSubjectIds, subject.id]
                        setSelectedSubjectIds(nextSelectedSubjectIds)
                        // 與父層相容：僅在「剛好單選一個科目」時同步回傳該科目，其餘情況回傳空字串
                        setSelectedSubject(nextSelectedSubjectIds.length === 1 ? nextSelectedSubjectIds[0] : '')
                      }}
                      className={`transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        isSingleColumnLayout
                        ? 'mx-auto h-[38px] w-[38px] rounded-full px-0 py-0 text-base font-bold'
                          : 'w-full min-h-[34px] px-4 py-1.5 rounded-full text-base gap-2'
                      } ${
                        isSelected
                        ? (isSingleColumnLayout ? '' : 'bg-white shadow-sm')
                        : (isSingleColumnLayout ? '' : 'font-medium text-slate-500')
                      }`}
                      style={isSingleColumnLayout ? {
                      color: isSelected ? '#ffffff' : subject.color,
                      backgroundColor: isSelected ? `${subject.color}dd` : `${subject.color}22`,
                      boxShadow: isSelected ? `0 2px 6px ${subject.color}85` : 'none'
                      } : (isSelected ? {
                        border: '2px solid transparent'
                      } : {
                        border: '1px solid transparent'
                      })}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isSingleColumnLayout) {
                          e.currentTarget.style.borderColor = subject.color
                          e.currentTarget.style.backgroundColor = `${subject.color}15`
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isSingleColumnLayout) {
                          e.currentTarget.style.borderColor = 'transparent'
                          e.currentTarget.style.backgroundColor = ''
                        }
                      }}
                    >
                      {isSingleColumnLayout ? (
                        <span>{getCompactFilterLabel(subject.name)}</span>
                      ) : (
                        <>
                          {isEmojiIcon(subject.icon) ? (
                            <span className="text-base leading-none flex-shrink-0">{subject.icon}</span>
                          ) : (
                            <span
                              className="material-icons-outlined text-[18px] leading-none flex-shrink-0"
                              style={{ color: subject.color }}
                              aria-hidden="true"
                            >
                              {subject.icon}
                            </span>
                          )}
                          <span className="truncate">{subject.name}</span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
          </div>

          {/* 評量類型 + 月份：grid 斷點與下方評量卡片網格一致 */}
          <div
            className={`${ASSESSMENT_RECORDS_GRID} w-full min-w-0 items-start mt-2 min-[1192px]:flex min-[1192px]:justify-between min-[1192px]:items-start`}
          >
            <div className="min-w-0 w-fit max-w-full justify-self-start mt-[5px] max-[879px]:w-full max-[879px]:max-w-none min-[1024px]:max-[1191px]:w-full min-[1024px]:max-[1191px]:max-w-none">
              <div className="grid grid-cols-4 items-center gap-1 bg-white/60 backdrop-blur-sm px-1 py-[5.5px] rounded-full border border-white/40 shadow-sm w-fit max-w-full max-[879px]:w-full max-[879px]:min-w-0 min-[1024px]:max-[1191px]:w-full min-[1024px]:max-[1191px]:min-w-0 min-w-0 overflow-x-auto">
                  {assessmentTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-label={tAssessment(`types.${type}`)}
                      title={tAssessment(`types.${type}`)}
                      onClick={() => {
                        const isSelected = selectedAssessmentTypes.includes(type)
                        const nextSelectedAssessmentTypes = isSelected
                          ? selectedAssessmentTypes.filter((item) => item !== type)
                          : [...selectedAssessmentTypes, type]
                        setSelectedAssessmentTypes(nextSelectedAssessmentTypes)
                      }}
                      className={`w-full transition-all duration-200 flex items-center justify-center cursor-pointer min-h-[34px] px-4 py-1.5 rounded-full text-base gap-2 ${
                        selectedAssessmentTypes.includes(type)
                          ? 'bg-white shadow-sm font-bold text-slate-800'
                          : 'font-medium text-slate-500 hover:bg-white/50'
                      }`}
                      style={selectedAssessmentTypes.includes(type)
                        ? { border: '2px solid transparent' }
                        : { border: '1px solid transparent' }}
                      onMouseEnter={(e) => {
                        if (!selectedAssessmentTypes.includes(type)) {
                          e.currentTarget.style.borderColor = assessmentTypeMeta[type].color
                          e.currentTarget.style.backgroundColor = `${assessmentTypeMeta[type].color}15`
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedAssessmentTypes.includes(type)) {
                          e.currentTarget.style.borderColor = 'transparent'
                          e.currentTarget.style.backgroundColor = ''
                        }
                      }}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <span
                          className="material-icons-outlined text-[18px] leading-none"
                          style={{ color: assessmentTypeMeta[type].color }}
                          aria-hidden="true"
                        >
                          {assessmentTypeMeta[type].icon}
                        </span>
                        <span className="whitespace-nowrap max-[879px]:inline min-[880px]:max-[1023px]:hidden min-[1024px]:max-[1191px]:inline min-[1192px]:inline">
                          {tAssessment(`types.${type}`)}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            <div
              className="min-w-0 w-full mt-[3px] flex items-center gap-3 min-[880px]:max-[1023px]:justify-end min-[1192px]:justify-end min-[1192px]:w-auto min-[1192px]:shrink-0"
            >
              <span className="material-icons-outlined text-[18px] text-slate-400 leading-none shrink-0" aria-hidden="true">calendar_month</span>
              <div
                className="relative min-w-0 min-[880px]:max-[1023px]:w-auto min-[880px]:max-[1023px]:shrink-0 min-[1192px]:w-auto min-[1192px]:shrink-0 max-[879px]:flex-1 min-[1024px]:max-[1191px]:flex-1 w-full"
              >
                <div className="flex items-center bg-white/60 backdrop-blur-sm p-1.5 rounded-full border border-white/40 shadow-sm w-full min-w-0">
                  <div className="flex items-center justify-between bg-white px-4 py-1 rounded-full border border-slate-100 gap-6 w-full min-w-0">
                    <button
                      onClick={goToPreviousMonth}
                      disabled={!canGoPrevious}
                      className="material-icons-outlined text-slate-400 cursor-pointer text-lg hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      chevron_left
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsMonthPickerOpen && setIsMonthPickerOpen(!isMonthPickerOpen)
                      }}
                    ref={monthButtonRef}
                  className="font-bold text-sm min-w-[6rem] text-center cursor-pointer text-slate-800 hover:text-primary transition-colors whitespace-nowrap"
                    >
                      {selectedMonth ? (formatMonth ? formatMonth(selectedMonth) : selectedMonth) : (calculateFromReset ? t('recentSettlement') : t('all'))}
                    </button>
                    <button
                      onClick={goToNextMonth}
                      disabled={!canGoNext}
                      className="material-icons-outlined text-slate-400 cursor-pointer text-lg hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      chevron_right
                    </button>
                  </div>
                </div>

                {/* Month picker dropdown */}
                {isMonthPickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10 cursor-pointer"
                      onClick={() => setIsMonthPickerOpen && setIsMonthPickerOpen(false)}
                    />
                    <div
                      className={`absolute top-full right-0 mt-2 z-20 bg-white/95 backdrop-blur-xl rounded-xl border border-slate-200 shadow-2xl p-4 min-w-[280px] transition-all duration-300 ease-in-out ${
                        isMonthPickerOpen 
                          ? 'opacity-100 translate-y-0 pointer-events-auto' 
                          : 'opacity-0 -translate-y-2 pointer-events-none'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {/* All button */}
                        <button
                          onClick={() => {
                            setSelectedMonth && setSelectedMonth('')
                            setCalculateFromReset && setCalculateFromReset(false)
                            setIsMonthPickerOpen && setIsMonthPickerOpen(false)
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                            selectedMonth === '' && !calculateFromReset
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {t('all')}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMonth && setSelectedMonth('')
                            setCalculateFromReset && setCalculateFromReset(true)
                            setIsMonthPickerOpen && setIsMonthPickerOpen(false)
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                            calculateFromReset && !selectedMonth
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {t('recentSettlement')}
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
                                  setSelectedMonth && setSelectedMonth(month)
                                  setIsMonthPickerOpen && setIsMonthPickerOpen(false)
                                }}
                                className={`px-3 py-2 rounded-lg font-semibold transition-all flex flex-col items-center h-[85px] cursor-pointer ${
                                  selectedMonth === month
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-blue-50 text-gray-700'
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Records */}
      {filteredAssessments && filteredAssessments.length > 0 ? (
        <>
        <div className={ASSESSMENT_RECORDS_GRID}>
          {paginatedAssessments.map((assessment) => {
            return (
              <AssessmentRecordCard
                key={assessment.id}
                record={{
                  id: assessment.id,
                  subject_id: assessment.subject_id,
                  title: assessment.title,
                  score: assessment.score,
                  due_date: assessment.due_date,
                  reward_amount: assessment.reward_amount,
                  assessment_type: assessment.assessment_type,
                  grade: assessment.grade,
                  score_type: assessment.score_type,
                  subjects: assessment.subjects,
                  description: assessment.description || assessment.title
                }}
                onClick={() => onEditAssessment && onEditAssessment(assessment)}
              />
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
        </>
      ) : (
        <div className="col-span-full py-20 text-center bg-white rounded-4xl border-2 border-dashed border-slate-200">
          <span className="material-icons-outlined text-6xl text-slate-200 mb-4">folder_off</span>
          <p className="text-slate-400 font-medium">
            {(selectedSubjectIds.length > 0 || selectedAssessmentTypes.length > 0)
              ? t('noRecordsForSubject')
              : t('noAssessmentRecords')}
          </p>
        </div>
      )}
    </>
  )
}

