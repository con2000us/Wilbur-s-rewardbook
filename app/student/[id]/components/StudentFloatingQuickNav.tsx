'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { getStudentThemeShadow, parseStudentAvatar } from '@/lib/utils/studentTheme'
import AppActionCluster from '@/app/components/AppActionCluster'

type Student = {
  id: string
  name: string
  avatar_url: string | null
}

type StudentAvatar = {
  emoji: string
  gradientStyle: string
  hex?: string
}

type StudentPageKey = 'records' | 'transactions' | 'subjects' | 'rewards' | 'settings'
type MobileBottomNavLabelKey = 'records' | 'passbook' | 'rewards' | 'subjects' | 'settings'
type NavItemKey = StudentPageKey

type Props = {
  studentId: string
  studentName: string
  studentAvatar: StudentAvatar
  allStudents: Student[]
  currentPage?: StudentPageKey
  reserveSpace?: boolean
  onHeightChange?: (height: number) => void
}

const pageSuffixByKey: Record<StudentPageKey, string> = {
  records: '',
  transactions: '/transactions',
  subjects: '/subjects',
  rewards: '/rewards',
  settings: '',
}

const EXPAND_TRANSITION_MS = 300
const QUICK_NAV_TRAY_HEIGHT_COOKIE = 'student_quick_nav_tray_height'
const QUICK_NAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const HEIGHT_EPSILON = 2
const HEADER_BORDER_HEIGHT = 1
const NAV_VERTICAL_CHROME_HEIGHT = 28

const studentHeaderActionButtonClass =
  'flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-full border-2 border-primary/45 bg-white text-primary ring-2 ring-white/90 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 sm:h-14 sm:w-14'

const navConfig: Array<{ key: NavItemKey; icon: string; labelKey: MobileBottomNavLabelKey }> = [
  { key: 'records', icon: 'assignment', labelKey: 'records' },
  { key: 'transactions', icon: 'account_balance_wallet', labelKey: 'passbook' },
  { key: 'rewards', icon: 'stars', labelKey: 'rewards' },
  { key: 'subjects', icon: 'menu_book', labelKey: 'subjects' },
  { key: 'settings', icon: 'settings', labelKey: 'settings' },
]

function getStudentPageHref(studentId: string, page: StudentPageKey) {
  return `/student/${studentId}${pageSuffixByKey[page]}`
}

function getViewportBucket() {
  if (typeof window === 'undefined') return 'ssr'
  if (window.innerWidth < 768) return 'mobile'
  return 'tablet'
}

