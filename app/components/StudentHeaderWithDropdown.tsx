'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

interface Student {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  studentId: string
  studentName: string
  studentAvatar: { emoji: string; gradientStyle: string }
  recordsTitle: string
  allStudents: Student[]
  basePath?: string
  currentPage?: 'records' | 'transactions' | 'subjects' | 'settings'
}

export default function StudentHeaderWithDropdown({ 
  studentId,
  studentName,
  studentAvatar,
  recordsTitle,
  allStudents,
  basePath = '',
  currentPage = 'records'
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('common')
  const tStudent = useTranslations('student')
  const tTransaction = useTranslations('transaction')
  const tHome = useTranslations('home')
  const tNav = useTranslations('nav')
  const locale = useLocale()

  // 過濾掉當前學生
  const otherStudents = allStudents.filter(s => s.id !== studentId)

  // 根據文字長度動態計算下拉列表寬度
  const dropdownWidth = useMemo(() => {
    // 獲取所有文字
    const recordsText = tStudent('recordsTitle')
    const passbookText = tTransaction('passbook')
    const subjectsText = tHome('features.subjects.title')
    const settingsText = tNav('settings')

    // 估算每個字符的寬度（考慮字體大小 text-sm，中文字符約 10px，英文字符約 6.5px）
    // 但英文文字通常更長，所以需要更寬的估算
    const charWidth = locale === 'zh-TW' ? 10 : 7
    const iconWidth = 20 // 圖標寬度（emoji）
    const gap = 4 // gap-1 = 4px（圖標和文字之間）
    const separatorGap = 8 // gap-2 = 8px（連結之間的間距）
    const separatorWidth = 8 // "|" 寬度
    const padding = 32 // px-4 * 2 = 32px（左右內邊距）
    const avatarWidth = 64 // 頭像寬度 w-16
    const avatarGap = 12 // gap-3 = 12px（頭像和文字之間的間距）

    // 計算第一行寬度（學習記錄 | 獎金存摺）
    const row1Left = recordsText.length * charWidth + iconWidth + gap
    const row1Right = passbookText.length * charWidth + iconWidth + gap
    const row1Width = row1Left + separatorGap + separatorWidth + separatorGap + row1Right

    // 計算第二行寬度（科目管理 | 設定）
    const row2Left = subjectsText.length * charWidth + iconWidth + gap
    const row2Right = settingsText.length * charWidth + iconWidth + gap
    const row2Width = row2Left + separatorGap + separatorWidth + separatorGap + row2Right

    // 取較長的一行
    const maxRowWidth = Math.max(row1Width, row2Width)

    // 總寬度 = 頭像 + 間距 + 文字區域 + 內邊距 + 箭頭寬度 + 間距，再加一些餘量
    const arrowWidth = 24 // 箭頭圖示寬度 w-6
    const arrowGap = 16 // gap-4 = 16px（文字和箭頭之間的間距）
    const totalWidth = avatarWidth + avatarGap + maxRowWidth + padding + arrowWidth + arrowGap + 40

    // 確保最小寬度，並向上取整到 10px
    return Math.max(418, Math.ceil(totalWidth / 10) * 10)
  }, [tStudent, tTransaction, tHome, tNav, locale])

  // 點擊外部關閉下拉選單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const handleSwitchStudent = (targetStudentId: string) => {
    router.push(`/student/${targetStudentId}${basePath}`)
    setIsOpen(false)
  }

  const handleOpenSettings = (e: React.MouseEvent, targetStudentId: string) => {
    e.preventDefault()
    e.stopPropagation()
    // 觸發自定義事件來打開設定 Modal
    window.dispatchEvent(new CustomEvent('openStudentSettings', { 
      detail: { studentId: targetStudentId } 
    }))
  }

  // 即使只有一個學生，也顯示下拉按鈕，以便訪問各個功能頁面和返回首頁

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-4">
        {/* 學生頭像和名稱 */}
        <button
          onClick={(e) => handleOpenSettings(e, studentId)}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-[2.35rem] shadow-2xl ring-4 ring-white/30 flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
            style={{ 
              background: studentAvatar.gradientStyle,
              filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))' 
            }}
          >
            {studentAvatar.emoji}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white break-words group-hover:text-purple-200 transition-colors duration-200" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 0, 0, 0.3)' }}>
              {studentName}
            </h1>
          </div>
        </button>
        
        {/* 學習記錄文字和下拉按鈕 */}
        <div className="flex items-center gap-2">
          <p className="text-purple-300 text-base md:text-xl font-semibold whitespace-nowrap" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)' }}>
            {recordsTitle}
          </p>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm cursor-pointer"
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
        </div>
      </div>

      {/* 下拉選單 - 與學生頭像完美對齊 */}
      {isOpen && (
        <div 
          className="absolute left-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-white/30 z-50 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar-corner]:bg-transparent"
          style={{ 
            top: 'calc(100% + 0.5rem)',
            minWidth: `${dropdownWidth}px`,
            scrollbarColor: 'rgb(209 213 219) transparent',
            scrollbarWidth: 'thin'
          }}
        >
          {/* 當前學生 - 顯示學習記錄與設定 */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-100/80 to-blue-100/80 border-b-2 border-purple-200">
            <div className="flex items-center gap-3">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-[2.35rem] shadow-2xl ring-4 ring-white/30 flex-shrink-0"
                style={{ background: studentAvatar.gradientStyle }}
              >
                {studentAvatar.emoji}
              </div>
              <div className="flex-1 text-left">
                <p className="text-2xl font-bold text-gray-800 mb-1">
                  {studentName}
                </p>
                {/* 第一行：學習記錄和獎金存摺連結 */}
                <div className="text-sm flex items-center gap-2">
                  {currentPage === 'records' ? (
                    <span className="flex items-center gap-1 text-blue-700 font-semibold min-w-[90px]">
                      <span className="text-blue-600">📊</span>
                      {tStudent('recordsTitle')}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/student/${studentId}`)
                        setIsOpen(false)
                      }}
                      className="flex items-center gap-1 text-gray-500 hover:text-blue-700 transition-colors cursor-pointer min-w-[90px]"
                    >
                      <span className="text-blue-600">📊</span>
                      {tStudent('recordsTitle')}
                    </button>
                  )}
                  <span className="text-gray-400">|</span>
                  {currentPage === 'transactions' ? (
                    <span className="flex items-center gap-1 text-green-700 font-semibold min-w-[90px]">
                      <span className="text-green-600">💰</span>
                      {tTransaction('passbook')}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/student/${studentId}/transactions`)
                        setIsOpen(false)
                      }}
                      className="flex items-center gap-1 text-gray-500 hover:text-green-700 transition-colors cursor-pointer min-w-[90px]"
                    >
                      <span className="text-green-600">💰</span>
                      {tTransaction('passbook')}
                    </button>
                  )}
                </div>
                {/* 第二行：科目管理和設定連結 */}
                <div className="text-sm flex items-center gap-2 mt-1">
                  {currentPage === 'subjects' ? (
                    <span className="flex items-center gap-1 text-orange-700 font-semibold min-w-[90px]">
                      <span className="text-orange-600">📚</span>
                      {tHome('features.subjects.title')}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/student/${studentId}/subjects`)
                        setIsOpen(false)
                      }}
                      className="flex items-center gap-1 text-gray-500 hover:text-orange-700 transition-colors cursor-pointer min-w-[90px]"
                    >
                      <span className="text-orange-600">📚</span>
                      {tHome('features.subjects.title')}
                    </button>
                  )}
                  <span className="text-gray-400">|</span>
                  {currentPage === 'settings' ? (
                    <span className="flex items-center gap-1 text-purple-700 font-semibold min-w-[90px]">
                      <span className="text-purple-600">⚙️</span>
                      {tNav('settings')}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenSettings(e, studentId)
                        setIsOpen(false)
                      }}
                      className="flex items-center gap-1 text-gray-500 hover:text-purple-700 transition-colors cursor-pointer min-w-[90px]"
                    >
                      <span className="text-purple-600">⚙️</span>
                      {tNav('settings')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 返回首頁選項 - 當只有一個學生時特別有用 */}
          {otherStudents.length === 0 && (
            <div className="px-4 py-3 border-t-2 border-gray-200">
              <button
                onClick={() => {
                  router.push('/')
                  setIsOpen(false)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group rounded-lg"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-2xl shadow-lg flex-shrink-0 group-hover:scale-105 transition-all duration-200">
                  🏠
                </div>
                <div className="flex-1 text-left">
                  <p className="text-lg font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
                    {tHome('title') || '返回首頁'}
                  </p>
                </div>
                <svg 
                  className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          
          {/* 其他學生列表 - hover 時顯示學習記錄文字 */}
          {otherStudents.length > 0 && (
            <div className="py-2">
              {otherStudents.map((student) => {
              const avatar = parseAvatar(student.avatar_url, student.name)
              
              return (
                <div
                  key={student.id}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200 group cursor-pointer"
                  onClick={() => handleSwitchStudent(student.id)}
                >
                  {/* 學生頭像 */}
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-[2.35rem] shadow-lg ring-2 ring-gray-200 group-hover:ring-purple-300 flex-shrink-0 group-hover:scale-105 transition-all duration-200"
                    style={{ background: avatar.gradientStyle }}
                  >
                    {avatar.emoji}
                  </div>
                  
                  {/* 學生名稱和學習記錄文字 */}
                  <div className="flex-1 text-left flex items-center gap-4">
                    <div className="relative h-20 flex items-center pt-10 flex-1 min-w-0">
                      <div className="transition-transform duration-200 group-hover:-translate-y-6 w-full">
                        <p className="text-2xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                          {student.name}
                        </p>
                        {/* hover 時顯示第一行：學習記錄和獎金存摺連結 */}
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSwitchStudent(student.id)
                            }}
                            className="flex items-center gap-1 hover:text-blue-700 transition-colors cursor-pointer min-w-[90px]"
                          >
                            <span className="text-blue-600">📊</span>
                            {tStudent('recordsTitle')}
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/student/${student.id}/transactions`)
                              setIsOpen(false)
                            }}
                            className="flex items-center gap-1 hover:text-green-700 transition-colors cursor-pointer min-w-[90px]"
                          >
                            <span className="text-green-600">💰</span>
                            {tTransaction('passbook')}
                          </button>
                        </div>
                        {/* hover 時顯示第二行：科目管理和設定連結 */}
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/student/${student.id}/subjects`)
                              setIsOpen(false)
                            }}
                            className="flex items-center gap-1 hover:text-orange-700 transition-colors cursor-pointer min-w-[90px]"
                          >
                            <span className="text-orange-600">📚</span>
                            {tHome('features.subjects.title')}
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenSettings(e, student.id)
                              setIsOpen(false)
                            }}
                            className="flex items-center gap-1 hover:text-purple-700 transition-colors cursor-pointer min-w-[90px]"
                          >
                            <span className="text-purple-600">⚙️</span>
                            {tNav('settings')}
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* 箭頭圖示 */}
                    <svg
                      className="w-6 h-6 text-gray-400 group-hover:translate-x-1 transition-transform duration-200 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


