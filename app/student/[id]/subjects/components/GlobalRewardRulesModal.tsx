'use client'

import { useTranslations } from 'next-intl'
import Modal from '@/app/components/Modal'
import GlobalRewardRulesManager from './GlobalRewardRulesManager'

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

interface GlobalRewardRulesModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  globalRules: RewardRule[]
  studentRules: RewardRule[]
  onSuccess?: () => void
}

export default function GlobalRewardRulesModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  globalRules,
  studentRules,
  onSuccess
}: GlobalRewardRulesModalProps) {
  const t = useTranslations('rewardRules')

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💎 ${t('manageGlobalRules') || '通用獎金規則管理'}`}
      size="xl"
      widthPercent={70}
    >
      <GlobalRewardRulesManager
        studentId={studentId}
        studentName={studentName}
        globalRules={globalRules}
        studentRules={studentRules}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

