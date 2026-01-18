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
  isOpen?: boolean
  setIsOpen?: (value: boolean) => void
  showHeader?: boolean
}

export default function StudentHeaderWithDropdown({ 
  studentId,
  studentName,
  studentAvatar,
  recordsTitle,
  allStudents,
  basePath = '',
  currentPage = 'records',
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  showHeader = true
}: Props) {
  // 科目設定頁面預設展開學生列表
  const [internalIsOpen, setInternalIsOpen] = useState(currentPage === 'subjects')
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen
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
      const target = event.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        // 檢查是否點擊了切換學生按鈕容器
        const buttonContainer = document.getElementById('student-switch-button-container')
        if (buttonContainer && buttonContainer.contains(target)) {
          // 如果點擊了按鈕容器，不關閉下拉選單（讓按鈕的 onClick 處理）
          return
        }
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // 使用 setTimeout 確保在按鈕的 onClick 之後執行
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, setIsOpen])

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
    <div className="relative w-full min-w-0" ref={containerRef} style={{ opacity: 0.8 }}>
      {showHeader && (
        <div className="flex items-center gap-5 w-full min-w-0">
          {/* 學生頭像 - 採用 code.html 的設計 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-300 to-primary rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <button
              onClick={(e) => handleOpenSettings(e, studentId)}
              className="relative w-16 h-16 rounded-full bg-white/40 flex items-center justify-center border border-white/60 cursor-pointer"
            >
            <span className="text-3xl leading-none" style={{ transform: 'translateY(-3px)' }}>
              {studentAvatar.emoji}
            </span>
            </button>
          </div>
          
          {/* 學生名稱和學習記錄 */}
          <div className="min-w-0 flex-1 relative">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1 truncate">
                {studentName}
              </h1>
              {/* 返回首頁按鈕 - 只在手機寬度下顯示 */}
              <button 
                onClick={() => router.push('/')}
                className="md:hidden bg-primary hover:bg-opacity-90 text-white p-2 rounded-full shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center w-10 h-10 hover:scale-105 active:scale-95 flex-shrink-0 ml-2"
              >
                <span className="material-icons-outlined text-lg">home</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-primary truncate">{recordsTitle}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


