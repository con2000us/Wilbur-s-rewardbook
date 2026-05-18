import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SiteNameSettings from './SiteNameSettings'
import PaginationSettings from './PaginationSettings'
import ResourceModeSettings from './ResourceModeSettings'
import BackupSettings from './BackupSettings'
import ClearAllStudentsSettings from './ClearAllStudentsSettings'
import HomeButton from '@/app/components/HomeButton'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-app-shell"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-sky-200/20"></div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">settings</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-slate-500 text-sm">管理與客製化您的系統環境</p>
              </div>
            </div>
            <HomeButton />
          </div>

          <main className="space-y-6">
            <SiteNameSettings />
            <PaginationSettings />
            <ResourceModeSettings />
            <BackupSettings />

            <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-1">{t('rewardsCenter')}</h2>
                  <p className="text-sm text-slate-500">{t('rewardsCenterDesc')}</p>
                </div>
                <Link
                  href="/settings/rewards"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-pink-400 to-purple-500 text-white hover:opacity-90 transition-opacity font-semibold text-sm"
                >
                  {t('openRewardsCenter')}
                  <span className="material-icons-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-1">{t('initializationManager')}</h2>
                  <p className="text-sm text-slate-500">{t('initializationManagerDesc')}</p>
                </div>
                <Link
                  href="/settings/initialization"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity font-semibold text-sm"
                >
                  {t('openInitializationManager')}
                  <span className="material-icons-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            </section>

            <ClearAllStudentsSettings />
            <LanguageSwitcher />
          </main>
        </div>
      </div>
    </div>
  )
}
