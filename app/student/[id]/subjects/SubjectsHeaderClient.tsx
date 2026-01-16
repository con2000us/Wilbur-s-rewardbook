'use client'

import { useRef } from 'react'
import SubjectsHeader from './SubjectsHeader'
import SubjectsPageClient, { SubjectsPageClientRef } from './SubjectsPageClient'

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
  subjects: any[]
  allRewardRules: RewardRule[]
}

export default function SubjectsHeaderClient({ studentId, studentName, globalRules, studentRules, subjects, allRewardRules }: Props) {
  const subjectsPageClientRef = useRef<SubjectsPageClientRef>(null)

  const handleOpenAddModal = () => {
    subjectsPageClientRef.current?.handleOpenAddModal()
  }

  return (
    <>
      <SubjectsHeader
        studentId={studentId}
        studentName={studentName}
        globalRules={globalRules}
        studentRules={studentRules}
        onOpenAddModal={handleOpenAddModal}
      />
      <SubjectsPageClient
        ref={subjectsPageClientRef}
        studentId={studentId}
        studentName={studentName}
        subjects={subjects}
        allRewardRules={allRewardRules}
        globalRules={globalRules}
        studentRules={studentRules}
      />
    </>
  )
}
