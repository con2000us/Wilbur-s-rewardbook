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
  // 科目設定和獎金存摺頁面預設展開快速導覽
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(currentPage === 'subjects' || currentPage === 'transactions')
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

      {/* 快速導覽按鈕和下拉選單 */}
      <div className="relative w-full mt-3" id="student-switch-button-container">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setTimeout(() => {
              setIsStudentDropdownOpen(!isStudentDropdownOpen)
            }, 0)
          }}
          className="glass-btn px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 group w-full justify-center lg:justify-start cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">swap_horiz</span>
          {locale === 'zh-TW' ? '快速導覽' : 'Quick Navigation'}
        </button>

        {/* 切換學生下拉選單 */}
        <StudentSwitchModal
          isOpen={isStudentDropdownOpen}
          onClose={() => setIsStudentDropdownOpen(false)}
          currentStudentId={studentId}
          allStudents={allStudents}
        />
      </div>
    </div>
  )
}
