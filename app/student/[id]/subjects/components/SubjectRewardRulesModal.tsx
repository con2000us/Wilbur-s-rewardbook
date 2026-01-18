'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Modal from '@/app/components/Modal'
import SubjectRewardRulesManager from '../[subjectId]/rewards/SubjectRewardRulesManager'

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

interface SubjectRewardRulesModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  subjectId: string
  subjectName: string
  subjectIcon: string
  subjectRules: RewardRule[]
  studentRules: RewardRule[]
  globalRules: RewardRule[]
  onSuccess?: () => void
}

export default function SubjectRewardRulesModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  subjectId,
  subjectName,
  subjectIcon,
  subjectRules,
  studentRules,
  globalRules,
  onSuccess
}: SubjectRewardRulesModalProps) {
  const t = useTranslations('rewardRules')
  const [widthPercent, setWidthPercent] = useState(70)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        const newWidth = window.innerWidth
        setWidthPercent(newWidth < 600 ? 96 : 70)
      }
      handleResize()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
  }

  // 判斷是否為 emoji（用於向後兼容）
  const isEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(subjectIcon) ||
                 subjectIcon.length <= 2 ||
                 !/^[a-z_]+$/i.test(subjectIcon)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          💎
          {isEmoji ? (
            <span>{subjectIcon}</span>
          ) : (
            <span className="material-icons-outlined" style={{ fontSize: '1.5rem' }}>{subjectIcon}</span>
          )}
          <span>{subjectName} - {t('manageRules')}</span>
        </span>
      }
      size="xl"
      widthPercent={widthPercent}
    >
      <SubjectRewardRulesManager
        studentId={studentId}
        studentName={studentName}
          subjectId={subjectId}
          subjectName={subjectName}
          subjectIcon={subjectIcon}
        subjectRules={subjectRules}
          studentRules={studentRules}
          globalRules={globalRules}
          onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

