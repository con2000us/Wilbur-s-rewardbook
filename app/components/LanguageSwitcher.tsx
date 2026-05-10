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
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
      <h2 className="text-lg font-bold text-slate-800 mb-1">{t('language')}</h2>
      <p className="text-sm text-slate-500 mb-4">{t('selectLanguage')}</p>

      <div className="grid grid-cols-2 gap-3">
        {locales.map((loc) => (
          <label
            key={loc}
            className={`
              relative cursor-pointer
              p-3 rounded-xl border transition-colors flex items-center justify-between
              ${locale === loc 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
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
            <div>
              <div className={`text-sm font-medium ${locale === loc ? 'text-blue-900' : 'text-gray-700'}`}>
                {localeNames[loc]}
              </div>
              {locale === loc && (
                <div className="text-xs text-blue-600 mt-0.5">
                  {loc === 'zh-TW' ? '目前啟用' : 'Active'}
                </div>
              )}
            </div>
            {locale === loc && <span className="text-blue-600">✓</span>}
          </label>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        {locale === 'zh-TW'
          ? '切換語言後，頁面將自動重新載入。'
          : 'After switching language, this page reloads automatically.'}
      </p>
    </section>
  )
}

