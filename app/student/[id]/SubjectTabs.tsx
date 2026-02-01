'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import AssessmentRecordCard from './components/AssessmentRecordCard'

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
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | null>(25)
  const subjectButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const allButtonRef = useRef<HTMLButtonElement | null>(null)
  const monthButtonRef = useRef<HTMLButtonElement | null>(null)

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
  }, [selectedSubject, assessments])

  // 過濾評量
  const filteredAssessments = selectedSubject && selectedSubject !== ''
    ? assessments.filter(a => a.subject_id === selectedSubject)
    : assessments

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
                className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-icons-outlined text-lg">add_circle</span>
                {t('addAssessment')}
              </button>
            )}
            
            {/* 返回首頁按鈕 - 在手機寬度下隱藏 */}
            <button 
              onClick={() => router.push('/')}
              className="hidden md:flex bg-primary hover:bg-opacity-90 text-white p-2 rounded-full shadow-lg shadow-indigo-500/20 transition-all cursor-pointer items-center justify-center w-10 h-10 hover:scale-105 active:scale-95"
            >
              <span className="material-icons-outlined text-lg">home</span>
            </button>
          </div>
        </div>
        
        {/* 科目過濾器和月份選擇器 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* 科目過濾器 */}
          <div className="w-full md:w-auto bg-white/60 backdrop-blur-sm p-1.5 rounded-full flex flex-nowrap items-center gap-1 border border-white/40 shadow-sm overflow-hidden overflow-x-auto">
            {/* 全部 */}
            <button
              ref={allButtonRef}
              onClick={() => setSelectedSubject('')}
              className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                !selectedSubject || selectedSubject === ''
                  ? 'bg-white shadow-sm font-bold text-slate-800'
                  : 'font-medium text-slate-500 hover:bg-white/50'
              }`}
            >
              {t('all')}
            </button>

            {subjects && subjects.length > 0 && subjects.map(subject => {
              const isSelected = selectedSubject === subject.id
              return (
                <button
                  key={subject.id}
                  ref={(el) => { subjectButtonRefs.current[subject.id] = el }}
                  onClick={() => {
                    // 清除所有按鈕的 hover 樣式
                    Object.values(subjectButtonRefs.current).forEach(btn => {
                      if (btn) {
                        btn.style.borderColor = 'transparent'
                        btn.style.backgroundColor = ''
                      }
                    })
                    setSelectedSubject(subject.id)
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-white shadow-sm font-bold text-slate-800'
                      : 'font-medium text-slate-500'
                  }`}
                  style={isSelected ? {
                    border: '2px solid transparent'
                  } : {
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = subject.color
                      e.currentTarget.style.backgroundColor = `${subject.color}15`
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.backgroundColor = ''
                    }
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }}></span>
                  {subject.name}
                </button>
              )
            })}
          </div>

          {/* 月份選擇器 */}
          <div className="w-full md:w-auto flex items-center gap-3 justify-end md:justify-start md:ml-auto">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{t('selectAssessmentMonth')}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {selectedSubject
              ? t('noRecordsForSubject')
              : t('noAssessmentRecords')}
          </p>
        </div>
      )}
    </>
  )
}

