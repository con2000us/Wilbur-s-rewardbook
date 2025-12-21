'use client'

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

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💎 ${subjectIcon} ${subjectName} - ${t('manageRules')}`}
      size="xl"
      widthPercent={70}
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

