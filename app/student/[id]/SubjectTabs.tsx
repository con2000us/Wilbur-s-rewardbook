'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import AssessmentRecordCard from './components/AssessmentRecordCard'

/** 與下方評量卡片列表共用斷點，需與卡片 grid 同步 */
const ASSESSMENT_RECORDS_GRID =
  'grid grid-cols-1 min-[880px]:max-[1023px]:grid-cols-2 min-[1192px]:grid-cols-2 gap-6'

const NARROW_FILTER_SCROLLER =
  'flex gap-2 overflow-x-auto pb-2 pr-4 -mx-1 px-1 [scrollbar-width:thin] [scrollbar-color:rgba(26,90,189,0.15)_transparent] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(26,90,189,0.15)]'

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
  scoring_mode?: string | null
  counts_toward_average?: boolean | null
  counts_toward_reward?: boolean | null
  description?: string | null
  image_urls?: Array<{ url: string; path: string; size: number; width?: number; height?: number }> | null
  mistakes?: Array<{
    id?: string
    question_number: string | null
    mistake_type: string | null
    knowledge_point: string | null
    student_answer?: string | null
    correct_answer?: string | null
    ai_reason?: string | null
  }> | null
  notes?: string | null
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
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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

  // 窄版 header 統計：本月平均、評量數、圖片數
  const totalImageCount = useMemo(
    () => filteredAssessments.reduce((sum, a) => sum + (a.image_urls?.length || 0), 0),
    [filteredAssessments]
  )
  const monthAverage = useMemo(() => {
    const overall = rewardBreakdown?.totalAverage
    if (typeof overall === 'number' && overall > 0) return Math.round(overall * 10) / 10
    const scored = filteredAssessments.filter(a => typeof a.percentage === 'number' && a.percentage !== null) as Array<Assessment & { percentage: number }>
    if (scored.length === 0) return 0
    const sum = scored.reduce((acc, a) => acc + a.percentage, 0)
    return Math.round((sum / scored.length) * 10) / 10
  }, [filteredAssessments, rewardBreakdown])

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
      {/* === NARROW (<lg) header - 扁平排版（不再用外框卡片） === */}
      <div className="lg:hidden mb-3 space-y-3">
        {/* Row 1: 標題 + 列印 / 新增 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-icons-outlined rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 p-2 text-2xl text-blue-600 shadow-sm flex-shrink-0" aria-hidden="true">
              assessment
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 truncate">{t('recordsTitle')}</h1>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/student/${studentId}/print`}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-white"
            >
              <span className="material-icons-outlined text-base">print</span>
              {tCommon('print')}
            </Link>
            {onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <span className="material-icons-outlined text-base">add_circle</span>
                {locale === 'zh-TW' ? '新增' : 'Add'}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: 描述 + 篩選 toggle */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-6 text-slate-600 min-w-0">
            {studentName && (locale === 'zh-TW'
              ? `記錄${studentName}的考試、小考、作業與歸檔圖片。`
              : `Records of ${studentName}'s exams, quizzes, homework and archived images.`)}
          </p>
          <button
            type="button"
            onClick={() => setIsFilterOpen(v => !v)}
            aria-expanded={isFilterOpen}
            className="inline-flex min-h-9 flex-shrink-0 items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-primary/10"
          >
            <span className="material-icons-outlined text-lg">{isFilterOpen ? 'filter_alt_off' : 'filter_list'}</span>
            {locale === 'zh-TW' ? '篩選' : 'Filter'}
          </button>
        </div>

        {/* Row 3: 三格統計卡 */}
      </div>

      {/* === NARROW 篩選面板：按下「篩選」才展開（demo FilterPanel 風格，日期獨自一行） === */}
      {isFilterOpen && (
        <div className="lg:hidden mb-4 space-y-2">
          {/* 科目 pills（橫向捲動） */}
          <div className={NARROW_FILTER_SCROLLER}>
            {subjects && subjects.map(subject => {
              const isSelected = selectedSubjectIds.includes(subject.id)
              return (
                <div
                  key={`narrow-sub-${subject.id}`}
                  className="min-w-[88px] flex-1 flex justify-start"
                >
                <button
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? selectedSubjectIds.filter(id => id !== subject.id)
                      : [...selectedSubjectIds, subject.id]
                    setSelectedSubjectIds(next)
                    setSelectedSubject(next.length === 1 ? next[0] : '')
                  }}
                  className={`inline-flex w-auto max-w-full min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-white/60 bg-white/70'
                      : 'border-white/60 bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                  style={isSelected ? {
                    borderColor: subject.color,
                    color: subject.color,
                    boxShadow: `0 0 0 1px ${subject.color}33, 0 6px 14px ${subject.color}22`
                  } : undefined}
                >
                  {isEmojiIcon(subject.icon) ? (
                    <span className="text-base leading-none">{subject.icon}</span>
                  ) : (
                    <span className="material-icons-outlined text-lg leading-none" style={{ color: subject.color }} aria-hidden="true">
                      {subject.icon}
                    </span>
                  )}
                  {subject.name}
                </button>
                </div>
              )
            })}
          </div>

          {/* 評量類型 pills（橫向捲動） */}
          <div className={NARROW_FILTER_SCROLLER}>
            {assessmentTypes.map((type) => {
              const isSelected = selectedAssessmentTypes.includes(type)
              const meta = assessmentTypeMeta[type]
              return (
                <div
                  key={`narrow-type-${type}`}
                  className="min-w-[84px] flex-1 flex justify-start"
                >
                <button
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? selectedAssessmentTypes.filter(item => item !== type)
                      : [...selectedAssessmentTypes, type]
                    setSelectedAssessmentTypes(next)
                  }}
                  className={`inline-flex w-auto max-w-full min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-bold border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-white/60 bg-white/60'
                      : 'border-white/60 bg-white/60 hover:bg-white'
                  }`}
                  style={isSelected ? {
                    borderColor: meta.color,
                    color: meta.color,
                    boxShadow: `0 0 0 1px ${meta.color}33, 0 6px 14px ${meta.color}22`
                  } : { color: meta.color }}
                >
                  <span className="material-icons-outlined text-base leading-none" style={{ color: meta.color }} aria-hidden="true">
                    {meta.icon}
                  </span>
                  {tAssessment(`types.${type}`)}
                </button>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* narrow 資訊卡列（橫向捲動）；月份 picker 展開在整列下方置中 */}
      <div className="lg:hidden mb-4 relative">
        <div className="-mx-1 px-1 pb-[10px] overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgba(26,90,189,0.15)_transparent] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(26,90,189,0.15)]">
          <div className="flex w-full min-w-full gap-2">
            <div className="flex-1 min-w-0 basis-0 rounded-2xl border border-white/70 bg-white/85 px-3 py-2.5 text-center shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 leading-tight">{locale === 'zh-TW' ? '本月平均' : 'Avg'}</p>
              <p className="mt-1 text-4xl font-black leading-none text-sky-700">{monthAverage.toFixed(1)}</p>
            </div>
            <div className="flex-1 min-w-0 basis-0 rounded-2xl border border-white/70 bg-white/85 px-3 py-2.5 text-center shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 leading-tight">{locale === 'zh-TW' ? '評量數' : 'Count'}</p>
              <p className="mt-1 text-4xl font-black leading-none text-sky-700">{filteredAssessments.length}</p>
            </div>
            <div className="flex-1 min-w-0 basis-0 rounded-2xl border border-white/70 bg-white/85 px-3 py-2.5 text-center shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 leading-tight">{locale === 'zh-TW' ? '日期範圍' : 'Date range'}</p>
              <div
                className={`mt-1.5 rounded-xl border px-1.5 py-1 shadow-sm transition-all duration-300 ease-out ${
                  isMonthPickerOpen
                    ? 'border-primary/30 bg-white ring-2 ring-primary/15'
                    : 'border-white/80 bg-white/85'
                }`}
              >
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    disabled={!canGoPrevious}
                    className="material-icons-outlined text-slate-400 cursor-pointer text-[18px] hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    chevron_left
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsMonthPickerOpen && setIsMonthPickerOpen(!isMonthPickerOpen)
                    }}
                    className="min-w-0 flex-1 truncate text-center text-xs font-bold cursor-pointer text-slate-800 hover:text-primary transition-colors whitespace-nowrap px-0.5"
                  >
                    {selectedMonth ? (formatMonth ? formatMonth(selectedMonth) : selectedMonth) : (calculateFromReset ? t('recentSettlement') : t('all'))}
                  </button>
                  <button
                    type="button"
                    onClick={goToNextMonth}
                    disabled={!canGoNext}
                    className="material-icons-outlined text-slate-400 cursor-pointer text-[18px] hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    chevron_right
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 月份下拉（narrow 版）：整列下方、螢幕中間，展開/收合動畫 */}
        <div
          className={`fixed inset-0 z-10 cursor-pointer transition-opacity duration-300 ease-out ${
            isMonthPickerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMonthPickerOpen && setIsMonthPickerOpen(false)}
          aria-hidden={!isMonthPickerOpen}
        />
        <div
          className={`relative z-20 grid transition-[grid-template-rows,margin-top] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isMonthPickerOpen ? 'mt-2 grid-rows-[1fr]' : 'mt-0 grid-rows-[0fr] pointer-events-none'
          }`}
        >
          <div className={`min-h-0 overflow-hidden ${isMonthPickerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className="flex justify-center px-4 pb-1">
              <div
                className={`w-full max-w-[320px] origin-top bg-white/95 backdrop-blur-xl rounded-xl border border-slate-200 shadow-2xl p-4 transition-all duration-300 ease-out ${
                  isMonthPickerOpen
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 scale-[0.98] pointer-events-none'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
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
                    type="button"
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
                {availableMonths && availableMonths.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-2 border border-gray-200 rounded-lg p-2 max-h-[240px]">
                    {availableMonths.map(month => {
                      const [year, monthNum] = month.split('-')
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                      return (
                        <button
                          key={`narrow-month-${month}`}
                          type="button"
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
            </div>
          </div>
        </div>
      </div>

        <div className="hidden lg:flex flex-col min-[360px]:flex-row min-[360px]:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="material-icons-outlined rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 p-2 text-3xl text-blue-600 shadow-sm flex-shrink-0" aria-hidden="true">
              assessment
            </span>
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
            <Link
              href={`/student/${studentId}/print`}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-full border border-white/70 bg-white/80 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-white cursor-pointer"
            >
              <span className="material-icons-outlined text-lg">print</span>
              {tCommon('print')}
            </Link>

            {onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="px-6 py-2.5 min-h-11 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md hover:shadow-lg"
              >
                <span className="material-icons-outlined text-lg">add_circle</span>
                {t('addAssessment')}
              </button>
            )}

            {/* 返回首頁 - lg 以下改由側邊欄學生名稱列顯示 */}
          </div>
        </div>

      {/* === WIDE (lg+) 過濾器：永遠展開，narrow 版改用上面的篩選面板 === */}
      <div className="hidden lg:flex flex-col gap-2 mb-6">
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
                    <div
                      key={subject.id}
                      className={isSingleColumnLayout ? 'flex justify-center' : 'min-w-[92px] flex justify-center'}
                    >
                    <button
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
                          : 'inline-flex w-auto max-w-full min-h-[34px] px-4 py-1.5 rounded-full text-base gap-2'
                      } ${
                        isSelected
                        ? (isSingleColumnLayout ? '' : 'shadow-sm')
                        : (isSingleColumnLayout ? '' : 'font-medium text-slate-500')
                      }`}
                      style={isSingleColumnLayout ? {
                      color: isSelected ? '#ffffff' : subject.color,
                      backgroundColor: isSelected ? `${subject.color}dd` : `${subject.color}22`,
                      boxShadow: isSelected ? `0 2px 6px ${subject.color}85` : 'none'
                      } : (isSelected ? {
                        border: `2px solid ${subject.color}`,
                        color: subject.color,
                        boxShadow: `0 0 0 1px ${subject.color}26, 0 8px 16px ${subject.color}1f`
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
                    </div>
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
                    <div key={type} className="min-w-[88px] flex justify-center">
                    <button
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
                      className={`inline-flex w-auto max-w-full transition-all duration-200 items-center justify-center cursor-pointer min-h-[34px] px-4 py-1.5 rounded-full text-base gap-2 ${
                        selectedAssessmentTypes.includes(type)
                          ? 'shadow-sm font-bold'
                          : 'font-medium text-slate-500 hover:bg-white/50'
                      }`}
                      style={selectedAssessmentTypes.includes(type)
                        ? {
                            border: `2px solid ${assessmentTypeMeta[type].color}`,
                            color: assessmentTypeMeta[type].color,
                            boxShadow: `0 0 0 1px ${assessmentTypeMeta[type].color}26, 0 8px 16px ${assessmentTypeMeta[type].color}1f`
                          }
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
                    </div>
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
                  scoring_mode: assessment.scoring_mode,
                  counts_toward_average: assessment.counts_toward_average,
                  counts_toward_reward: assessment.counts_toward_reward,
                  image_urls: assessment.image_urls,
                  mistakes: assessment.mistakes,
                  notes: assessment.notes,
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
