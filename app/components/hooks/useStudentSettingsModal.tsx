'use client'

import { useState } from 'react'
import StudentSettingsModal from '../StudentSettingsModal'

export function useStudentSettingsModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const openModal = (studentId: string) => {
    setSelectedStudentId(studentId)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setSelectedStudentId(null)
  }

  const ModalComponent = ({ onSuccess }: { onSuccess?: () => void }) => {
    if (!selectedStudentId) return null

    return (
      <StudentSettingsModal
        isOpen={isOpen}
        onClose={closeModal}
        studentId={selectedStudentId}
        onSuccess={() => {
          if (onSuccess) {
            onSuccess()
          }
          closeModal()
        }}
      />
    )
  }

  return {
    openModal,
    closeModal,
    ModalComponent,
    isOpen,
    selectedStudentId
  }
}

