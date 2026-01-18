import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import LanguageToggle from './components/LanguageToggle'
import LogoutButton from './components/LogoutButton'
import StudentList from './components/StudentList'

// 首頁獨立的 viewport 設置 - 使用原本的 initialScale
export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  themeColor: '#6a99e0',
  viewportFit: 'cover',
}

export default async function Home() {
  const supabase = createClient()
  const t = await getTranslations('home')
  const tNav = await getTranslations('nav')
  
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .order('display_order', { ascending: true })

  const { data: siteNameSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'site_name')
    .single()
  
  // @ts-ignore - Supabase type inference issue with select queries
  const siteName = (siteNameSetting as any)?.value || t('title')

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* 語言切換與設置按鈕 - 右上角 */}
        <div className="flex justify-end items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Link
            href="/settings"
            className="glass w-12 h-12 flex items-center justify-center gap-2 px-4 rounded-2xl active:scale-95 transition-all text-white/90 hover:text-white"
          >
            <span className="material-icons-round text-2xl sm:text-2xl">settings</span>
          </Link>
          <LanguageToggle />
          <LogoutButton />
        </div>

        {/* 主標題區域 - 大而突出 */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[41.4px] font-bold text-white mb-3 md:mb-4 drop-shadow-2xl animate-fade-in">
            📚 {siteName}
          </h1>
          <p className="text-base sm:text-lg text-purple-100 mb-6 md:mb-8">
            {t('subtitle')}
          </p>
        </div>

        {/* 學生列表 */}
        <StudentList initialStudents={students || []} />

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 features-grid">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/50">
            <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">📝</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{t('features.records.title')}</h3>
            <p className="text-xs sm:text-sm text-gray-800">{t('features.records.desc')}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/50">
            <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">💎</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{t('features.rewards.title')}</h3>
            <p className="text-xs sm:text-sm text-gray-800">{t('features.rewards.desc')}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/50">
            <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">📚</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{t('features.subjects.title')}</h3>
            <p className="text-xs sm:text-sm text-gray-800">{t('features.subjects.desc')}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/50">
            <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">💰</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{t('features.passbook.title')}</h3>
            <p className="text-xs sm:text-sm text-gray-800">{t('features.passbook.desc')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
