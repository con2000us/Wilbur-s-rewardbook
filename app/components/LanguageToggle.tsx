'use client'

import { useLocale } from 'next-intl'
import { locales, type Locale } from '@/lib/i18n/config'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { useState } from 'react'

export default function LanguageToggle() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLanguageChange = (newLocale: Locale) => {
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 })
    setIsOpen(false)
    router.refresh()
  }

  const getLanguageInfo = (loc: Locale) => {
    return {
      'zh-TW': { flag: '🇹🇼', name: '繁中', fullName: '繁體中文' },
      'en': { flag: '🇺🇸', name: 'EN', fullName: 'English' }
    }[loc]
  }

  const currentLang = getLanguageInfo(locale)
  const otherLocale = locales.find(loc => loc !== locale)!
  const otherLang = getLanguageInfo(otherLocale)

  return (
    <div className="relative">
      {/* 語言按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 font-bold text-gray-800 text-base cursor-pointer"
        title={locale === 'zh-TW' ? '切換語言' : 'Switch Language'}
      >
        <span className="text-2xl">{currentLang.flag}</span>
        <span>{currentLang.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 選單內容 */}
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-2xl border-2 border-gray-200 overflow-hidden z-20 min-w-[200px]">
            {locales.map((loc) => {
              const lang = getLanguageInfo(loc)
              const isActive = loc === locale
              
              return (
                <button
                  key={loc}
                  onClick={() => handleLanguageChange(loc)}
                  className={`
                    w-full px-4 py-3 flex items-center gap-3 transition-all whitespace-nowrap cursor-pointer
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600 font-bold' 
                      : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="flex-1 text-left text-base">{lang.fullName}</span>
                  {isActive && (
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

