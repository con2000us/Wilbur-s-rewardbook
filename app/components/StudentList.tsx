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
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hasReordered, setHasReordered] = useState(false)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [circleConfigs, setCircleConfigs] = useState<Record<string, Array<{ cx: number; cy: number; r: number }>>>({})
  const { openModal, ModalComponent } = useStudentSettingsModal()

  // 簡單的偽隨機數生成器（使用種子）
  const seededRandom = (seed: number) => {
    let value = seed
    return () => {
      value = (value * 9301 + 49297) % 233280
      return value / 233280
    }
  }

  // 檢查兩個圓圈是否重疊
  const circlesOverlap = (circle1: { cx: number; cy: number; r: number }, circle2: { cx: number; cy: number; r: number }) => {
    const dx = circle1.cx - circle2.cx
    const dy = circle1.cy - circle2.cy
    const distance = Math.sqrt(dx * dx + dy * dy)
    // 如果兩個圓的距離小於它們半徑之和的 80%，則認為重疊
    return distance < (circle1.r + circle2.r) * 0.8
  }

  // 生成隨機的裝飾圓圈配置
  const generateDecorationCircles = (studentId: string) => {
    // 使用學生 ID 的 hash + 時間戳作為種子，讓每次 reload 都不同
    let hash = 0
    for (let i = 0; i < studentId.length; i++) {
      hash = ((hash << 5) - hash) + studentId.charCodeAt(i)
      hash = hash & hash
    }
    // 加入時間戳，讓每次 reload 都不同
    const timeSeed = Date.now()
    const random = seededRandom(Math.abs(hash) + timeSeed)
    
    // 生成 4-7 個圓圈
    const count = Math.floor(random() * 4) + 4
    const circles: Array<{ cx: number; cy: number; r: number }> = []
    
    for (let i = 0; i < count; i++) {
      let cx: number, cy: number, r: number
      let attempts = 0
      const maxAttempts = 50
      
      do {
        // 隨機位置（留出邊距避免超出）
        cx = random() * 340 + 20
        cy = random() * 340 + 20
        // 隨機大小（1px 到 80px）
        r = Math.max(1, random() * 79 + 1)
        
        attempts++
        
        // 檢查是否與已存在的圓圈重疊
        const overlaps = circles.some(existingCircle => circlesOverlap({ cx, cy, r }, existingCircle))
        
        // 如果重疊，有 75% 的機率重新生成位置
        if (overlaps && random() < 0.75 && attempts < maxAttempts) {
          continue // 重新生成
        }
        
        // 如果不重疊，或者已經嘗試太多次，或者 25% 的機率接受重疊，則跳出循環
        break
      } while (attempts < maxAttempts)
      
      circles.push({ cx, cy, r })
    }
    
    return circles
  }

  // 在客戶端生成 circle 配置（避免 hydration 錯誤）
  useEffect(() => {
    const configs: Record<string, Array<{ cx: number; cy: number; r: number }>> = {}
    
    // 為每個學生生成 circle 配置
    students.forEach(student => {
      configs[student.id] = generateDecorationCircles(student.id)
    })
    
    // 為添加學生按鈕生成配置
    configs['add-student-button'] = generateDecorationCircles('add-student-button')
    configs['empty-student-button'] = generateDecorationCircles('empty-student-button')
    
    setCircleConfigs(configs)
  }, [students])

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
    setHasReordered(true)
    document.body.style.cursor = 'grabbing'
    
    // 添加動畫類到所有卡片
    const cards = document.querySelectorAll('[data-student-card]')
    cards.forEach(card => {
      card.classList.add('dragging')
    })
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
    document.body.style.cursor = 'default'

    // 移除動畫類
    const cards = document.querySelectorAll('[data-student-card]')
    cards.forEach(card => {
      card.classList.remove('dragging')
    })
  }

  const handleCancelReorder = () => {
    setStudents(initialStudents)
    setHasReordered(false)
    document.body.style.cursor = 'default'
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
        setHasReordered(false)
        document.body.style.cursor = 'default'
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

  return (
    <div className="bg-white/30 backdrop-blur-sm rounded-2xl shadow-2xl pt-3 pl-6 pr-6 pb-6 mb-8 border-2 border-white/30 min-h-[200px]">
      {/* 標題和按鈕 */}
      <div className="flex justify-between items-center mb-6 min-h-[48px]">
        <h2 className="text-3xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
          🎓 {t('studentsList')}
        </h2>

        <div className="flex gap-2">
          {hasReordered && (
            <>
              <button
                onClick={handleSaveOrder}
                disabled={isSaving}
                className="h-10 px-4 py-2 rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)] cursor-pointer hover:-translate-y-1"
                style={{
                  background: isSaving
                    ? '#d1d5db'
                    : 'linear-gradient(to bottom right, #10b981, #059669, #047857)'
                }}
              >
                <span>💾</span>
                <span>{isSaving ? tCommon('loading') : tCommon('save')}</span>
              </button>
              <button
                onClick={handleCancelReorder}
                disabled={isSaving}
                className="h-10 px-4 py-2 rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)] cursor-pointer hover:-translate-y-1"
                style={{
                  background: isSaving
                    ? '#d1d5db'
                    : 'rgba(255, 255, 255, 0.25)'
                }}
              >
                <span>❌</span>
                <span>{tCommon('cancel')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 學生列表 */}
      {students && students.length > 0 ? (
        <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center ${draggedIndex !== null ? 'grid-transition' : ''} -mt-2`}>
          {students.map((student, index) => {
            const avatar = parseAvatar(student.avatar_url, student.name)

            // 根據學生顏色創建漸變背景（只改變明暗，保持色相和彩度）
            const darkerHex = hexToDarker(avatar.hex)
            const darkestHex = hexToDarker(avatar.hex, 0.5) // 更暗的版本
            const cardGradient = `linear-gradient(to bottom right, ${avatar.hex}, ${darkerHex}, ${darkestHex})`
            
            // 使用已生成的裝飾圓圈配置（在客戶端生成，避免 hydration 錯誤）
            const decorationCircles = circleConfigs[student.id] || []
            
            return (
              <div
                key={student.id}
                data-student-card
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative w-full max-w-[380px] aspect-square overflow-hidden rounded-xl card-shadow group/card shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)] cursor-grab active:cursor-grabbing ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                }`}
                style={{ background: cardGradient }}
              >
                {/* 拖曳圖標 - 始終顯示在左上角 */}
                <div className="absolute top-2 left-3 text-2xl text-white/80 z-20 pointer-events-none hover:text-white transition-colors drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)]">
                  ⋮⋮
                </div>
                
            {/* 裝飾性背景圓圈 */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  viewBox="0 0 380 380"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" id={`decorationGradient-${student.id}`}>
                      <stop offset="0%" style={{ stopColor: `${avatar.hex}`, stopOpacity: '0' }} />
                      <stop offset="50%" style={{ stopColor: `${avatar.hex}`, stopOpacity: '0.1' }} />
                      <stop offset="100%" style={{ stopColor: `${avatar.hex}`, stopOpacity: '0.3' }} />
                    </radialGradient>
                  </defs>
                  {decorationCircles.map((circle, idx) => (
                    <circle
                      key={idx}
                      cx={circle.cx}
                      cy={circle.cy}
                      r={circle.r}
                      fill={`url(#decorationGradient-${student.id})`}
                    />
                  ))}
                </svg>
                
                <div className="relative z-10 flex flex-col items-center justify-between pt-[30px] pb-6 px-[18px] h-full">
                  {/* 個人資料區域 */}
                  <div className="flex flex-col items-center gap-3 w-full cursor-pointer flex-shrink-0">
                    {/* 頭像 - 點擊連結到設定頁面 */}
                    <Link
                      href={`/students/${student.id}/edit`}
                      className="relative group/avatar"
                    >
                      <div 
                        className="flex h-24 w-24 items-center justify-center rounded-full shadow-xl ring-4 ring-white/20 transition-transform duration-300 group-hover/avatar:scale-105"
                        style={{ background: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {avatar.emoji && (
                          <span className="text-5xl">{avatar.emoji}</span>
                        )}
                      </div>
                      {/* 設定按鈕 - hover時在圖示右下方顯示 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          router.push(`/students/${student.id}/edit`)
                        }}
                        aria-label="Settings"
                        className="absolute -bottom-2 -right-2 w-8 h-8 flex items-center justify-center bg-white/60 hover:bg-white/70 rounded-full shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 cursor-pointer z-20"
                        title={tCommon('settings') || '設定'}
                      >
                        <span className="material-symbols-outlined text-gray-700 text-lg">
                          settings
                        </span>
                      </button>
                    </Link>
                    
                    {/* 學生資訊 - 點擊連結到學習記錄頁面 */}
                    <Link
                      href={`/student/${student.id}`}
                      className="flex flex-col items-center justify-center text-center gap-1 h-16 w-full"
                    >
                      <h1 className="text-white text-2xl font-bold leading-tight tracking-tight drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)]">
                        {student.name}
                      </h1>
                      {student.email ? (
                        <p className="text-blue-50/80 text-sm font-normal tracking-wide truncate max-w-full px-2 drop-shadow-[0_3px_6px_rgba(0,0,0,0.75)]">
                          {student.email}
                        </p>
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </Link>
                  </div>
                  
                  {/* 工具欄 / 導航區域 */}
                  <div className="w-full flex-shrink-0">
                    <div className="glass-nav flex justify-between items-center rounded-full px-8 py-4 shadow-lg">
                      {/* 評量按鈕 */}
                      <Link
                        href={`/student/${student.id}`}
                        aria-label="Assessments"
                        className="group flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer"
                        title="評量"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span 
                          className="material-symbols-outlined text-white transition-colors drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)] group-hover:text-[#30e87a] group-hover:drop-shadow-[0_0_8px_rgba(48,232,122,0.5)]"
                          style={{ fontSize: '2.34rem' }}
                        >
                          assignment
                        </span>
                      </Link>
                      
                      {/* 科目設定按鈕 */}
                      <Link
                        href={`/student/${student.id}/subjects`}
                        aria-label="Subjects"
                        className="group flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer"
                        title="科目設定"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span 
                          className="material-symbols-outlined text-white transition-colors drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)] group-hover:text-[#30e87a] group-hover:drop-shadow-[0_0_8px_rgba(48,232,122,0.5)]"
                          style={{ fontSize: '2.34rem' }}
                        >
                          menu_book
                        </span>
                      </Link>
                      
                      {/* 交易/獎金存折按鈕 */}
                      <Link
                        href={`/student/${student.id}/transactions`}
                        aria-label="Transactions"
                        className="group flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer"
                        title="獎金存折"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span 
                          className="material-symbols-outlined text-white transition-colors drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)] group-hover:text-[#30e87a] group-hover:drop-shadow-[0_0_8px_rgba(48,232,122,0.5)]"
                          style={{ fontSize: '2.34rem' }}
                        >
                          attach_money
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* 添加學生按鈕（拖曳時顯示半透明但無法拖曳） */}
          {(() => {
            const addStudentCircles = circleConfigs['add-student-button'] || []
            return (
              <button
                onClick={() => !hasReordered && setIsAddStudentModalOpen(true)}
                disabled={hasReordered}
                className={`relative w-full max-w-[380px] aspect-square overflow-hidden rounded-xl card-shadow add-student-bg group/card hover:scale-[1.01] cursor-pointer add-student-dashed-border ${
                  hasReordered ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
                }`}
              >
                  {/* 裝飾性背景圓圈 */}
                  <svg
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    viewBox="0 0 380 380"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" id="decorationGradient-add">
                        <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.1)', stopOpacity: '0' }} />
                        <stop offset="50%" style={{ stopColor: 'rgba(255,255,255,0.1)', stopOpacity: '0.15' }} />
                        <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.2)', stopOpacity: '0.4' }} />
                      </radialGradient>
                    </defs>
                    {addStudentCircles.map((circle, idx) => (
                      <circle
                        key={idx}
                        cx={circle.cx}
                        cy={circle.cy}
                        r={circle.r}
                        fill="url(#decorationGradient-add)"
                      />
                    ))}
                  </svg>
                  
                  <div className="relative z-10 flex flex-col items-center justify-between pt-[30px] pb-6 px-[18px] h-full">
                {/* 個人資料區域 */}
                <div className="flex flex-col items-center gap-3 w-full flex-shrink-0">
                  {/* 頭像 */}
                  <div className="relative group">
                    <div 
                      className="flex h-24 w-24 items-center justify-center rounded-full shadow-xl ring-4 ring-white/20 transition-transform duration-300 group-hover:scale-105"
                      style={{ background: 'rgba(255, 255, 255, 0.25)' }}
                    >
                      <span className="text-5xl text-white font-bold">+</span>
                    </div>
                  </div>
                  
                  {/* 學生資訊 - 固定高度確保對齊 */}
                  <div className="flex flex-col items-center justify-center text-center gap-1 h-16 w-full">
                    <h1 className="text-white text-2xl font-bold leading-tight tracking-tight drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)]">
                      {t('addStudent')}
                    </h1>
                    <div className="h-4"></div>
                  </div>
                </div>
                
                {/* 工具欄 / 導航區域 */}
                <div className="w-full flex-shrink-0">
                  <div className="glass-nav flex justify-center items-center rounded-full px-6 py-3 shadow-lg">
                    <span className="text-white text-base font-medium drop-shadow-[0_3px_6px_rgba(0,0,0,0.75)]">{t('clickToAddNewStudent')}</span>
                  </div>
                </div>
              </div>
              </button>
            )
          })()}
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
          {/* 當沒有學生時，添加學生按鈕使用與學生卡片相同的位置和大小 */}
          {(() => {
            const emptyStudentCircles = circleConfigs['empty-student-button'] || []
            return (
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="relative w-full max-w-[380px] aspect-square overflow-hidden rounded-xl card-shadow add-student-bg group/card hover:scale-[1.01] cursor-pointer add-student-dashed-border"
              >
                {/* 裝飾性背景圓圈 */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  viewBox="0 0 380 380"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" id="decorationGradient-empty">
                      <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.1)', stopOpacity: '0' }} />
                      <stop offset="50%" style={{ stopColor: 'rgba(255,255,255,0.1)', stopOpacity: '0.15' }} />
                      <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.2)', stopOpacity: '0.4' }} />
                    </radialGradient>
                  </defs>
                  {emptyStudentCircles.map((circle, idx) => (
                    <circle
                      key={idx}
                      cx={circle.cx}
                      cy={circle.cy}
                      r={circle.r}
                      fill="url(#decorationGradient-empty)"
                    />
                  ))}
                </svg>
                
                <div className="relative z-10 flex flex-col items-center justify-between pt-[30px] pb-6 px-[18px] h-full">
              {/* 個人資料區域 */}
              <div className="flex flex-col items-center gap-3 w-full flex-shrink-0">
                {/* 頭像 */}
                <div className="relative group">
                  <div 
                    className="flex h-24 w-24 items-center justify-center rounded-full shadow-xl ring-4 ring-white/20 transition-transform duration-300 group-hover:scale-105"
                    style={{ background: 'rgba(255, 255, 255, 0.25)' }}
                  >
                    <span className="material-symbols-outlined text-5xl text-gray-400">add</span>
                  </div>
                </div>
                
                {/* 學生資訊 - 固定高度確保對齊 */}
                <div className="flex flex-col items-center justify-center text-center gap-1 h-16 w-full">
                  <h1 className="text-white text-2xl font-bold leading-tight tracking-tight drop-shadow-[0_4.5px_9px_rgba(0,0,0,0.75)]">
                    {t('addStudent')}
                  </h1>
                  <div className="h-4"></div>
                </div>
              </div>
              
              {/* 工具欄 / 導航區域 */}
              <div className="w-full flex-shrink-0">
                <div className="glass-nav flex justify-center items-center rounded-full px-6 py-3 shadow-lg">
                  <span className="text-white text-base font-medium drop-shadow-[0_3px_6px_rgba(0,0,0,0.75)]">{t('clickToAddNewStudent')}</span>
                </div>
              </div>
            </div>
          </button>
            )
          })()}
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
