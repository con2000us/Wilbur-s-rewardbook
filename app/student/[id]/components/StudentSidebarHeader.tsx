'use client'

import { useState } from 'react'
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
        <div className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-1.5 rounded-full flex flex-nowrap items-center gap-1 border border-white/40 dark:border-slate-700/40 shadow-sm overflow-hidden overflow-x-auto">
          {/* 快速導覽按鈕 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDisplayMode('navigation')
            }}
            className={`flex-1 px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              displayMode === 'navigation'
                ? 'bg-white dark:bg-slate-700 shadow-sm font-bold text-slate-800 dark:text-white'
                : 'font-medium text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
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
            className={`flex-1 px-4 py-1.5 rounded-full text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              displayMode === 'students'
                ? 'bg-white dark:bg-slate-700 shadow-sm font-bold text-slate-800 dark:text-white'
                : 'font-medium text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
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
