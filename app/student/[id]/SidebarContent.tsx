'use client'

import { useEffect, useRef } from 'react'
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
  const totalAverageRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const prefersDark = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const hasDarkClass = typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark')
    const totalAverageEl = totalAverageRef.current
    const totalAverageStyles = totalAverageEl ? window.getComputedStyle(totalAverageEl) : null

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H3', location: 'SidebarContent.tsx', message: 'total average styles', data: { prefersDark, hasDarkClass, totalAverage: totalAverageEl ? { className: totalAverageEl.className, color: totalAverageStyles?.color, backgroundColor: totalAverageStyles?.backgroundColor } : null }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [rewardBreakdown?.totalAverage])

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-6">
      {/* Profile Section - 已由 StudentSidebarHeader 處理，這裡只保留統計卡片 */}
      
      {/* Average Score */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-blue-50/50 dark:border-slate-700/50">
        <div className="flex items-center gap-2 text-blue-500 mb-2">
          <span className="material-icons-outlined text-sm">leaderboard</span>
          <span className="text-xs font-bold">{t('totalAverageScore')}</span>
        </div>
        <div className="flex items-baseline gap-1 mb-4">
          <span ref={totalAverageRef} className="text-5xl font-black text-slate-700 dark:text-slate-700">{rewardBreakdown.totalAverage?.toFixed(1) || '0.0'}</span>
          <span className="text-slate-400 dark:text-slate-400 font-medium">{t('points')}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-400 transition-all duration-1000" 
            style={{ width: `${Math.min(rewardBreakdown.totalAverage || 0, 100)}%` }}
          />
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-3xl text-center border border-blue-50/50 dark:border-slate-700/50">
          <span className="block text-xs text-slate-400 dark:text-slate-400 mb-1">{t('totalSubjects')}</span>
          <span className="text-xl font-black text-slate-700 dark:text-slate-700">{subjects.length}</span>
        </div>
        <div className="glass-card p-4 rounded-3xl text-center border border-blue-50/50 dark:border-slate-700/50">
          <span className="block text-xs text-slate-400 dark:text-slate-400 mb-1">{t('totalAssessments')}</span>
          <span className="text-xl font-black text-slate-700 dark:text-slate-700">{filteredAssessments.length}</span>
        </div>
        <div className="glass-card p-4 rounded-3xl text-center border border-blue-50/50 dark:border-slate-700/50">
          <span className="block text-xs text-slate-400 dark:text-slate-400 mb-1">{t('completed')}</span>
          <span className="text-xl font-black text-emerald-500">
            {filteredAssessments.length > 0
              ? `${Math.round((filteredAssessments.filter(a => a.status === 'completed').length / filteredAssessments.length) * 100)}%`
              : '0%'}
          </span>
        </div>
      </div>

      {/* Print Button */}
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
            className="glass-card print-button-card hover:bg-slate-50 dark:hover:bg-slate-800 p-4 rounded-3xl flex flex-col items-center gap-2 border border-blue-50/50 transition-all group"
            style={{ background: 'white' }}
          >
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <span className="material-icons-outlined" style={{ fontSize: '2.5rem' }}>print</span>
            </div>
            <div className="text-center">
              <p className="font-bold text-sm">{t('printReport')}</p>
              <p className="text-xs text-slate-400">{t('exportPDF')}</p>
            </div>
          </Link>
        )
      })()}

    </aside>
  )
}
