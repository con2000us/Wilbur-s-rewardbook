import { getTranslations } from 'next-intl/server'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SiteNameSettings from './SiteNameSettings'
import PaginationSettings from './PaginationSettings'
import BackupSettings from './BackupSettings'
import HomeButton from '@/app/components/HomeButton'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景漸層 - 多層效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-gray-700"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-slate-400/30"></div>
      
      {/* 內容區域 */}
      <div className="relative z-10 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
            <div className="flex items-center gap-4">
              {/* 設定圖標 */}
              <div 
                className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center text-3xl shadow-2xl ring-4 ring-white/30 flex-shrink-0"
                style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))' }}
              >
                ⚙️
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 0, 0, 0.3)' }}>
                  {t('title')}
                </h1>
                <p className="text-slate-300 text-base md:text-lg font-semibold" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)' }}>
                  系統設定與偏好
                </p>
              </div>
            </div>
            <HomeButton />
          </div>

          {/* 主內容區域 */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Site Name Settings */}
            <SiteNameSettings />

            {/* Pagination Settings */}
            <PaginationSettings />

            {/* Backup Settings */}
            <BackupSettings />

            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  )
}
