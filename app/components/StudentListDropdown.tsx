'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Student {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  currentStudentId: string
  currentStudentName: string
  currentStudentAvatar: { emoji: string; gradient: string }
  allStudents: Student[]
  basePath?: string
}

export default function StudentListDropdown({ 
  currentStudentId, 
  currentStudentName,
  currentStudentAvatar,
  allStudents, 
  basePath = '' 
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('common')

  // 過濾掉當前學生
  const otherStudents = allStudents.filter(s => s.id !== currentStudentId)

  // 點擊外部關閉下拉選單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
        gradientStyle: `linear-gradient(to bottom right, ${hex}, ${hexToDarker(hex)})`
      }
    }
    return { 
      emoji: studentName.charAt(0), 
      gradientStyle: `linear-gradient(to bottom right, ${defaultHex}, ${hexToDarker(defaultHex)})`
    }
  }

  const handleSwitchStudent = (studentId: string) => {
    router.push(`/student/${studentId}${basePath}`)
    setIsOpen(false)
  }

  if (otherStudents.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 下拉按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm"
        style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' }}
        title={t('switchStudent')}
      >
        <svg 
          className={`w-5 h-5 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 - 與學生頭像左對齊 */}
      {isOpen && (
        <div 
          className="absolute top-full bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-white/30 z-50 max-h-96 overflow-y-auto"
          style={{ 
            right: '100%',
            marginRight: '1rem',
            marginTop: '0.5rem',
            width: 'max-content',
            minWidth: '380px'
          }}
        >
          {/* 當前學生 - 保持與主顯示一致 */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-100/80 to-blue-100/80 border-b-2 border-purple-200">
            <div className="flex items-center gap-3">
              <div 
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${currentStudentAvatar.gradient} flex items-center justify-center text-[2.35rem] shadow-2xl ring-4 ring-white/30 flex-shrink-0`}
                style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))' }}
              >
                {currentStudentAvatar.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800">{currentStudentName}</h3>
                <p className="text-xs text-purple-600 font-semibold">{t('switchToStudent')}</p>
              </div>
            </div>
          </div>
          
          {/* 其他學生列表 */}
          <div className="py-2">
            {otherStudents.map((student) => {
              const avatar = parseAvatar(student.avatar_url, student.name)
              
              return (
                <button
                  key={student.id}
                  onClick={() => handleSwitchStudent(student.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200 group"
                >
                  {/* 學生頭像 - 與主顯示一致 */}
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-[2.35rem] shadow-lg ring-2 ring-gray-200 group-hover:ring-purple-300 flex-shrink-0 group-hover:scale-105 transition-all duration-200"
                    style={{ background: avatar.gradientStyle }}
                  >
                    {avatar.emoji}
                  </div>
                  
                  {/* 學生名稱 - 與主顯示一致 */}
                  <div className="flex-1 text-left">
                    <p className="text-2xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
                      {student.name}
                    </p>
                  </div>

                  {/* 箭頭圖示 */}
                  <svg 
                    className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


