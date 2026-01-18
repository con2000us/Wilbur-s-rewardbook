'use client'

import { useLocale, useTranslations } from 'next-intl'
import { locales, localeNames, type Locale } from '@/lib/i18n/config'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const t = useTranslations('settings')

  const handleLanguageChange = (newLocale: Locale) => {
    // 保存到 cookie
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 })
    
    // 刷新頁面以應用新語言
    router.refresh()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        🌐 {t('language')}
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        {t('selectLanguage')}
      </p>
      
      <div className="flex gap-4">
        {locales.map((loc) => (
          <label
            key={loc}
            className={`
              relative flex-1 cursor-pointer
              p-6 rounded-xl border-2 transition-all duration-200
              ${locale === loc 
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md hover:scale-102'
              }
            `}
          >
            <input
              type="radio"
              name="language"
              value={loc}
              checked={locale === loc}
              onChange={(e) => handleLanguageChange(e.target.value as Locale)}
              className="sr-only"
            />
            <div className="text-center">
              {/* 語言名稱 */}
              <div className={`text-lg font-bold ${locale === loc ? 'text-blue-600' : 'text-gray-800'}`}>
                {localeNames[loc]}
              </div>
              {/* 選中標記 */}
              {locale === loc && (
                <div className="mt-2 flex items-center justify-center">
                  <div className="bg-blue-500 text-white rounded-full px-3 py-1 text-xs font-semibold">
                    ✓ {loc === 'zh-TW' ? '目前使用' : 'Active'}
                  </div>
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <span>
            {locale === 'zh-TW' 
              ? '點擊語言卡片即可切換，頁面會自動刷新並套用新語言' 
              : 'Click on a language card to switch. The page will automatically refresh and apply the new language.'}
          </span>
        </p>
      </div>
    </div>
  )
}

