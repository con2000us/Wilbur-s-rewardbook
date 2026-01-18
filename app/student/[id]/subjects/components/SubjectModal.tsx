'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Modal from '@/app/components/Modal'
import SubjectForm from './SubjectForm'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  order_index: number
}

interface ExistingSubject {
  id: string
  name: string
  icon: string
  order_index: number
}

interface SubjectModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  subject?: Subject
  existingSubjects: ExistingSubject[]
  onSuccess?: () => void
}

export default function SubjectModal({
  isOpen,
  onClose,
  studentId,
  subject,
  existingSubjects,
  onSuccess
}: SubjectModalProps) {
  const t = useTranslations('subject')
  const [widthPercent, setWidthPercent] = useState(70)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateWidth = () => {
        const newWidthPercent = window.innerWidth < 600 ? 96 : 70
        setWidthPercent(newWidthPercent)
      }
      updateWidth()
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }
  }, [])

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
      title={subject ? `✏️ ${t('editSubject')}` : `➕ ${t('addSubject')}`}
      size="xl"
      widthPercent={widthPercent}
    >
      <SubjectForm
        studentId={studentId}
        subject={subject}
        existingSubjects={existingSubjects}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

