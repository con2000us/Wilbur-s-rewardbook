'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  /** 響應式顯示，例如：lg:hidden（窄版）或 hidden lg:flex（雙欄） */
  className?: string
}

export default function StudentHomeNavButton({ className = '' }: Props) {
  const router = useRouter()
  const t = useTranslations('common')

  return (
    <button
      type="button"
      onClick={() => router.push('/')}
      className={`student-toolbar-primary min-h-11 px-5 py-2.5 rounded-full transition-all cursor-pointer inline-flex items-center justify-center gap-2 flex-shrink-0 text-base font-semibold whitespace-nowrap hover:scale-105 active:scale-95 ${className}`}
    >
      <span className="material-icons-outlined text-[1.375rem] leading-none shrink-0">home</span>
      <span>{t('home')}</span>
    </button>
  )
}
