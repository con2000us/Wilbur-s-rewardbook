'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import StudentSwitchModal from './StudentSwitchModal'

interface Student {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  studentId: string
  studentName: string
  studentAvatar: { emoji: string; gradientStyle: string }
  recordsTitle: string
  allStudents: Student[]
  basePath?: string
  currentPage?: 'records' | 'transactions' | 'subjects' | 'settings'
  showHeader?: boolean
}

export default function StudentSidebarHeader({
  studentId,
  studentName,
  studentAvatar,
  recordsTitle,
  allStudents,
  basePath = '',
  currentPage = 'records',
  showHeader = true
}: Props) {
  // 顯示模式：'navigation' = 快速導覽, 'students' = 學生列表
  const [displayMode, setDisplayMode] = useState<'navigation' | 'students'>('navigation')
  const t = useTranslations('common')
  const locale = useLocale()
  const navButtonRef = useRef<HTMLButtonElement | null>(null)
  const studentButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const prefersDark = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const hasDarkClass = typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark')
    const navButton = navButtonRef.current
    const studentButton = studentButtonRef.current
    const navStyles = navButton ? window.getComputedStyle(navButton) : null
    const studentStyles = studentButton ? window.getComputedStyle(studentButton) : null

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H1', location: 'StudentSidebarHeader.tsx', message: 'mobile tab styles', data: { displayMode, prefersDark, hasDarkClass, nav: navButton ? { className: navButton.className, color: navStyles?.color, backgroundColor: navStyles?.backgroundColor } : null, students: studentButton ? { className: studentButton.className, color: studentStyles?.color, backgroundColor: studentStyles?.backgroundColor } : null }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [displayMode])

  return (
    <div className="w-full">
      {/* 學生頭像和下拉選單 */}
      <div className="w-full">
        <StudentHeaderWithDropdown
          studentId={studentId}
          studentName={studentName}
          studentAvatar={studentAvatar}
          recordsTitle={recordsTitle}
          allStudents={allStudents}
          basePath={basePath}
          currentPage={currentPage}
          showHeader={showHeader}
        />
      </div>

      {/* 快速導覽/學生列表切換按鈕 */}
      <div className="relative w-full mt-3 pb-4" id="student-switch-button-container">
        <div className="w-full bg-white/60 dark:bg-white/60 backdrop-blur-sm p-1.5 rounded-full flex flex-nowrap items-center gap-1 border border-white/40 dark:border-white/40 shadow-sm overflow-hidden overflow-x-auto">
          {/* 快速導覽按鈕 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDisplayMode('navigation')
            }}
            ref={navButtonRef}
            className={`flex-1 px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              displayMode === 'navigation'
                ? 'bg-white dark:bg-white shadow-sm font-bold text-slate-800 dark:text-slate-800'
                : 'font-medium text-slate-500 dark:text-slate-500 hover:bg-white/50 dark:hover:bg-white/50'
            }`}
          >
            {locale === 'zh-TW' ? '快速導覽' : 'Quick Navigation'}
          </button>

          {/* 學生列表按鈕 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDisplayMode('students')
            }}
            ref={studentButtonRef}
            className={`flex-1 px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              displayMode === 'students'
                ? 'bg-white dark:bg-white shadow-sm font-bold text-slate-800 dark:text-slate-800'
                : 'font-medium text-slate-500 dark:text-slate-500 hover:bg-white/50 dark:hover:bg-white/50'
            }`}
          >
            {locale === 'zh-TW' ? '學生列表' : 'Student List'}
          </button>
        </div>

        {/* 切換學生下拉選單 */}
        <StudentSwitchModal
          isOpen={true}
          onClose={() => {}}
          currentStudentId={studentId}
          allStudents={allStudents}
          currentPage={currentPage}
          displayMode={displayMode}
        />
      </div>
    </div>
  )
}
