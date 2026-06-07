'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { localeNames, locales, type Locale } from '@/lib/i18n/config'

function IconButton({
  children,
  title,
  href,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: ReactNode
  title: string
  href?: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  const className = `home-top-action ${danger ? 'home-top-action-danger' : ''}`

  if (href) {
    return (
      <Link href={href} className={className} title={title} aria-label={title}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  )
}

type Props = {
  className?: string
  ariaLabel?: string
}

export function LanguageMenuButton({
  title,
  className = '',
  iconClassName = '',
  buttonStyle,
  variant = 'cluster',
}: {
  title: string
  className?: string
  iconClassName?: string
  buttonStyle?: CSSProperties
  /** cluster: 40px icon in AppActionCluster; studentHeader: full custom round button */
  variant?: 'cluster' | 'studentHeader'
}) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null)

  const isStudentHeader = variant === 'studentHeader'

  const updatePortalPos = useCallback(() => {
    const button = rootRef.current?.querySelector('button')
    if (!button) return

    const rect = button.getBoundingClientRect()
    const menuWidth = 152
    setPortalPos({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - menuWidth),
    })
  }, [])

  useEffect(() => {
    if (!open || !isStudentHeader) return

    updatePortalPos()
    window.addEventListener('resize', updatePortalPos)
    window.addEventListener('scroll', updatePortalPos, true)
    return () => {
      window.removeEventListener('resize', updatePortalPos)
      window.removeEventListener('scroll', updatePortalPos, true)
    }
  }, [open, isStudentHeader, updatePortalPos])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const selectLocale = (newLocale: Locale) => {
    if (newLocale === locale) {
      setOpen(false)
      return
    }
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 })
    setOpen(false)
    router.refresh()
  }

  const buttonClassName = isStudentHeader
    ? className
    : `home-top-action ${className} ${open ? 'home-top-action-active' : ''}`.trim()

  const menu = (
    <div
      ref={menuRef}
      className={`home-language-menu ${isStudentHeader ? 'home-language-menu-portal' : ''}`.trim()}
      role="listbox"
      aria-label={title}
      style={
        isStudentHeader && portalPos
          ? { position: 'fixed', top: portalPos.top, left: portalPos.left, right: 'auto' }
          : undefined
      }
    >
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          role="option"
          aria-selected={locale === loc}
          className={`home-language-menu-item ${locale === loc ? 'is-active' : ''}`}
          onClick={() => selectLocale(loc)}
        >
          <span>{localeNames[loc]}</span>
          {locale === loc && (
            <span className="material-symbols-outlined text-[18px] leading-none">check</span>
          )}
        </button>
      ))}
    </div>
  )

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen((value) => !value)}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={buttonStyle}
      >
        <span
          className={
            isStudentHeader
              ? `material-icons-outlined ${iconClassName}`.trim()
              : `material-symbols-outlined ${iconClassName}`.trim()
          }
        >
          language
        </span>
      </button>

      {open &&
        (isStudentHeader && typeof document !== 'undefined'
          ? createPortal(menu, document.body)
          : menu)}
    </div>
  )
}

export default function AppActionCluster({ className = '', ariaLabel }: Props) {
  const router = useRouter()
  const tCommon = useTranslations('common')
  const tAuth = useTranslations('auth')
  const tLogin = useTranslations('login')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (!confirm(tAuth('logoutConfirm'))) {
      return
    }

    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      alert(tAuth('logoutFailed'))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <nav
      className={`home-action-cluster inline-flex ${className}`.trim()}
      aria-label={ariaLabel ?? tCommon('home')}
    >
      <IconButton href="/" title={tCommon('home')}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
          home
        </span>
      </IconButton>
      <IconButton href="/settings" title={tCommon('settings')}>
        <span className="material-symbols-outlined">settings</span>
      </IconButton>
      <LanguageMenuButton title={tLogin('languageLabel')} />
      <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
      <IconButton onClick={handleLogout} danger disabled={isLoggingOut} title={tAuth('logout')}>
        <span className="material-symbols-outlined">logout</span>
      </IconButton>
    </nav>
  )
}
