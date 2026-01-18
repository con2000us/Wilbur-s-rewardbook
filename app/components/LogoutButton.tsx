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
      className="glass px-5 h-12 flex items-center justify-center gap-2 rounded-2xl transition-all text-white font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      title={t('logout')}
    >
      <span className="material-icons-round text-xl">logout</span>
      <span className="text-sm">{loading ? t('loggingOut') : t('logout')}</span>
    </button>
  )
}

