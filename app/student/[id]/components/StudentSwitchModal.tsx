'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface Student {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  currentStudentId: string
  allStudents: Student[]
}

type HoverAction = 'records' | 'transactions' | 'subjects' | 'settings' | null

export default function StudentSwitchModal({ 
  isOpen, 
  onClose, 
  currentStudentId, 
  allStudents 
}: Props) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('common')
  const tStudent = useTranslations('student')
  const tTransaction = useTranslations('transaction')
  const tHome = useTranslations('home')
  const tNav = useTranslations('nav')
  const locale = useLocale()

  // 追蹤每個學生的 hover 狀態
  const [hoveredActions, setHoveredActions] = useState<Record<string, HoverAction>>({})
  const [hoveringHomeSettings, setHoveringHomeSettings] = useState(false)

  const getActionText = (action: HoverAction) => {
    switch (action) {
      case 'records':
        return tStudent('recordsTitle')
      case 'transactions':
        return tTransaction('passbook')
      case 'subjects':
        return tHome('features.subjects.title')
      case 'settings':
        return tNav('settings')
      default:
        return tStudent('recordsTitle')
    }
  }

  // 移除點擊外部關閉的邏輯
  // 現在只有點擊「快速導覽」按鈕本身才會切換選單狀態

  // 按 ESC 鍵關閉下拉選單
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => {
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [isOpen, onClose])

  // 將 hex 顏色轉換為較深的版本
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

  // 將 Tailwind 漸變類名轉換為 hex 顏色
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
    router.push(`/student/${targetStudentId}`)
    // 不關閉列表，讓用戶可以繼續操作
  }

  const handleSwitchWithAction = (targetStudentId: string, page: string) => {
    if (page === 'records') {
      router.push(`/student/${targetStudentId}`)
    } else if (page === 'transactions') {
      router.push(`/student/${targetStudentId}/transactions`)
    } else if (page === 'subjects') {
      router.push(`/student/${targetStudentId}/subjects`)
    } else if (page === 'settings') {
      // 觸發自定義事件來打開設定 Modal
      window.dispatchEvent(new CustomEvent('openStudentSettings', { 
        detail: { studentId: targetStudentId } 
      }))
    }
    // 不關閉列表，讓用戶可以繼續操作
  }

  const handleOpenSettings = (e: React.MouseEvent, studentId: string) => {
    e.preventDefault()
    e.stopPropagation()
    // 觸發自定義事件來打開設定 Modal
    window.dispatchEvent(new CustomEvent('openStudentSettings', { 
      detail: { studentId } 
    }))
    // 不關閉列表，讓用戶可以繼續操作
  }

  const handleQuickNav = (page: string) => {
    if (page === 'records') {
      router.push(`/student/${currentStudentId}`)
    } else if (page === 'transactions') {
      router.push(`/student/${currentStudentId}/transactions`)
    } else if (page === 'subjects') {
      router.push(`/student/${currentStudentId}/subjects`)
    } else if (page === 'settings') {
      // 觸發自定義事件來打開設定 Modal
      window.dispatchEvent(new CustomEvent('openStudentSettings', { 
        detail: { studentId: currentStudentId } 
      }))
    }
    // 不關閉列表，讓用戶可以繼續操作
  }

  // 過濾掉當前學生
  const otherStudents = allStudents.filter(s => s.id !== currentStudentId)

  return (
    <div
      ref={dropdownRef}
      className="relative w-full min-w-0"
    >
      {/* 學生列表 - 無外層包裝，直接向下展開，有展開/收起動畫 */}
      {/* 高度設定位置：下方 max-h-[600px] 可調整下拉選單的最大高度 */}
      <div
        className={
          'w-full overflow-x-hidden mb-[5px] ' +
          (isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none')
        }
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
          scrollbarColor: 'rgb(209 213 219) transparent',
          scrollbarWidth: 'thin',
          overflowY: isOpen ? 'auto' : 'hidden',
          transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out'
        }}
      >
        {/* 快速導覽按鈕 - 學習記錄、獎金存摺、科目管理、設定 */}
        <div className="mb-4">
          {/* 學習記錄 */}
          <button
            onClick={() => handleQuickNav('records')}
            className="w-full flex items-center justify-between p-3.5 transition-all duration-300 cursor-pointer group hover:translate-y-[-4px] quick-nav-button"
          >
            <div className="flex items-center gap-4">
              <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 transition-colors">
                <span className="material-symbols-outlined text-lg">assessment</span>
              </div>
              <span className="text-base font-medium transition-colors quick-nav-text" style={{ color: '#1f2937' }}>
                {tStudent('recordsTitle')}
              </span>
            </div>
            <span className="material-symbols-outlined transition-all group-hover:translate-x-1" style={{ color: '#94a3b8' }}>chevron_right</span>
          </button>

          {/* 分隔線 */}
          <div className="h-[0.5px] mx-4" style={{ backgroundColor: '#e2e8f0' }}></div>

          {/* 獎金存摺 */}
          <button
            onClick={() => handleQuickNav('transactions')}
            className="w-full flex items-center justify-between p-4 transition-all duration-300 cursor-pointer group hover:translate-y-[-4px] quick-nav-button"
          >
            <div className="flex items-center gap-4">
              <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 transition-colors">
                <span className="material-symbols-outlined text-lg">attach_money</span>
              </div>
              <span className="text-base font-medium transition-colors quick-nav-text" style={{ color: '#1f2937' }}>
                {tTransaction('passbook')}
              </span>
            </div>
            <span className="material-symbols-outlined transition-all group-hover:translate-x-1" style={{ color: '#94a3b8' }}>chevron_right</span>
          </button>

          {/* 分隔線 */}
          <div className="h-[0.5px] mx-4" style={{ backgroundColor: '#e2e8f0' }}></div>

          {/* 科目管理 */}
          <button
            onClick={() => handleQuickNav('subjects')}
            className="w-full flex items-center justify-between p-3.5 transition-all duration-300 cursor-pointer group hover:translate-y-[-4px] quick-nav-button"
          >
            <div className="flex items-center gap-4">
              <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-300 transition-colors">
                <span className="material-symbols-outlined text-lg">menu_book</span>
              </div>
              <span className="text-base font-medium transition-colors quick-nav-text" style={{ color: '#1f2937' }}>
                {tHome('features.subjects.title')}
              </span>
            </div>
            <span className="material-symbols-outlined transition-all group-hover:translate-x-1" style={{ color: '#94a3b8' }}>chevron_right</span>
          </button>

          {/* 分隔線 */}
          <div className="h-[0.5px] mx-4" style={{ backgroundColor: '#e2e8f0' }}></div>

          {/* 設定 */}
          <button
            onClick={() => handleQuickNav('settings')}
            className="w-full flex items-center justify-between p-3.5 transition-all duration-300 cursor-pointer group hover:translate-y-[-4px] quick-nav-button"
          >
            <div className="flex items-center gap-4">
              <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 transition-colors">
                <span className="material-symbols-outlined text-lg">settings</span>
              </div>
              <span className="text-base font-medium transition-colors quick-nav-text" style={{ color: '#1f2937' }}>
                {tNav('settings')}
              </span>
            </div>
            <span className="material-symbols-outlined transition-all group-hover:translate-x-1" style={{ color: '#94a3b8' }}>chevron_right</span>
          </button>
        </div>
        
        {/* 其他學生標題 */}
        {otherStudents.length > 0 && (
          <div className="flex items-center gap-4 mb-4 px-2 -mt-2">
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {locale === 'zh-TW' ? '其他學生' : 'Other Students'}
            </span>
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
          </div>
        )}

        <div className="space-y-3">
          {/* 其他學生列表 - 使用與頁面一致的玻璃態樣式 */}
          {otherStudents.map((student) => {
            const avatar = parseAvatar(student.avatar_url, student.name)
            const hoveredAction = hoveredActions[student.id] || 'records'
            return (
              <div
                key={student.id}
                className="glass-card-base w-full relative overflow-hidden rounded-2xl p-0 group transition-all duration-300 hover:translate-y-[-4px] hover:bg-white/35 hover:border-white/60 hover:shadow-lg"
              >
                <button
                  onClick={() => handleSwitchStudent(student.id)}
                  className="w-full flex items-center justify-between p-4 relative z-10 transition-transform duration-300 list-item-content slide-panel-open cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110"
                      style={{ background: avatar.gradientStyle }}
                    >
                      {avatar.emoji}
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold other-student-name-text transition-colors" style={{ color: '#1f2937' }}>
                        {student.name}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {getActionText(hoveredAction)}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">chevron_right</span>
                </button>

                {/* Hover 覆蓋動畫 - 只保留三個連結：獎金存摺、科目管理、學生設定 */}
                <div className="absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-pink-50/90 to-transparent dark:from-pink-900/30 flex items-center justify-around space-x-2 px-2 translate-x-full opacity-0 transition-all duration-300 list-item-actions group-hover:translate-x-[0px] group-hover:opacity-100 z-10">
                  <button
                    onMouseEnter={() => setHoveredActions(prev => ({ ...prev, [student.id]: 'transactions' }))}
                    onMouseLeave={() => setHoveredActions(prev => ({ ...prev, [student.id]: 'records' }))}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSwitchWithAction(student.id, 'transactions')
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-white/80 hover:bg-green-100 dark:hover:bg-green-800 text-green-600 dark:text-green-300 transition-colors cursor-pointer"
                    title={tTransaction('passbook')}
                  >
                    <span className="material-symbols-outlined text-lg">attach_money</span>
                  </button>
                  <button
                    onMouseEnter={() => setHoveredActions(prev => ({ ...prev, [student.id]: 'subjects' }))}
                    onMouseLeave={() => setHoveredActions(prev => ({ ...prev, [student.id]: 'records' }))}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSwitchWithAction(student.id, 'subjects')
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-white/80 hover:bg-orange-100 dark:hover:bg-orange-800 text-orange-600 dark:text-orange-300 transition-colors cursor-pointer"
                    title={tHome('features.subjects.title')}
                  >
                    <span className="material-symbols-outlined text-lg">menu_book</span>
                  </button>
                  <button
                    onMouseEnter={() => setHoveredActions(prev => ({ ...prev, [student.id]: 'settings' }))}
                    onMouseLeave={() => setHoveredActions(prev => ({ ...prev, [student.id]: 'records' }))}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSwitchWithAction(student.id, 'settings')
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center border border-white/80 hover:bg-purple-100 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-300 transition-colors cursor-pointer"
                    title={tNav('settings')}
                  >
                    <span className="material-symbols-outlined text-lg">settings</span>
                  </button>
                </div>
              </div>
            )
          })}

          {/* 沒有其他學生時顯示提示 */}
          {otherStudents.length === 0 && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">person_off</span>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {locale === 'zh-TW' ? '沒有其他學生帳號' : 'No other student accounts'}
              </p>
            </div>
          )}

          {/* 返回首頁按鈕 - 使用與頁面一致的玻璃態樣式 */}
          <div className="glass-card-base w-full relative overflow-hidden rounded-2xl transition-all duration-300 group hover:translate-y-[-4px] hover:bg-white/35 hover:border-white/60 hover:shadow-lg">
            <button
              onClick={() => {
                router.push('/')
                onClose()
              }}
              className="w-full flex items-center justify-between p-4 relative z-10 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">📚</span>
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold home-link-text transition-colors" style={{ color: '#1f2937' }}>
                    Wilbur's Reward Book
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {hoveringHomeSettings ? (locale === 'zh-TW' ? '網站設定' : 'Site Settings') : (locale === 'zh-TW' ? '返回首頁' : 'Back to Home')}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 group-hover:translate-x-[30px] transition-all">chevron_right</span>
            </button>

            {/* Hover 覆蓋層 - 只顯示設定連結 icon */}
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-pink-50/90 to-transparent dark:from-pink-900/30 flex items-center justify-center space-x-1 px-2 translate-x-full opacity-0 transition-all duration-300 list-item-actions group-hover:translate-x-[0px] group-hover:opacity-100 z-20">
              <button
                onMouseEnter={() => setHoveringHomeSettings(true)}
                onMouseLeave={() => setHoveringHomeSettings(false)}
                onClick={(e) => {
                  e.stopPropagation()
                  router.push('/settings')
                  onClose()
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-white/80 hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300 transition-colors cursor-pointer"
                title={tNav('settings')}
              >
                <span className="material-symbols-outlined text-lg">settings</span>
              </button>
            </div>
          </div>

        </div>
      </div>
      {/* 自定義樣式 */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* 玻璃態基礎樣式（不包含 hover 效果） */
        .glass-card-base {
          background: rgba(255,255,255, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border:1px solid rgba(255, 255, 255, 0.3);
          position: relative;
        }
        .glass-card-base::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        }
        /* 只在 group hover 時才滑動內容 */
        .group:hover .slide-panel-open .list-item-content {
          transform: translateX(-100px);
        }
        .group:hover .slide-panel-open .list-item-actions {
          opacity: 1;
          transform: translateX(0);
        }
        /* 隱藏橫向卷軸 */
        .glass-card-base {
          overflow-x: hidden !important;
        }
        /* 確保快速導覽按鈕文字顏色在所有設備上都是深色 */
        .quick-nav-text {
          color: #1f2937 !important;
        }
        .quick-nav-button:hover .quick-nav-text {
          color: #1f2937 !important;
        }
        /* 確保其他學生名稱文字顏色在所有設備上都是深色 */
        .other-student-name-text {
          color: #1f2937 !important;
        }
        .other-student-name-text:hover {
          color: #6366f1 !important;
        }
        /* 確保首頁連結文字顏色在所有設備上都是深色 */
        .home-link-text {
          color: #1f2937 !important;
        }
        .home-link-text:hover {
          color: #6366f1 !important;
        }
      `}</style>
    </div>
  )
}
