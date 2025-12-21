'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface HomeButtonProps {
  className?: string
}

export default function HomeButton({ className = '' }: HomeButtonProps) {
  const tCommon = useTranslations('common')
  
  return (
    <Link
      href="/"
      className={`group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-white/95 to-white/80 backdrop-blur-md rounded-2xl hover:from-white hover:to-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 border border-white/50 hover:border-purple-200 flex items-center gap-2 cursor-pointer ${className}`}
    >
      {/* 背景光暈效果 */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* 首頁圖標 */}
      <div className="relative z-10 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
        <svg 
          className="w-4 h-4 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2.5} 
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
          />
        </svg>
      </div>
      
      {/* 文字 */}
      <span className="relative z-10 text-sm font-bold text-gray-700 group-hover:text-purple-700 transition-colors duration-300 whitespace-nowrap">
        {tCommon('home')}
      </span>
    </Link>
  )
}

