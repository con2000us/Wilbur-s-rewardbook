'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function LogoutButton() {
  const router = useRouter()
  const t = useTranslations('auth')
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (!confirm(t('logoutConfirm'))) {
      return
    }

    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      alert(t('logoutFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 font-bold text-gray-800 text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      title={t('logout')}
    >
      <span className="text-2xl">🚪</span>
      <span>{loading ? t('loggingOut') : t('logout')}</span>
    </button>
  )
}

