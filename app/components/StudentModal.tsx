'use client'

import { useTranslations } from 'next-intl'
import Modal from '@/app/components/Modal'
import AddStudentForm from '@/app/students/add/AddStudentForm'

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function StudentModal({
  isOpen,
  onClose,
  onSuccess
}: StudentModalProps) {
  const t = useTranslations('home')

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
      title={`➕ ${t('addStudent')}`}
      size="lg"
      widthPercent={70}
    >
      <AddStudentForm
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

