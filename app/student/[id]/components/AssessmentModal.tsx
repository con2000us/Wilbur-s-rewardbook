'use client'

import { useTranslations } from 'next-intl'
import Modal from '@/app/components/Modal'
import AssessmentForm from './AssessmentForm'

interface Subject {
  id: string
  name: string
  color: string
  icon: string
}

interface Assessment {
  id: string
  subject_id: string
  title: string
  assessment_type: string
  score: number | null
  max_score: number
  due_date: string | null
  status: string
  reward_amount: number | null
}

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

interface AssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  subjects: Subject[]
  rewardRules: RewardRule[]
  assessment?: Assessment
  defaultAssessmentType?: string
  onSuccess?: () => void
}

export default function AssessmentModal({
  isOpen,
  onClose,
  studentId,
  subjects,
  rewardRules,
  assessment,
  defaultAssessmentType = 'exam',
  onSuccess
}: AssessmentModalProps) {
  const t = useTranslations('assessment')

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
    // 延遲關閉以顯示成功訊息
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assessment ? `✏️ ${t('editAssessment')}` : `➕ ${t('addAssessment')}`}
      size="xl"
      widthPercent={70}
    >
      <AssessmentForm
        studentId={studentId}
        subjects={subjects}
        rewardRules={rewardRules}
        assessment={assessment}
        defaultAssessmentType={defaultAssessmentType}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

