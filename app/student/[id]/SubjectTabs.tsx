'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface Subject {
  id: string
  name: string
  color: string
  icon: string
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
  subjects?: {
    name: string
    color: string
    icon: string
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
  summary: Summary | null
  selectedSubject: string
  setSelectedSubject: (subject: string) => void
  resetDate: Date | null
  rewardBreakdown: RewardBreakdown
  onEditAssessment?: (assessment: Assessment) => void
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
  summary, 
  selectedSubject, 
  setSelectedSubject, 
  resetDate, 
  rewardBreakdown, 
  onEditAssessment,
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
  
  // 科目變更時重置頁碼
  useEffect(() => {
    setCurrentPage(1)
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

  // 計算歸零日期（只取日期部分）用於比較
  const resetDateOnly = resetDate 
    ? new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate()).getTime()
    : null

  // 檢查評量是否在歸零日期之前（不計入獎金）
  const isBeforeReset = (assessment: Assessment) => {
    if (!resetDateOnly || !assessment.due_date) return false
    const assessmentDate = new Date(assessment.due_date)
    const assessmentDateOnly = new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate()).getTime()
    // 歸零日期當天及之前的記錄都不計入
    return assessmentDateOnly <= resetDateOnly
  }

  return (
    <>
      {/* 評量記錄標題和科目過濾器 */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-2 gap-4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        {/* 左側：評量記錄標題 */}
        <div className="flex items-center gap-3" style={{ paddingTop: '5px' }}>
          <div className="bg-primary w-1 h-6 rounded-full shadow-[0_0_10px_rgba(106,153,224,0.8)]"></div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('recordsTitle')}
          </h2>
        </div>

        {/* 右側：科目過濾器和返回首頁按鈕 */}
        <div className="flex items-center gap-3">
          {/* 科目過濾器 */}
          <div className="flex flex-wrap gap-2 p-1 glass-btn rounded-xl backdrop-blur-md">
          {/* 全部 */}
          <button
            onClick={() => setSelectedSubject('')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              !selectedSubject || selectedSubject === ''
                ? 'bg-white/60 text-gray-900 shadow-sm ring-1 ring-white/70'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            {locale === 'zh-TW' ? '全部' : 'All'}
          </button>

          {subjects && subjects.length > 0 && subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                selectedSubject === subject.id
                  ? 'bg-white/60 text-gray-900 shadow-sm ring-1 ring-white/70'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }}></span>
              {subject.icon} {subject.name}
            </button>
          ))}
          </div>
          
          {/* 返回首頁按鈕 */}
          <button 
            onClick={() => router.push('/')}
            className="glass-btn rounded-xl flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 group cursor-pointer overflow-hidden"
            style={{ 
              paddingLeft: '12px', 
              paddingRight: '6px', 
              paddingTop: '10px',
              paddingBottom: '10px',
              gap: '6px',
              minWidth: 'auto',
              width: 'auto'
            }}
          >
            <span 
              className="material-symbols-outlined group-hover:text-primary transition-colors flex-shrink-0"
              style={{ 
                width: '24px', 
                height: '24px', 
                fontSize: '24px', 
                lineHeight: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              home
            </span>
            <span className="max-w-0 group-hover:max-w-[200px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              {tCommon('backToHome')}
            </span>
          </button>
        </div>
      </div>

      {/* 評量卡片列表 */}
      {filteredAssessments && filteredAssessments.length > 0 ? (
        <>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {paginatedAssessments.map((assessment) => {
            const beforeReset = isBeforeReset(assessment)

            // 評量類型映射
            const typeMap: Record<string, { icon: string; label: string; colorClass: string; borderClass: string }> = {
              'exam': { icon: 'calculate', label: tAssessment('types.exam'), colorClass: 'bg-rose-300/40', borderClass: 'border-rose-400/50', hoverClass: 'hover:bg-rose-300/50', textColor: 'text-rose-600', leftBorder: 'border-l-rose-500' },
              'quiz': { icon: 'assignment_turned_in', label: tAssessment('types.quiz'), colorClass: 'bg-emerald-300/40', borderClass: 'border-emerald-400/50', hoverClass: 'hover:bg-emerald-300/50', textColor: 'text-emerald-600', leftBorder: 'border-l-emerald-500' },
              'homework': { icon: 'menu_book', label: tAssessment('types.homework'), colorClass: 'bg-blue-300/40', borderClass: 'border-blue-400/50', hoverClass: 'hover:bg-blue-300/50', textColor: 'text-blue-600', leftBorder: 'border-l-blue-500' },
              'project': { icon: 'psychology', label: tAssessment('types.project'), colorClass: 'bg-violet-300/40', borderClass: 'border-violet-400/50', hoverClass: 'hover:bg-violet-300/50', textColor: 'text-violet-600', leftBorder: 'border-l-violet-500' }
            }
            const typeInfo = assessment.assessment_type ? typeMap[assessment.assessment_type] : null

            // 根據科目顏色決定樣式
            const subjectColor = assessment.subjects?.color || '#6b7280'

            return (
              <div
                key={assessment.id}
                className="glass-card rounded-2xl p-4 group cursor-pointer border-l-[3px]"
                style={{ borderLeftColor: subjectColor }}
                onClick={() => onEditAssessment && onEditAssessment(assessment)}
              >
                {/* 頂部：評量類型和狀態 */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-4">
                    <div
                      className="w-16 h-16 log-icon-base rounded-xl flex items-center justify-center border group-hover:scale-110 transition-colors overflow-hidden"
                      style={{ 
                        borderColor: `${subjectColor}80`,
                        backgroundColor: `${subjectColor}40`
                      }}
                    >
                      <span className="text-5xl leading-none select-none" style={{ fontSize: '2.5rem', lineHeight: '1', display: 'block', transform: 'translateY(-3px)' }}>
                        {assessment.subjects?.icon || '📄'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 group-hover:text-purple-600 transition-colors">
                        {assessment.due_date ? new Date(assessment.due_date).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' }) : assessment.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {assessment.subjects && (
                          <span
                            className="text-xs px-2 py-0.5 rounded border uppercase tracking-wide font-bold"
                            style={{
                              backgroundColor: `${subjectColor}40`,
                              color: subjectColor,
                              borderColor: `${subjectColor}80`
                            }}
                          >
                            {assessment.subjects.icon} {assessment.subjects.name}
                          </span>
                        )}
                        {typeInfo && (
                          <span className="text-sm text-gray-600">
                            {locale === 'zh-TW' ? '單元: ' : 'Unit: '}{assessment.description || assessment.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {assessment.reward_amount > 0 && (
                      <span className="log-bonus-tag rounded-full shadow-sm" style={{ 
                        color: '#d97706', 
                        backgroundColor: '#fef3c7', 
                        borderColor: '#fbbf24',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}>
                        ${assessment.reward_amount}
                      </span>
                    )}
                  </div>
                </div>

                {/* 分隔線 */}
                <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

                {/* 底部：日期、分數和獎金 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 log-date-text font-medium text-emerald-600">
                    <span className="material-symbols-outlined text-base text-emerald-500">event</span>
                    {assessment.due_date ? new Date(assessment.due_date).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US') : '-'}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span 
                      className="log-score-text font-bold text-gray-900 group-hover:scale-105 transition-transform origin-right"
                      style={{ opacity: 0.7 }}
                    >
                      {assessment.score ?? '-'}
                    </span>
                    <span className="text-sm text-gray-600 font-medium mb-1">
                      {locale === 'zh-TW' ? '分' : 'pts'}
                    </span>
                  </div>
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
        </>
      ) : (
        <div className="text-center py-12 glass-card rounded-2xl border-2 border-dashed border-white/40">
          <p className="text-gray-500 text-lg mb-2">
            📭 {selectedSubject
              ? (locale === 'zh-TW' ? '此科目尚無評量記錄' : 'No records for this subject')
              : t('noRecords')}
          </p>
          <p className="text-gray-400 text-sm">{t('addNewRecord')}</p>
        </div>
      )}
    </>
  )
}

