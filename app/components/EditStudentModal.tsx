'use client'

import { useTranslations } from 'next-intl'
import Modal from '@/app/components/Modal'
import EditStudentForm from '@/app/students/[studentId]/edit/EditStudentForm'

interface EditStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  student: {
    id: string
    name: string
    email: string | null
    avatar_url: string | null
  }
}

export default function EditStudentModal({
  isOpen,
  onClose,
  onSuccess,
  student,
}: EditStudentModalProps) {
  const t = useTranslations('student')

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`✏️ ${t('editStudentData')}`}
      size="xl"
    >
      <EditStudentForm
        student={student}
        onSuccess={handleSuccess}
        onCancel={onClose}
        isModal
      />
    </Modal>
  )
}
