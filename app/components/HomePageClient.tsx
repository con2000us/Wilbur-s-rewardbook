'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import LanguageToggle from './LanguageToggle'
import LogoutButton from './LogoutButton'
import StudentList from './StudentList'

interface Student {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
  display_order: number
}

interface Props {
  students: Student[]
  siteName: string
}

export default function HomePageClient({ students, siteName }: Props) {
  const t = useTranslations('home')

  return (
    <>
      <div className="min-h-screen bg-app-shell p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* 語言切換與設置按鈕 - 右上角 */}
          <div className="flex justify-end items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
            {/* 首頁按鈕 */}
            <Link
              href="/"
              className="w-12 h-12 flex items-center justify-center gap-2 px-4 rounded-2xl active:scale-95 transition-all bg-white/70 backdrop-blur-md border border-white/90 shadow-sm text-slate-700 hover:bg-white/90 hover:text-slate-900"
              title="首頁"
            >
              <span className="material-icons-round text-2xl sm:text-2xl">home</span>
            </Link>
            <Link
              href="/settings"
              className="w-12 h-12 flex items-center justify-center gap-2 px-4 rounded-2xl active:scale-95 transition-all bg-white/70 backdrop-blur-md border border-white/90 shadow-sm text-slate-700 hover:bg-white/90 hover:text-slate-900"
            >
              <span className="material-icons-round text-2xl sm:text-2xl">settings</span>
            </Link>
            <LanguageToggle />
            <LogoutButton />
          </div>

          {/* 主標題區域 - 大而突出 */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[41.4px] font-bold text-slate-800 mb-3 md:mb-4 animate-fade-in">
              📚 {siteName}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mb-6 md:mb-8">
              {t('subtitle')}
            </p>
          </div>

          {/* 學生列表 */}
          <StudentList initialStudents={students || []} />

          {/* 全域管理區塊 */}
          <div className="mt-8 sm:mt-10 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-icons-outlined text-slate-500 text-xl">tune</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-700">{t('globalManagement.title')}</h2>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                {t('globalManagement.subtitle')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Link
                href="/reward-types"
                className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-5 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-purple-100 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 border-2 border-purple-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-icons-outlined text-purple-500 text-2xl">card_giftcard</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-0.5">{t('globalManagement.rewardTypes.title')}</h3>
                    <p className="text-xs sm:text-sm text-slate-500">{t('globalManagement.rewardTypes.desc')}</p>
                  </div>
                  <span className="material-icons-outlined text-slate-400 group-hover:text-purple-500 transition-colors">chevron_right</span>
                </div>
              </Link>
              <Link
                href="/achievement-events"
                className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-5 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-amber-100 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-icons-outlined text-amber-500 text-2xl">emoji_events</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-0.5">{t('globalManagement.achievementEvents.title')}</h3>
                    <p className="text-xs sm:text-sm text-slate-500">{t('globalManagement.achievementEvents.desc')}</p>
                  </div>
                  <span className="material-icons-outlined text-slate-400 group-hover:text-amber-500 transition-colors">chevron_right</span>
                </div>
              </Link>
              <Link
                href="/major-goals"
                className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-5 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border-2 border-sky-100 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 border-2 border-sky-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-icons-outlined text-sky-500 text-2xl">flag</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-0.5">{t('globalManagement.majorGoals.title')}</h3>
                    <p className="text-xs sm:text-sm text-slate-500">{t('globalManagement.majorGoals.desc')}</p>
                  </div>
                  <span className="material-icons-outlined text-slate-400 group-hover:text-sky-500 transition-colors">chevron_right</span>
                </div>
              </Link>
            </div>
          </div>

          {/* 功能說明卡片 */}
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
    </>
  )
}
