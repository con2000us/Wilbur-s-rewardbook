'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Modal from './Modal'
import EditStudentForm from '../students/[studentId]/edit/EditStudentForm'

interface Student {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
  display_order: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  studentId: string
  onSuccess?: () => void
}

export default function StudentSettingsModal({ isOpen, onClose, studentId, onSuccess }: Props) {
  const t = useTranslations('student')
  const tCommon = useTranslations('common')
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // 載入學生資料
  useEffect(() => {
    if (isOpen && studentId) {
      loadStudent()
    } else {
      // 關閉時重置狀態
      setStudent(null)
      setError('')
    }
  }, [isOpen, studentId])

  const loadStudent = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/students/${studentId}`)
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to load student data')
      }

      const result = await response.json()
      setStudent(result.student)
    } catch (err) {
      console.error('Load student error:', err)
      setError(err instanceof Error ? err.message : t('loadStudentFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`✏️ ${t('editStudentData')}`}
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-gray-500">{tCommon('loading')}</div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      ) : student ? (
        <div>
          <p className="text-gray-600 mb-6">
            {t('editStudentDesc', { name: student.name })}
          </p>
          <EditStudentForm 
            student={student} 
            onSuccess={handleSuccess}
            onCancel={onClose}
            isModal={true}
          />
        </div>
      ) : null}
    </Modal>
  )
}