function getTrayHeightCookieKey(studentCount: number) {
  return `${QUICK_NAV_TRAY_HEIGHT_COOKIE}_${getViewportBucket()}_${studentCount}`
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.startsWith('#') ? hex : `#${hex}`
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 高亮度主題色混 slate，確保淺底上文字可讀 */
function getReadableThemeRgb(hex: string) {
  const normalized = hex.startsWith('#') ? hex : `#${hex}`
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  const slateR = 51
  const slateG = 65
  const slateB = 85

  let mixRatio = 0
  if (luminance > 0.78) mixRatio = 0.62
  else if (luminance > 0.58) mixRatio = 0.4
  else if (luminance > 0.45) mixRatio = 0.2

  const mix = (channel: number, slate: number) =>
    Math.round(channel * (1 - mixRatio) + slate * mixRatio)

  return {
    r: mix(r, slateR),
    g: mix(g, slateG),
    b: mix(b, slateB),
  }
}

function readCookieNumber(key: string) {
  if (typeof document === 'undefined') return null

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${encodeURIComponent(key)}=`))

  if (!cookie) return null

  const value = Number(decodeURIComponent(cookie.split('=').slice(1).join('=')))
  return Number.isFinite(value) && value > 0 ? value : null
}

function writeCookieNumber(key: string, value: number) {
  if (typeof document === 'undefined' || value <= 0) return

  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}; max-age=${QUICK_NAV_COOKIE_MAX_AGE}; path=/; SameSite=Lax`
}

function StudentAvatarBadge({
  avatar,
  fallbackName,
  className = 'h-16 w-16 text-base',
}: {
  avatar: StudentAvatar
  fallbackName: string
  className?: string
}) {
  const isEmoji = Boolean(avatar.emoji && avatar.emoji.length <= 4)

  return (
    <span
      className={`${className} student-avatar-badge flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-black shadow-md ring-2 ring-white`}
      style={{ background: avatar.gradientStyle }}
      aria-hidden="true"
    >
      <span
        className={`leading-none translate-y-[-9%] drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)] ${
          isEmoji ? 'select-none' : 'text-slate-800'
        }`}
      >
        {avatar.emoji || fallbackName.charAt(0)}
      </span>
    </span>
  )
}

export default function StudentFloatingQuickNav({
  studentId,
  studentName,
  studentAvatar,
  allStudents,
  currentPage = 'records',
  reserveSpace = false,
  onHeightChange,
}: Props) {
  const router = useRouter()
  const locale = useLocale()
  const isZh = locale === 'zh-TW'
  const tStudent = useTranslations('student')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const themeHex = studentAvatar.hex ?? '#3b82f6'
  const headerShellRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const quickNavMenuRef = useRef<HTMLElement>(null)
  const [topBarHeight, setTopBarHeight] = useState(96)
  const [trayPanelHeight, setTrayPanelHeight] = useState(0)
  const [trayHeightCookieKey, setTrayHeightCookieKey] = useState('')
  const [selectedSwitcherStudentId, setSelectedSwitcherStudentId] = useState(studentId)

  const selectedSwitcherStudent = useMemo(
    () => allStudents.find((student) => student.id === selectedSwitcherStudentId) ?? null,
    [allStudents, selectedSwitcherStudentId]
  )

  const activeNavThemeHex = selectedSwitcherStudent
    ? parseStudentAvatar(selectedSwitcherStudent.avatar_url, selectedSwitcherStudent.name).hex ?? themeHex
    : themeHex

  const headerShellStyle = {
    boxShadow: getStudentThemeShadow(themeHex, 'md'),
    background: `linear-gradient(180deg, ${hexToRgba(themeHex, 0.14)} 0%, rgba(255, 255, 255, 0.96) 38%, #ffffff 100%)`,
    backdropFilter: 'blur(8px)',
  }

  const quickNavMenuStyle = {
    background: `linear-gradient(180deg, ${hexToRgba(activeNavThemeHex, 0.1)} 0%, rgba(255, 255, 255, 0.4) 100%)`,
  }

  const navItems = useMemo(
    () =>
      navConfig.map((item) => ({
        ...item,
        label: tStudent(`mobileBottomNav.${item.labelKey}`),
        href: getStudentPageHref(selectedSwitcherStudentId, item.key),
        active: currentPage === item.key,
      })),
    [currentPage, selectedSwitcherStudentId, tStudent]
  )

  const currentPageLabel =
    navItems.find((item) => item.active)?.label ||
    (isZh ? '學生頁面' : 'Student page')

  const mobileNavItemBaseClass =
    'flex min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 px-1 py-2 transition-all duration-200 active:scale-95'
  const mobileNavItemInactiveClass = mobileNavItemBaseClass
  const mobileNavItemActiveClass = `${mobileNavItemBaseClass} relative font-semibold after:absolute after:bottom-0 after:left-1/4 after:h-[2px] after:w-1/2 after:rounded-full after:bg-[var(--nav-accent)]`

  const getMobileNavItemStyle = (active: boolean): React.CSSProperties => {
    const { r, g, b } = getReadableThemeRgb(activeNavThemeHex)
    return {
      color: active ? `rgb(${Math.max(r - 18, 15)}, ${Math.max(g - 18, 23)}, ${Math.max(b - 18, 42)})` : '#475569',
      ...(active ? { ['--nav-accent' as string]: `rgb(${r}, ${g}, ${b})` } : {}),
    }
  }

  const handleStudentCardClick = (targetStudentId: string) => {
    if (targetStudentId === selectedSwitcherStudentId) {
      if (currentPage === 'settings') {
        handleOpenSettings(targetStudentId)
        return
      }
      router.push(getStudentPageHref(targetStudentId, currentPage))
      return
    }
    setSelectedSwitcherStudentId(targetStudentId)
  }

  const handleOpenSettings = (targetStudentId: string) => {
    window.dispatchEvent(
      new CustomEvent('openStudentSettings', {
        detail: { studentId: targetStudentId },
      })
    )
  }

  useEffect(() => {
    const topBar = topBarRef.current
    if (!topBar) return

    const measure = () => setTopBarHeight(Math.ceil(topBar.getBoundingClientRect().height))

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(topBar)
    return () => observer.disconnect()
  }, [studentName, currentPageLabel])

  useEffect(() => {
    const syncCachedHeight = () => {
      const nextKey = getTrayHeightCookieKey(allStudents.length)
      setTrayHeightCookieKey(nextKey)

      const cachedHeight = readCookieNumber(nextKey)
      if (cachedHeight) {
        setTrayPanelHeight((currentHeight) =>
          Math.abs(currentHeight - cachedHeight) > HEIGHT_EPSILON ? cachedHeight : currentHeight
        )
      }
    }

    syncCachedHeight()
    window.addEventListener('resize', syncCachedHeight)
    return () => window.removeEventListener('resize', syncCachedHeight)
  }, [allStudents.length])

  useEffect(() => {
    const tray = quickNavMenuRef.current
    if (!tray) return

    const measure = () => {
      const measuredHeight = Math.ceil(tray.scrollHeight)
      if (measuredHeight <= 0) return

      setTrayPanelHeight((currentHeight) =>
        Math.abs(currentHeight - measuredHeight) > HEIGHT_EPSILON ? measuredHeight : currentHeight
      )

      const cookieKey = trayHeightCookieKey || getTrayHeightCookieKey(allStudents.length)
      const cachedHeight = readCookieNumber(cookieKey)
      if (!cachedHeight || Math.abs(cachedHeight - measuredHeight) > HEIGHT_EPSILON) {
        writeCookieNumber(cookieKey, measuredHeight)
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(tray)
    return () => observer.disconnect()
  }, [allStudents.length, navItems.length, trayHeightCookieKey])

  useEffect(() => {
    setSelectedSwitcherStudentId(studentId)
  }, [studentId])

  const expandTargetMaxHeight = isMenuOpen ? NAV_VERTICAL_CHROME_HEIGHT + trayPanelHeight : 0
  const headerTargetHeight = topBarHeight + expandTargetMaxHeight + HEADER_BORDER_HEIGHT
  const spacerTargetHeight = Math.max(0, headerTargetHeight - 2)

  useEffect(() => {
    onHeightChange?.(headerTargetHeight)
    if (spacerRef.current) {
      spacerRef.current.style.height = `${spacerTargetHeight}px`
    }
  }, [headerTargetHeight, onHeightChange, spacerTargetHeight])

  return (
    <>
      <AppActionCluster
        className="app-action-cluster-fixed app-action-cluster-align-student hidden lg:inline-flex"
        ariaLabel={isZh ? '全站操作' : 'Global actions'}
      />
      <header className="fixed inset-x-0 top-0 z-50 w-full px-0 lg:hidden">
        <div
          ref={headerShellRef}
          className="rounded-none border-b border-white/70 backdrop-blur-md"
          style={headerShellStyle}
        >
          <div ref={topBarRef} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <StudentAvatarBadge
                avatar={studentAvatar}
                fallbackName={studentName}
                className="h-14 w-14 text-3xl leading-none sm:h-16 sm:w-16 sm:text-4xl"
              />
              <span className="min-w-0">
                <span className="block truncate text-2xl font-bold leading-tight text-slate-800 sm:text-3xl">
                  {studentName}
                </span>
                <span className="block text-sm font-semibold text-primary">{currentPageLabel}</span>
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/settings"
                className={studentHeaderActionButtonClass}
                style={{
                  boxShadow: `${getStudentThemeShadow(themeHex, 'md')}, 0 8px 18px -8px rgba(15, 23, 42, 0.32)`,
                }}
                aria-label={isZh ? '系統設定' : 'Settings'}
                title={isZh ? '系統設定' : 'Settings'}
              >
                <span className="material-icons-outlined text-2xl">settings</span>
              </Link>

              <Link
                href="/"
                className={studentHeaderActionButtonClass}
                style={{
                  boxShadow: `${getStudentThemeShadow(themeHex, 'md')}, 0 8px 18px -8px rgba(15, 23, 42, 0.32)`,
                }}
                aria-label={isZh ? '返回首頁' : 'Back to home'}
                title={isZh ? '首頁' : 'Home'}
              >
                <span className="material-icons-outlined text-2xl">home</span>
              </Link>

              <button
                type="button"
                className={studentHeaderActionButtonClass}
                style={{
                  boxShadow: `${getStudentThemeShadow(themeHex, 'md')}, 0 8px 18px -8px rgba(15, 23, 42, 0.32)`,
                }}
                aria-expanded={isMenuOpen}
                aria-label={
                  isMenuOpen
                    ? isZh
                      ? '收合快速導覽'
                      : 'Collapse quick navigation'
                    : isZh
                      ? '展開快速導覽'
                      : 'Open quick navigation'
                }
                onClick={() => setIsMenuOpen((value) => !value)}
              >
                <span
                  className={`material-icons-outlined text-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isMenuOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  menu
                </span>
              </button>
            </div>
          </div>

          <div
            className={`transition-[max-height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isMenuOpen ? 'overflow-visible' : 'overflow-hidden'
            }`}
            style={{ maxHeight: expandTargetMaxHeight }}
          >
            <div className={isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}>
              <nav
                ref={quickNavMenuRef}
                className={`border-t border-white/55 px-4 pb-3 pt-3 transition-opacity duration-300 ${
                  isMenuOpen ? 'opacity-100' : 'opacity-0'
                }`}
                style={quickNavMenuStyle}
                aria-label={isZh ? '學生快速導覽' : 'Student quick navigation'}
              >
                <div
                  id="student-switcher-panel"
                  className="pb-2 pt-1 [scrollbar-color:rgba(106,153,224,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-[4px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25 [&::-webkit-scrollbar-track]:bg-transparent"
                >
                  <div className="flex gap-3 overflow-x-auto overflow-y-visible px-px pt-1 pb-1">
                  {allStudents.map((student) => {
                      const parsedAvatar = parseStudentAvatar(student.avatar_url, student.name)
                      const active = student.id === selectedSwitcherStudentId
                      const studentHex = parsedAvatar.hex ?? '#3b82f6'

                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleStudentCardClick(student.id)}
                          className={`relative flex h-44 w-32 shrink-0 touch-manipulation flex-col items-center justify-center rounded-2xl p-3 text-center transition-all duration-200 active:scale-[0.98] ${
                            active
                              ? 'border-[3px] text-slate-800'
                              : 'border border-slate-200 text-slate-700'
                          }`}
                          style={
                            active
                              ? {
                                  borderColor: `${studentHex}80`,
                                  background: `linear-gradient(to bottom, ${studentHex}2a 0%, ${studentHex}14 45%, #ffffff 100%)`,
                                  boxShadow: getStudentThemeShadow(studentHex, 'lg'),
                                }
                              : {
                                  background: `linear-gradient(to bottom, ${studentHex}2a 0%, ${studentHex}14 45%, #ffffff 100%)`,
                                  boxShadow: getStudentThemeShadow(studentHex, 'sm'),
                                }
                          }
                        >
                          {active && (
                            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
                              <span
                                className="material-icons-outlined text-[16px] leading-none"
                                style={{ fontVariationSettings: "'FILL' 1", color: studentHex }}
                              >
                                check_circle
                              </span>
                            </span>
                          )}
                          <StudentAvatarBadge
                            avatar={parsedAvatar}
                            fallbackName={student.name}
                            className="mb-3 h-[4.5rem] w-[4.5rem] text-[2rem] leading-none"
                          />
                          <span className="block w-full truncate text-[17px] font-black leading-tight">{student.name}</span>
                        </button>
                      )
                  })}
                  </div>
                </div>

                <div className="h-px bg-slate-200/70" aria-hidden="true" />

                <div className="flex w-full items-center py-1">
                {navItems.map((item, index) => {
                    const itemClassName = item.active
                      ? mobileNavItemActiveClass
                      : mobileNavItemInactiveClass
                    const itemStyle = getMobileNavItemStyle(item.active)
                    const itemContent = (
                      <>
                        <span className="material-icons-outlined text-[28px] leading-none">{item.icon}</span>
                        <span className="w-full text-center text-[13px] font-medium leading-tight">
                          {item.label}
                        </span>
                      </>
                    )

                    const separator = index < navItems.length - 1 ? (
                      <span key={`sep-${item.key}`} className="h-8 w-px shrink-0 bg-slate-200/80" aria-hidden="true" />
                    ) : null

                    const navEl = item.key === 'settings' ? (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleOpenSettings(selectedSwitcherStudentId)}
                        className={itemClassName}
                        style={itemStyle}
                      >
                        {itemContent}
                      </button>
                    ) : (
                      <Link key={item.key} href={item.href} className={itemClassName} style={itemStyle}>
                        {itemContent}
                      </Link>
                    )

                    return (
                      <React.Fragment key={item.key}>
                        {navEl}
                        {separator}
                      </React.Fragment>
                    )
                })}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {reserveSpace && (
        <div
          ref={spacerRef}
          className="lg:hidden"
          style={{
            height: spacerTargetHeight,
            transition: `height ${EXPAND_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
          aria-hidden="true"
        />
      )}
    </>
  )
}
