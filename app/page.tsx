import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import LanguageToggle from './components/LanguageToggle'
import LogoutButton from './components/LogoutButton'
import StudentList from './components/StudentList'

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* 語言切換與設置按鈕 - 右上角 */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <Link 
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 font-bold text-gray-800 text-base"
          >
            <span className="text-2xl">⚙️</span>
            <span>{tNav('settings')}</span>
          </Link>
          <LanguageToggle />
          <LogoutButton />
        </div>

        {/* 主標題區域 - 大而突出 */}
        <div className="text-center mb-8">
          <h1 className="text-8xl font-bold text-white mb-4 drop-shadow-2xl animate-fade-in">
            📚 {siteName}
          </h1>
          <p className="text-2xl text-purple-100 font-medium mb-8">
            {t('subtitle')}
          </p>
        </div>

        {/* 學生列表 */}
        <StudentList initialStudents={students || []} />

        {/* 功能卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/30">
            <div className="text-5xl mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">📝</div>
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{t('features.records.title')}</h3>
            <p className="text-white text-sm drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">{t('features.records.desc')}</p>
          </div>
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/30">
            <div className="text-5xl mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">💎</div>
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{t('features.rewards.title')}</h3>
            <p className="text-white text-sm drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">{t('features.rewards.desc')}</p>
          </div>
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/30">
            <div className="text-5xl mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">📚</div>
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{t('features.subjects.title')}</h3>
            <p className="text-white text-sm drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">{t('features.subjects.desc')}</p>
          </div>
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-white/30">
            <div className="text-5xl mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">💰</div>
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{t('features.passbook.title')}</h3>
            <p className="text-white text-sm drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">{t('features.passbook.desc')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
