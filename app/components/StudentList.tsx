'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import StudentModal from './StudentModal'
import { useStudentSettingsModal } from './hooks/useStudentSettingsModal'

interface Student {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
  display_order: number
}

interface Props {
  initialStudents: Student[]
}

export default function StudentList({ initialStudents }: Props) {
  const router = useRouter()
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const [students, setStudents] = useState(initialStudents)
  const [isReordering, setIsReordering] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
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

  // 將 hex 顏色轉換為較深的版本（用於漸變效果）
  const hexToDarker = (hex: string, factor: number = 0.7): string => {
    const normalizedHex = hex.toLowerCase().startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`
    const r = parseInt(normalizedHex.slice(1, 3), 16)
    const g = parseInt(normalizedHex.slice(3, 5), 16)
    const b = parseInt(normalizedHex.slice(5, 7), 16)
    
    const darkerR = Math.floor(r * factor)
    const darkerG = Math.floor(g * factor)
    const darkerB = Math.floor(b * factor)
    
    return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`
  }

  // 將 Tailwind 漸變類名轉換為 hex 顏色（用於向後兼容）
  const gradientToHex = (gradient: string): string => {
    const match = gradient.match(/from-(\w+)-(\d+)/)
    if (match) {
      const [, colorName, shade] = match
      const colorMap: Record<string, Record<string, string>> = {
        blue: { '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb' },
        purple: { '400': '#a78bfa', '500': '#9333ea', '600': '#7e22ce' },
        pink: { '400': '#f472b6', '500': '#ec4899', '600': '#db2777' },
        green: { '400': '#4ade80', '500': '#22c55e', '600': '#16a34a' },
        yellow: { '400': '#facc15', '500': '#eab308', '600': '#ca8a04' },
        red: { '400': '#f87171', '500': '#ef4444', '600': '#dc2626' },
        indigo: { '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5' },
        teal: { '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488' },
      }
      return colorMap[colorName]?.[shade] || '#3b82f6'
    }
    return '#3b82f6'
  }

  const parseAvatar = (avatarUrl: string | null, studentName: string) => {
    const defaultHex = '#3b82f6'
    if (!avatarUrl) {
      return { 
        emoji: studentName.charAt(0), 
        hex: defaultHex,
        gradientStyle: `linear-gradient(to bottom right, ${defaultHex}, ${hexToDarker(defaultHex)})`
      }
    }
    if (avatarUrl.startsWith('emoji:')) {
      const parts = avatarUrl.replace('emoji:', '').split('|')
      const colorPart = parts[1] || defaultHex
      // 判斷是 hex 顏色還是舊的 Tailwind 類名
      const hex = colorPart.startsWith('#') ? colorPart : gradientToHex(colorPart)
      return {
        emoji: parts[0] || studentName.charAt(0),
        hex: hex,
        gradientStyle: `linear-gradient(to bottom right, ${hex}, ${hexToDarker(hex)})`
      }
    }
    return { 
      emoji: studentName.charAt(0), 
      hex: defaultHex,
      gradientStyle: `linear-gradient(to bottom right, ${defaultHex}, ${hexToDarker(defaultHex)})`
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === index) return

    const newStudents = [...students]
    const draggedStudent = newStudents[draggedIndex]
    
    // 移除被拖曳的項目
    newStudents.splice(draggedIndex, 1)
    // 插入到新位置
    newStudents.splice(index, 0, draggedStudent)
    
    setStudents(newStudents)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSaveOrder = async () => {
    setIsSaving(true)
    
    try {
      // 準備更新數據
      const studentOrders = students.map((student, index) => ({
        id: student.id,
        display_order: index
      }))

      const response = await fetch('/api/students/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentOrders })
      })

      if (response.ok) {
        setIsReordering(false)
        // 刷新頁面以確保數據同步
        window.location.reload()
      } else {
        alert('保存失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Failed to save order:', error)
      alert('保存失敗，請稍後再試')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelReorder = () => {
    setStudents(initialStudents)
    setIsReordering(false)
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8">
      {/* 標題和按鈕 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          🎓 {t('studentsList')}
        </h2>
        
        <div className="flex gap-2">
          {/* 排序模式的保存/取消按鈕 */}
          {isReordering ? (
            <>
              <button
                onClick={handleSaveOrder}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 ${
                  isSaving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 hover:-translate-y-1 hover:shadow-lg cursor-pointer'
                }`}
              >
                <span>💾</span>
                <span>{isSaving ? tCommon('loading') : tCommon('save')}</span>
              </button>
              <button
                onClick={handleCancelReorder}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
              >
                {tCommon('cancel')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsReordering(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span>↕️</span>
              <span>{t('reorderStudents')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 排序提示 */}
      {isReordering && (
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <span>ℹ️</span>
            <span>{t('reorderHint')}</span>
          </p>
        </div>
      )}

      {/* 學生列表 */}
      {students && students.length > 0 ? (
        <div className={`grid gap-4 ${
          isReordering 
            ? 'grid-cols-1' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {students.map((student, index) => {
            const avatar = parseAvatar(student.avatar_url, student.name)

            if (isReordering) {
              // 排序模式 - 列表式拖曳
              return (
                <div
                  key={student.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 transition-all cursor-move ${
                    draggedIndex === index
                      ? 'border-purple-500 opacity-50 scale-95'
                      : 'border-gray-300 hover:border-purple-400 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* 拖曳手柄 */}
                    <div className="text-2xl text-gray-400">
                      ⋮⋮
                    </div>
                    {/* 頭像 */}
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
                      style={{ background: avatar.gradientStyle }}
                    >
                      {avatar.emoji}
                    </div>
                    {/* 學生資訊 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-800 truncate">
                        {student.name}
                      </h3>
                      {student.email && (
                        <p className="text-sm text-gray-600 truncate">{student.email}</p>
                      )}
                    </div>
                    {/* 順序編號 */}
                    <div className="text-lg font-bold text-purple-600 bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                </div>
              )
            } else {
              // 正常模式 - 卡片式顯示，保留外框動畫效果
              return (
                <div
                  key={student.id}
                  className="group relative rounded-xl border-2 border-gray-300 hover:border-purple-500 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  {/* 齒輪設定按鈕 - 右上角 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openModal(student.id)
                    }}
                    className="absolute top-2 right-2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
                    title={tCommon('settings') || '設定'}
                  >
                    <svg 
                      className="w-5 h-5 text-gray-700 hover:text-purple-600 transition-colors" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                      />
                    </svg>
                  </button>
                  
                  {/* 學生資訊區域 - 點擊進入學習記錄 */}
                  <Link
                    href={`/student/${student.id}`}
                    className="block p-5 bg-gradient-to-br from-blue-50 to-purple-50 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                        style={{ background: avatar.gradientStyle }}
                      >
                        {avatar.emoji}
                      </div>
                      <div className="w-full">
                        <h3 className="text-xl font-bold text-gray-800 mb-1 truncate">
                          {student.name}
                        </h3>
                        {student.email && (
                          <p className="text-sm text-gray-600 truncate">{student.email}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            }
          })}
          
          {/* 添加學生按鈕（僅在非排序模式下顯示） */}
          {!isReordering && (
            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="group relative rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer"
            >
              <div className="block p-5 transition-all duration-300">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 text-5xl font-bold shadow-lg group-hover:from-purple-200 group-hover:to-purple-300 group-hover:text-purple-600 transition-all duration-300">
                    +
                  </div>
                  <div className="w-full">
                    <h3 className="text-xl font-bold text-gray-600 mb-1 group-hover:text-purple-600 transition-colors duration-300">
                      {t('addStudent')}
                    </h3>
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">😢 {t('noStudents')}</p>
        </div>
      )}

      {/* 新增學生 Modal */}
      <StudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSuccess={() => {
          // 重新載入頁面以顯示新學生和正確的背景顏色
          window.location.reload()
        }}
      />

      {/* 學生設定 Modal - 共享組件 */}
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
    </div>
  )
}


