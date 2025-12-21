'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (!confirm('確定要登出嗎？')) {
      return
    }

    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      alert('登出失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 font-bold text-gray-800 text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      title="登出"
    >
      <span className="text-2xl">🚪</span>
      <span>{loading ? '登出中...' : '登出'}</span>
    </button>
  )
}

