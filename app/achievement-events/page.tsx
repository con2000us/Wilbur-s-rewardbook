'use client'

import HomeButton from '@/app/components/HomeButton'
import AchievementEventsManager from './AchievementEventsManager'
import { useTranslations } from 'next-intl'

export default function AchievementEventsPage() {
  const t = useTranslations('achievementEvents')

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-app-shell"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-100/30 to-amber-200/20"></div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">emoji_events</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-slate-500 text-sm">
                  {t('pageSubtitle')}
                </p>
              </div>
            </div>
            <HomeButton />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <AchievementEventsManager />
          </div>
        </div>
      </div>
    </div>
  )
}
