'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface SidebarContentProps {
  studentId: string
  studentName: string
  studentAvatar: { emoji: string; gradientStyle: string }
  subjects: any[]
  assessments: any[]
  transactions: any[]
  summary: any
  rewardBreakdown: any
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  availableMonths: string[]
  currentMonth: string
  calculateFromReset: boolean
  setCalculateFromReset: (value: boolean) => void
  isMonthPickerOpen: boolean
  setIsMonthPickerOpen: (value: boolean) => void
  formatMonth: (monthKey: string) => string
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  canGoPrevious: boolean
  canGoNext: boolean
  filteredAssessments: any[]
  onOpenAddModal: () => void
}

export default function SidebarContent({
  studentId,
  studentName,
  studentAvatar,
  subjects,
  assessments,
  transactions,
  summary,
  rewardBreakdown,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  currentMonth,
  calculateFromReset,
  setCalculateFromReset,
  isMonthPickerOpen,
  setIsMonthPickerOpen,
  formatMonth,
  goToPreviousMonth,
  goToNextMonth,
  canGoPrevious,
  canGoNext,
  filteredAssessments,
  onOpenAddModal
}: SidebarContentProps) {
  const t = useTranslations('student')
  const tAssessment = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()

  return (
    <>
      {/* 分隔線和月份選擇器 */}
      <div className="flex flex-col xl:flex-col items-start gap-3 w-full">
        <div className="flex items-center gap-2 w-full my-2">
          <div className="flex-1 h-px bg-white/50"></div>
          <span className="text-sm text-gray-600 px-2">{t('selectAssessmentMonth', '選擇評量月份')}</span>
          <div className="flex-1 h-px bg-white/50"></div>
        </div>
        
        {/* 月份選擇器 - 使用 relative 定位以便彈出菜單定位 */}
        <div className="relative w-full">
          <div className="flex items-center bg-white/40 rounded-xl p-1 border border-white/60 w-full justify-between">
            <button
              onClick={goToPreviousMonth}
              disabled={!canGoPrevious}
              className={`p-1.5 rounded-lg transition-colors ${
                canGoPrevious ? 'hover:bg-white/60 text-gray-600 hover:text-gray-900' : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMonthPickerOpen(!isMonthPickerOpen)
              }}
              className="px-2 text-sm font-bold text-gray-900 tabular-nums xl:px-4 cursor-pointer"
            >
              {selectedMonth
                ? formatMonth(selectedMonth)
                : calculateFromReset
                  ? t('recentSettlement')
                  : t('all')}
            </button>
            <button
              onClick={goToNextMonth}
              disabled={!canGoNext}
              className={`p-1.5 rounded-lg transition-colors ${
                canGoNext ? 'hover:bg-white/60 text-gray-600 hover:text-gray-900' : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
          
          {/* Month picker dropdown - 定位在日期選擇器下方 */}
          {isMonthPickerOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => setIsMonthPickerOpen(false)}
              />
              <div
                className="absolute top-full left-0 mt-2 z-20 bg-white/95 backdrop-blur-xl rounded-xl border border-white/60 shadow-2xl p-4 min-w-full"
                onClick={(e) => {
                  // 阻止點擊事件冒泡到背景遮罩
                  e.stopPropagation()
                }}
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
                    {locale === 'zh-TW' ? '全部' : 'All'}
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
                    {locale === 'zh-TW' ? '最近結算' : 'Recent'}
                  </button>
                </div>

                {/* 月份網格 */}
                <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-2 border border-gray-200 rounded-lg p-2 max-h-[240px]">
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
              </div>
              </>
            )}
          </div>
      </div>

      {/* 統計卡片區域 */}
      <div className="grid grid-cols-1 gap-4 w-full mt-4">
          {/* 總平均分數卡片 */}
          <div className="glass-card rounded-2xl p-4 flex flex-col justify-between group">
            <div className="flex items-center gap-2 text-primary text-xs font-medium uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">monitoring</span>
              {t('totalAverageScore')}
            </div>
            <div className="flex flex-col items-center justify-center mt-1">
              <div className="flex items-baseline gap-2">
                <span 
                  className="text-4xl font-bold text-gray-900 drop-shadow-lg"
                  style={{ 
                    opacity: 0.7
                  }}
                >
                  {rewardBreakdown.totalAverage?.toFixed(1) || '0.0'}
                </span>
                <span className="text-gray-600 font-medium text-sm">{t('points')}</span>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full shadow-[0_0_10px_rgba(106,153,224,0.5)]"
                style={{ width: `${Math.min(rewardBreakdown.totalAverage || 0, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* 收支概況卡片 */}
          <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-medium uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">account_balance_wallet</span>
              {t('financialOverview')}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('income')}</span>
                <span className="text-lg font-bold text-emerald-500">${summary?.total_earned || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('expense')}</span>
                <span className="text-lg font-bold text-rose-500">${summary?.total_spent || 0}</span>
              </div>
              <div className="pt-2 border-t border-white/60 flex justify-between items-center">
                <span className="text-gray-800 font-medium">{t('balance')}</span>
                <span className="text-xl font-bold text-gray-900">${summary?.balance || 0}</span>
              </div>
            </div>
          </div>

          {/* 統計資訊卡片 */}
          <div className="glass-card p-4 rounded-2xl flex items-center justify-around">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">{t('totalSubjects')}</div>
              <div className="text-xl font-bold text-gray-900">{subjects.length}</div>
            </div>
            <div className="w-px h-6 bg-white/60"></div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">{t('totalAssessments')}</div>
              <div className="text-xl font-bold text-gray-900">{filteredAssessments.length}</div>
            </div>
            <div className="w-px h-6 bg-white/60"></div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">{t('completed')}</div>
              <div className="text-xl font-bold text-emerald-500">
                {filteredAssessments.length > 0
                  ? `${Math.round((filteredAssessments.filter(a => a.status === 'completed').length / filteredAssessments.length) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onOpenAddModal}
              className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-primary/20 group cursor-pointer text-center"
            >
              <div className="w-9 h-9 rounded-full bg-primary/40 flex items-center justify-center border border-primary/50 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-xl">add</span>
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">{t('addAssessment')}</div>
                <div className="text-xs text-gray-600 mt-0.5">{t('addRecordDesc')}</div>
              </div>
            </button>

            {(() => {
              const params = new URLSearchParams()
              if (filteredAssessments && filteredAssessments.length > 0) {
                const dates = filteredAssessments
                  .filter((a: any) => a.due_date)
                  .map((a: any) => new Date(a.due_date).getTime())
                  .filter((d: number) => !isNaN(d))
                if (dates.length > 0) {
                  const minDate = new Date(Math.min(...dates))
                  const maxDate = new Date(Math.max(...dates))
                  params.set('startDate', minDate.toISOString().split('T')[0])
                  params.set('endDate', maxDate.toISOString().split('T')[0])
                }
              }
              if (calculateFromReset) {
                params.set('calculateFromReset', 'true')
              }
              return (
                <Link
                  href={`/student/${studentId}/print?${params.toString()}`}
                  target="_blank"
                  className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-300/30 group cursor-pointer text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-300/40 flex items-center justify-center border border-blue-400/50 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-blue-600 text-xl">print</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t('printReport')}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{t('exportPDF')}</div>
                  </div>
                </Link>
              )
            })()}
          </div>

          {/* 評量類型統計卡片 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-3 rounded-2xl flex items-center gap-3 hover:bg-rose-300/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-rose-300/40 flex items-center justify-center text-rose-600">
                <span className="material-symbols-outlined text-xl">edit_document</span>
              </div>
              <div>
                <div className="text-xs text-gray-600">{tAssessment('types.exam')}</div>
                <div className="text-base font-bold text-gray-900">
                  {rewardBreakdown.averageScores?.exam && rewardBreakdown.averageScores.exam > 0
                    ? rewardBreakdown.averageScores.exam.toFixed(1)
                    : '-'}
                </div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl flex items-center gap-3 hover:bg-emerald-300/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-300/40 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
              </div>
              <div>
                <div className="text-xs text-gray-600">{tAssessment('types.quiz')}</div>
                <div className="text-base font-bold text-gray-900">
                  {rewardBreakdown.averageScores?.quiz && rewardBreakdown.averageScores.quiz > 0
                    ? rewardBreakdown.averageScores.quiz.toFixed(1)
                    : '-'}
                </div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl flex items-center gap-3 hover:bg-amber-300/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber-300/40 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
              <div>
                <div className="text-xs text-gray-600">{tAssessment('types.homework')}</div>
                <div className="text-base font-bold text-gray-900">
                  {rewardBreakdown.averageScores?.homework && rewardBreakdown.averageScores.homework > 0
                    ? rewardBreakdown.averageScores.homework.toFixed(1)
                    : '-'}
                </div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl flex items-center gap-3 hover:bg-violet-300/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-violet-300/40 flex items-center justify-center text-violet-600">
                <span className="material-symbols-outlined text-xl">psychology</span>
              </div>
              <div>
                <div className="text-xs text-gray-600">{tAssessment('types.project')}</div>
                <div className="text-base font-bold text-gray-900">
                  {rewardBreakdown.averageScores?.project && rewardBreakdown.averageScores.project > 0
                    ? rewardBreakdown.averageScores.project.toFixed(1)
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  )
}
