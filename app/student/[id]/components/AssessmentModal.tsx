'use client'

import { useState, useEffect } from 'react'
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
  grade: string | null
  score_type: string | null
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
  initialSubjectId?: string
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
  initialSubjectId,
  defaultAssessmentType = 'exam',
  onSuccess
}: AssessmentModalProps) {
  const t = useTranslations('assessment')

  // 偵測視窗寬度，動態調整 modal 寬度
  const [windowWidth, setWindowWidth] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSuccess = () => {
    // 先關閉 modal，避免 router.refresh() 導致狀態不一致
    onClose()

    // 然後調用 onSuccess（會觸發 router.refresh）
    if (onSuccess) {
      // 稍微延遲以確保 modal 關閉動畫完成
      setTimeout(() => {
        onSuccess()
      }, 100)
    }
  }

  // 在寬度 600px 以下時，使用 96% 寬度；否則使用 70%
  const modalWidthPercent = windowWidth < 600 ? 96 : 70

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assessment ? (
        <>
          <span className="material-icons-outlined align-middle mr-1">edit</span>
          {t('editAssessment')}
        </>
      ) : (
        <>
          <span className="material-icons-outlined align-middle mr-1">add_circle</span>
          {t('addAssessment')}
        </>
      )}
      size="xl"
      widthPercent={modalWidthPercent}
    >
      <AssessmentForm
        studentId={studentId}
        subjects={subjects}
        rewardRules={rewardRules}
        assessment={assessment}
        initialSubjectId={initialSubjectId}
        defaultAssessmentType={defaultAssessmentType}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

