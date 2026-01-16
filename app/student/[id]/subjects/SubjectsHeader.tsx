'use client'

import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const t = useTranslations('subject')
  const tRewardRules = useTranslations('rewardRules')
  const locale = useLocale()
  const [isGlobalRewardRulesModalOpen, setIsGlobalRewardRulesModalOpen] = useState(false)

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-orange-600 dark:text-orange-300 material-icons-outlined text-3xl drop-shadow-sm flex-shrink-0">menu_book</span>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tight">{t('manageSubjects')}</h1>
              {studentName && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
              className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="material-icons-outlined text-lg">diamond</span>
              {tRewardRules('manageGlobalRules') || '通用獎金規則'}
            </button>
            
            {/* 添加科目按鈕 */}
            {onOpenAddModal && (
              <button 
                onClick={onOpenAddModal}
                className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-icons-outlined text-lg">add_circle</span>
                {t('addSubject')}
              </button>
            )}
            
            {/* 返回首頁按鈕 */}
            <button 
              onClick={() => router.push('/')}
              className="bg-primary hover:bg-opacity-90 text-white p-2 rounded-full shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center w-10 h-10 hover:scale-105 active:scale-95"
            >
              <span className="material-icons-outlined text-lg">home</span>
            </button>
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
      />
    </>
  )
}
