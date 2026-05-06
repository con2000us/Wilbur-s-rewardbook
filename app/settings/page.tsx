import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SiteNameSettings from './SiteNameSettings'
import PaginationSettings from './PaginationSettings'
import BackupSettings from './BackupSettings'
import ClearAllStudentsSettings from './ClearAllStudentsSettings'
import HomeButton from '@/app/components/HomeButton'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景漸層 - 亮系主色調 */}
      <div className="absolute inset-0 bg-app-shell"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/10 to-sky-200/40"></div>
      
      {/* 內容區域 */}
      <div className="relative z-10 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
            <div className="flex items-center gap-4">
              {/* 設定圖標 */}
              <div 
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center text-3xl shadow-lg ring-4 ring-white/80 flex-shrink-0"
              >
                ⚙️
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
                  {t('title')}
                </h1>
                <p className="text-slate-600 text-base md:text-lg font-semibold">
                  系統設定與偏好
                </p>
              </div>
            </div>
            <HomeButton />
          </div>

          {/* 主內容區域 */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                🧭 {t('initializationManager')}
              </h2>
              <p className="text-gray-600 mb-4 text-sm">{t('initializationManagerDesc')}</p>
              <Link
                href="/settings/initialization"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <span className="material-icons-outlined text-base">arrow_forward</span>
                {t('openInitializationManager')}
              </Link>
            </div>

            {/* Site Name Settings */}
            <SiteNameSettings />

            {/* Pagination Settings */}
            <PaginationSettings />

            {/* Backup Settings */}
            <BackupSettings />

            {/* Clear All Students Settings */}
            <ClearAllStudentsSettings />

            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  )
}
