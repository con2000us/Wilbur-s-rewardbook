'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { getStudentThemeShadow, parseStudentAvatar } from '@/lib/utils/studentTheme'

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
type MobileBottomNavLabelKey = 'home' | 'records' | 'passbook' | 'rewards' | 'subjects' | 'settings'
type NavItemKey = 'home' | StudentPageKey

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
const QUICK_NAV_SWITCHER_HEIGHT_COOKIE = 'student_quick_nav_switcher_height'
const QUICK_NAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const HEIGHT_EPSILON = 2
const HEADER_BORDER_HEIGHT = 1
const NAV_VERTICAL_CHROME_HEIGHT = 25
const SWITCHER_GAP_HEIGHT = 8

const navConfig: Array<{ key: NavItemKey; icon: string; labelKey: MobileBottomNavLabelKey }> = [
  { key: 'home', icon: 'home', labelKey: 'home' },
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

function getSwitcherHeightCookieKey(studentCount: number) {
  return `${QUICK_NAV_SWITCHER_HEIGHT_COOKIE}_${getViewportBucket()}_${studentCount}`
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
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-black text-primary shadow-sm ring-1 ring-white/70`}
      style={{ background: avatar.gradientStyle }}
      aria-hidden="true"
    >
      {avatar.emoji || fallbackName.charAt(0)}
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
  const [isStudentSwitcherOpen, setIsStudentSwitcherOpen] = useState(false)
  const themeHex = studentAvatar.hex ?? '#3b82f6'
  const headerShellRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const studentSwitcherRef = useRef<HTMLDivElement>(null)
  const navLinksRef = useRef<HTMLDivElement>(null)
  const [topBarHeight, setTopBarHeight] = useState(96)
  const [navLinksHeight, setNavLinksHeight] = useState(0)
  const [switcherPanelMaxHeight, setSwitcherPanelMaxHeight] = useState(0)
  const [switcherHeightCookieKey, setSwitcherHeightCookieKey] = useState('')
  const [selectedSwitcherStudentId, setSelectedSwitcherStudentId] = useState(studentId)

  const selectedSwitcherStudent = useMemo(
    () => allStudents.find((student) => student.id === selectedSwitcherStudentId) ?? null,
    [allStudents, selectedSwitcherStudentId]
  )

  const activeNavThemeHex = selectedSwitcherStudent
    ? parseStudentAvatar(selectedSwitcherStudent.avatar_url, selectedSwitcherStudent.name).hex ?? themeHex
    : themeHex

  const getMobileNavActiveStyle = () => undefined

  const navItems = useMemo(
    () =>
      navConfig.map((item) => ({
        ...item,
        label: tStudent(`mobileBottomNav.${item.labelKey}`),
        href:
          item.key === 'home'
            ? '/'
            : getStudentPageHref(selectedSwitcherStudentId, item.key),
        active: item.key !== 'home' && currentPage === item.key,
      })),
    [currentPage, selectedSwitcherStudentId, tStudent]
  )

  const currentPageLabel =
    navItems.find((item) => item.active)?.label ||
    (isZh ? '學生頁面' : 'Student page')

  const mobileNavItemInactiveClass =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-slate-500 transition-all hover:text-slate-800'
  const mobileNavItemActiveClass =
    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-slate-800 font-semibold after:absolute after:bottom-0 after:left-1/4 after:h-[2px] after:w-1/2 after:rounded-full after:bg-slate-400'

  const toggleStudentSwitcher = () => {
    setIsStudentSwitcherOpen((value) => !value)
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
    const navLinks = navLinksRef.current
    if (!navLinks) return

    const measure = () => setNavLinksHeight(Math.ceil(navLinks.scrollHeight))

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(navLinks)
    return () => observer.disconnect()
  }, [navItems.length, currentPageLabel])

  useEffect(() => {
    const syncCachedHeight = () => {
      const nextKey = getSwitcherHeightCookieKey(allStudents.length)
      setSwitcherHeightCookieKey(nextKey)

      const cachedHeight = readCookieNumber(nextKey)
      if (cachedHeight) {
        setSwitcherPanelMaxHeight((currentHeight) =>
          Math.abs(currentHeight - cachedHeight) > HEIGHT_EPSILON ? cachedHeight : currentHeight
        )
      }
    }

    syncCachedHeight()
    window.addEventListener('resize', syncCachedHeight)
    return () => window.removeEventListener('resize', syncCachedHeight)
  }, [allStudents.length])

  useEffect(() => {
    const panel = studentSwitcherRef.current
    if (!panel) return

    const measure = () => {
      const measuredHeight = Math.ceil(panel.scrollHeight)
      if (measuredHeight <= 0) return

      setSwitcherPanelMaxHeight((currentHeight) =>
        Math.abs(currentHeight - measuredHeight) > HEIGHT_EPSILON ? measuredHeight : currentHeight
      )

      const cookieKey = switcherHeightCookieKey || getSwitcherHeightCookieKey(allStudents.length)
      const cachedHeight = readCookieNumber(cookieKey)
      if (!cachedHeight || Math.abs(cachedHeight - measuredHeight) > HEIGHT_EPSILON) {
        writeCookieNumber(cookieKey, measuredHeight)
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [allStudents.length, switcherHeightCookieKey])

  useEffect(() => {
    setSelectedSwitcherStudentId(studentId)
  }, [studentId])

  const switcherTargetHeight = isMenuOpen && isStudentSwitcherOpen ? switcherPanelMaxHeight : 0
  const expandTargetMaxHeight = isMenuOpen
    ? NAV_VERTICAL_CHROME_HEIGHT + navLinksHeight + SWITCHER_GAP_HEIGHT + switcherTargetHeight
    : 0
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
      <header className="fixed inset-x-0 top-0 z-50 w-full px-0 lg:hidden">
        <div
          ref={headerShellRef}
          className="overflow-hidden rounded-none border-b border-white/70 bg-white/90 backdrop-blur-md"
          style={{ boxShadow: getStudentThemeShadow(themeHex, 'md') }}
        >
          <div ref={topBarRef} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3 text-left">
              <StudentAvatarBadge
                avatar={studentAvatar}
                fallbackName={studentName}
                className="h-16 w-16 text-4xl leading-none"
              />
              <span className="min-w-0">
                <span className="block truncate text-3xl font-bold leading-tight text-slate-800">
                  {studentName}
                </span>
                <span className="block text-sm font-semibold text-primary">{currentPageLabel}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 bg-white ring-2 ring-white/90 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 ${
                  isStudentSwitcherOpen
                    ? 'border-solid border-primary/45 text-primary opacity-100'
                    : 'border-dashed border-slate-500/70 text-slate-500 opacity-85'
                }`}
                style={{
                  boxShadow: `${getStudentThemeShadow(themeHex, 'md')}, 0 8px 18px -8px rgba(15, 23, 42, 0.32)`,
                }}
                aria-expanded={isMenuOpen && isStudentSwitcherOpen}
                aria-controls="student-switcher-panel"
                aria-pressed={isStudentSwitcherOpen}
                aria-label={isZh ? '切換顯示學生選項' : 'Toggle student list in menu'}
                onClick={toggleStudentSwitcher}
              >
                <span className="material-icons-outlined text-2xl">person</span>
              </button>

              <button
                type="button"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/45 bg-white text-primary ring-2 ring-white/90 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95"
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
            className="overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ maxHeight: expandTargetMaxHeight }}
          >
            <div className={isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}>
              <nav
                className={`border-t border-white/55 px-4 pb-3 pt-0 transition-opacity duration-300 ${
                  isMenuOpen ? 'opacity-100' : 'opacity-0'
                }`}
                aria-label={isZh ? '學生快速導覽' : 'Student quick navigation'}
              >
                <div className="flex flex-col gap-2 px-px">
                <div
                  className={`overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isStudentSwitcherOpen && isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  style={{
                    maxHeight: isStudentSwitcherOpen && isMenuOpen ? switcherPanelMaxHeight : 0,
                  }}
                  aria-hidden={!isStudentSwitcherOpen || !isMenuOpen}
                >
                  <div
                    id="student-switcher-panel"
                    ref={studentSwitcherRef}
                    className="border-t border-white/55 pb-2 pt-3 [scrollbar-color:rgba(106,153,224,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-[4px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25 [&::-webkit-scrollbar-track]:bg-transparent"
                  >
                    <div className="flex gap-3 overflow-x-auto pb-2">
                    {allStudents.map((student) => {
                      const parsedAvatar = parseStudentAvatar(student.avatar_url, student.name)
                      const active = student.id === selectedSwitcherStudentId
                      const studentHex = parsedAvatar.hex ?? '#3b82f6'

                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleStudentCardClick(student.id)}
                          className={`relative flex h-44 w-32 shrink-0 flex-col items-center justify-center rounded-2xl p-3 text-center transition-all duration-200 ${
                            active
                              ? 'border-2 text-slate-800'
                              : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5'
                          }`}
                          style={
                            active
                              ? {
                                  borderColor: studentHex,
                                  background: `linear-gradient(135deg, ${studentHex}2a 0%, ${studentHex}14 45%, #ffffff 100%)`,
                                  boxShadow: getStudentThemeShadow(studentHex, 'lg'),
                                }
                              : {
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
                            className="mb-3 h-16 w-16 text-2xl"
                          />
                          <span className="block w-full truncate text-[17px] font-black leading-tight">{student.name}</span>
                        </button>
                      )
                    })}
                    </div>
                  </div>
                </div>

                <div
                  ref={navLinksRef}
                  className="flex w-full items-center px-1 py-2 pt-0"
                >
                  {navItems.map((item, index) => {
                    const itemClassName = item.active
                      ? mobileNavItemActiveClass
                      : mobileNavItemInactiveClass
                    const itemStyle = item.active ? getMobileNavActiveStyle() : undefined
                    const itemContent = (
                      <>
                        <span className="material-icons-outlined text-[26px]">{item.icon}</span>
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
