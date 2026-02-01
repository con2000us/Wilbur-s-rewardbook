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
  currentPage?: 'records' | 'transactions' | 'subjects' | 'rewards' | 'settings'
  displayMode?: 'navigation' | 'students'
}

type HoverAction = 'records' | 'transactions' | 'subjects' | 'rewards' | 'settings' | null

export default function StudentSwitchModal({ 
  isOpen, 
  onClose, 
  currentStudentId, 
  allStudents,
  currentPage = 'records',
  displayMode = 'navigation'
}: Props) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('common')
  const tStudent = useTranslations('student')
  const tTransaction = useTranslations('transaction')
  const tHome = useTranslations('home')
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  // 追蹤每個學生的 hover 狀態
  const [hoveredActions, setHoveredActions] = useState<Record<string, HoverAction>>({})
  // 二層式：展開的學生 ID（點擊 >>> 後顯示該學生的頁面選單）
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

  const getActionText = (action: HoverAction) => {
    switch (action) {
      case 'records':
        return tStudent('recordsTitle')
      case 'transactions':
        return tTransaction('passbook')
      case 'subjects':
        return tHome('features.subjects.title')
      case 'rewards':
        return locale === 'zh-TW' ? '獎勵管理' : 'Reward Management'
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

  // 點擊學生名稱/頭像：跳到該學生的「目前頁面」對應頁面（與 currentPage 同類型）
  const handleSwitchStudentToCurrentPage = (targetStudentId: string) => {
    handleSwitchWithAction(targetStudentId, currentPage)
  }

  const handleSwitchWithAction = (targetStudentId: string, page: string) => {
    if (page === 'records') {
      router.push(`/student/${targetStudentId}`)
    } else if (page === 'transactions') {
      router.push(`/student/${targetStudentId}/transactions`)
    } else if (page === 'subjects') {
      router.push(`/student/${targetStudentId}/subjects`)
    } else if (page === 'rewards') {
      router.push(`/student/${targetStudentId}/rewards`)
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
    } else if (page === 'rewards') {
      router.push(`/student/${currentStudentId}/rewards`)
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
      style={{ paddingTop: '20px' }}
    >
      {/* 學生列表 - 無外層包裝，直接向下展開，有展開/收起動畫 */}
      {/* 高度設定位置：下方 max-h-[600px] 可調整下拉選單的最大高度 */}
      <div
        className={
          'w-full overflow-x-hidden mb-[5px] ' +
          (isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none')
        }
        style={{
          scrollbarColor: 'rgb(209 213 219) transparent',
          scrollbarWidth: 'thin',
          overflowY: isOpen ? 'auto' : 'hidden',
          transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out'
        }}
      >
        {/* 根據 displayMode 顯示不同內容 */}
        {displayMode === 'navigation' ? (
          /* 快速導覽選單 */
          <nav className="glass-card-no-hover rounded-3xl p-4 flex flex-col gap-2">
            {/* 學習記錄 */}
            {currentPage === 'records' ? (
              <button
                disabled
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative sidebar-item-active text-primary cursor-default"
              >
                <span className="material-icons-outlined text-blue-500 bg-blue-50 p-2 rounded-xl">analytics</span>
                <span className="font-medium">{tStudent('recordsTitle')}</span>
                <div className="absolute -right-2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-primary"></div>
              </button>
            ) : (
              <a
                href={`/student/${currentStudentId}`}
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative text-slate-600 hover:bg-white/50"
              >
                <span className="material-icons-outlined text-blue-500 bg-blue-50 p-2 rounded-xl">analytics</span>
                <span className="font-medium">{tStudent('recordsTitle')}</span>
                <span className="material-icons-outlined ml-auto text-slate-400 text-sm">chevron_right</span>
              </a>
            )}

            {/* 獎金存摺 */}
            {currentPage === 'transactions' ? (
              <button
                disabled
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative sidebar-item-active text-primary cursor-default"
              >
                <span className="material-icons-outlined text-green-500 bg-green-50 p-2 rounded-xl">account_balance_wallet</span>
                <span className="font-medium">{tTransaction('passbook')}</span>
                <div className="absolute -right-2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-primary"></div>
              </button>
            ) : (
              <a
                href={`/student/${currentStudentId}/transactions`}
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative text-slate-600 hover:bg-white/50"
              >
                <span className="material-icons-outlined text-green-500 bg-green-50 p-2 rounded-xl">account_balance_wallet</span>
                <span className="font-medium">{tTransaction('passbook')}</span>
                <span className="material-icons-outlined ml-auto text-slate-400 text-sm">chevron_right</span>
              </a>
            )}

            {/* 科目管理 */}
            {currentPage === 'subjects' ? (
              <button
                disabled
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative sidebar-item-active text-primary cursor-default"
              >
                <span className="material-icons-outlined text-orange-500 bg-orange-50 p-2 rounded-xl">auto_stories</span>
                <span className="font-medium">{tHome('features.subjects.title')}</span>
                <div className="absolute -right-2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-primary"></div>
              </button>
            ) : (
              <a
                href={`/student/${currentStudentId}/subjects`}
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative text-slate-600 hover:bg-white/50"
              >
                <span className="material-icons-outlined text-orange-500 bg-orange-50 p-2 rounded-xl">auto_stories</span>
                <span className="font-medium">{tHome('features.subjects.title')}</span>
                <span className="material-icons-outlined ml-auto text-slate-400 text-sm">chevron_right</span>
              </a>
            )}

            {/* 獎勵管理 */}
            {currentPage === 'rewards' ? (
              <button
                disabled
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative sidebar-item-active text-primary cursor-default"
              >
                <span className="material-icons-outlined text-purple-500 bg-purple-50 p-2 rounded-xl">card_giftcard</span>
                <span className="font-medium">{locale === 'zh-TW' ? '獎勵管理' : 'Reward Management'}</span>
                <div className="absolute -right-2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-primary"></div>
              </button>
            ) : (
              <a
                href={`/student/${currentStudentId}/rewards`}
                className="flex items-center gap-3 p-3 rounded-2xl transition-all relative text-slate-600 hover:bg-white/50"
              >
                <span className="material-icons-outlined text-purple-500 bg-purple-50 p-2 rounded-xl">card_giftcard</span>
                <span className="font-medium">{locale === 'zh-TW' ? '獎勵管理' : 'Reward Management'}</span>
                <span className="material-icons-outlined ml-auto text-slate-400 text-sm">chevron_right</span>
              </a>
            )}

            {/* 學生設置 */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.dispatchEvent(new CustomEvent('openStudentSettings', { 
                  detail: { studentId: currentStudentId } 
                }))
              }}
              className="flex items-center gap-3 p-3 rounded-2xl text-slate-600 hover:bg-white/50 transition-all"
            >
              <span className="material-icons-outlined text-purple-500 bg-purple-50 p-2 rounded-xl">settings</span>
              <span className="font-medium">{tNav('settings')}</span>
              <span className="material-icons-outlined ml-auto text-slate-400 text-sm">chevron_right</span>
            </a>

            {/* 返回首頁 */}
            <a
              href="/"
              className="flex items-center gap-3 p-3 rounded-2xl text-slate-600 hover:bg-white/50 transition-all"
            >
                <span className="material-icons-outlined text-blue-500 bg-blue-50 p-2 rounded-xl">home</span>
              <span className="font-medium">{tCommon('home')}</span>
              <span className="material-icons-outlined ml-auto text-slate-400 text-sm">chevron_right</span>
            </a>
          </nav>
        ) : (
          /* 學生列表：hover 顯示目前頁面小標題；點名稱跳到該學生對應頁；點「更多」展開下拉選單 */
          <div className="space-y-2 pt-3 pb-[5px]">
            {otherStudents.map((student) => {
              const avatar = parseAvatar(student.avatar_url, student.name)
              const isExpanded = expandedStudentId === student.id
              return (
                <div key={student.id} className="w-full">
                  {/* 第一層：學生項目 - hover 時名稱下顯示目前頁面小字；點名稱區跳到該學生對應頁 */}
                  <div
                    className="glass-card-base w-full relative overflow-hidden rounded-2xl p-0 group transition-all duration-300 hover:translate-y-[-2px] hover:bg-white/35 hover:border-white/60 hover:shadow-lg"
                  >
                    <div className="w-full flex items-center justify-between p-4 relative z-10">
                      <button
                        onClick={() => handleSwitchStudentToCurrentPage(student.id)}
                        className="flex items-center gap-4 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm transition-transform duration-300 group-hover:scale-105 flex-shrink-0"
                          style={{ background: avatar.gradientStyle }}
                        >
                          {avatar.emoji}
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <h3 className="text-base font-bold truncate w-full" style={{ color: '#1f2937' }}>
                            {student.name}
                          </h3>
                          {/* hover 時在名稱下顯示目前頁面的小字標題 */}
                          <span className="text-xs text-slate-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {getActionText(currentPage)}
                          </span>
                        </div>
                      </button>
                      {/* 帶外框的「更多」按鈕：點擊展開該學生的頁面選單 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedStudentId(prev => prev === student.id ? null : student.id)
                        }}
                        className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300/80 bg-white/50 text-slate-600 text-sm font-medium hover:bg-white/80 hover:border-slate-400 transition-colors cursor-pointer shrink-0 ml-2"
                        title={locale === 'zh-TW' ? '展開下拉選單' : 'Expand dropdown menu'}
                      >
                        {locale === 'zh-TW' ? '更多' : 'More'}
                      </button>
                    </div>
                  </div>

                  {/* 第二層：該學生的相關頁面選單（點擊 >>> 後向下展開） */}
                  <div
                    className={isExpanded ? 'max-h-[400px] opacity-100 overflow-hidden' : 'max-h-0 opacity-0 overflow-hidden'}
                    style={{ transition: 'max-height 0.3s ease-out, opacity 0.2s ease-out' }}
                  >
                    <nav className="glass-card-no-hover rounded-2xl p-3 mt-1 ml-2 mr-0 flex flex-col gap-1 border border-white/40">
                      <a
                        href={`/student/${student.id}`}
                        onClick={(e) => { e.preventDefault(); handleSwitchWithAction(student.id, 'records') }}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-600 hover:bg-primary/15 hover:text-primary transition-colors text-sm cursor-pointer"
                      >
                        <span className="material-icons-outlined text-blue-500 text-lg">analytics</span>
                        <span>{tStudent('recordsTitle')}</span>
                      </a>
                      <a
                        href={`/student/${student.id}/transactions`}
                        onClick={(e) => { e.preventDefault(); handleSwitchWithAction(student.id, 'transactions') }}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-600 hover:bg-primary/15 hover:text-primary transition-colors text-sm cursor-pointer"
                      >
                        <span className="material-icons-outlined text-green-500 text-lg">account_balance_wallet</span>
                        <span>{tTransaction('passbook')}</span>
                      </a>
                      <a
                        href={`/student/${student.id}/subjects`}
                        onClick={(e) => { e.preventDefault(); handleSwitchWithAction(student.id, 'subjects') }}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-600 hover:bg-primary/15 hover:text-primary transition-colors text-sm cursor-pointer"
                      >
                        <span className="material-icons-outlined text-orange-500 text-lg">auto_stories</span>
                        <span>{tHome('features.subjects.title')}</span>
                      </a>
                      <a
                        href={`/student/${student.id}/rewards`}
                        onClick={(e) => { e.preventDefault(); handleSwitchWithAction(student.id, 'rewards') }}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-600 hover:bg-primary/15 hover:text-primary transition-colors text-sm cursor-pointer"
                      >
                        <span className="material-icons-outlined text-purple-500 text-lg">card_giftcard</span>
                        <span>{locale === 'zh-TW' ? '獎勵管理' : 'Reward Management'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleOpenSettings(e, student.id) }}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-600 hover:bg-primary/15 hover:text-primary transition-colors text-sm cursor-pointer w-full text-left"
                      >
                        <span className="material-icons-outlined text-slate-500 text-lg">settings</span>
                        <span>{tNav('settings')}</span>
                      </button>
                    </nav>
                  </div>
                </div>
              )
            })}

            {otherStudents.length === 0 && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">person_off</span>
                <p className="text-sm text-slate-400">
                  {locale === 'zh-TW' ? '沒有其他學生帳號' : 'No other student accounts'}
                </p>
              </div>
            )}
          </div>
        )}
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
        /* 隱藏橫向卷軸 */
        .glass-card-base {
          overflow-x: hidden !important;
        }
      `}</style>
    </div>
  )
}
