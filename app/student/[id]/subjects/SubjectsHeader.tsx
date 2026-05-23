'use client'

import { useTranslations, useLocale } from 'next-intl'
import GlobalRewardRulesModal from './components/GlobalRewardRulesModal'
import { useState } from 'react'

interface RewardRule {
  id: string
  student_id: string | null
  subject_id: string | null
  rule_name: string
  condition: string
  min_score: number | null
  max_score: number | null
  reward_amount: number
  priority: number
  is_active: boolean
  assessment_type: string | null
}

interface Props {
  studentId: string
  studentName: string
  globalRules: RewardRule[]
  studentRules: RewardRule[]
  onOpenAddModal?: () => void
}

export default function SubjectsHeader({ studentId, studentName, globalRules, studentRules, onOpenAddModal }: Props) {
  const t = useTranslations('subject')
  const tRewardRules = useTranslations('rewardRules')
  const locale = useLocale()
  const [isGlobalRewardRulesModalOpen, setIsGlobalRewardRulesModalOpen] = useState(false)

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col min-[360px]:flex-row min-[360px]:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="material-icons-outlined rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 p-2 text-2xl text-blue-600 shadow-sm flex-shrink-0"
              aria-hidden="true"
            >
              menu_book
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-800 truncate">{t('manageSubjects')}</h1>
              {studentName && (
                <p className="text-sm text-slate-500">
                  {locale === 'zh-TW'
                    ? `管理${studentName}的科目設定與獎金規則`
                    : `Managing ${studentName}'s subjects and reward rules`
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* 通用獎金規則按鈕 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsGlobalRewardRulesModalOpen(true)
              }}
              className="student-toolbar-primary px-6 py-2.5 min-h-11 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="material-icons-outlined text-lg">diamond</span>
              {tRewardRules('manageGlobalRules') || '通用獎金規則'}
            </button>
            
            {/* 添加科目按鈕 */}
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
      </div>

      {/* 通用獎金規則 Modal */}
      <GlobalRewardRulesModal
        isOpen={isGlobalRewardRulesModalOpen}
        onClose={() => setIsGlobalRewardRulesModalOpen(false)}
        globalRules={globalRules}
        studentRules={studentRules}
        studentId={studentId}
        studentName={studentName}
      />
    </>
  )
}
