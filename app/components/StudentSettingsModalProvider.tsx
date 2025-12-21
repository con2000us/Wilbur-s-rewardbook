'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStudentSettingsModal } from './hooks/useStudentSettingsModal'

// 全局 Modal 提供者，用於在所有頁面中監聽設定事件
export default function StudentSettingsModalProvider() {
  const router = useRouter()
  const { openModal, ModalComponent } = useStudentSettingsModal()

  // 監聽全局事件來打開設定 Modal
  useEffect(() => {
    const handleOpenSettings = (event: CustomEvent) => {
      const { studentId } = event.detail
      if (studentId) {
        openModal(studentId)
      }
    }

    window.addEventListener('openStudentSettings', handleOpenSettings as EventListener)
    
    return () => {
      window.removeEventListener('openStudentSettings', handleOpenSettings as EventListener)
    }
  }, [openModal])

  return (
    <ModalComponent 
      onSuccess={() => {
        // 重新載入頁面以顯示更新（包括頭像）
        router.refresh()
        // 強制完整重新載入以確保所有組件都更新
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }}
    />
  )
}

