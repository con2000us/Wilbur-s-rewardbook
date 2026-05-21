import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import HomeButton from '@/app/components/HomeButton'
import InitializationManager from './InitializationManager'

export default async function InitializationPage() {
  const t = await getTranslations('settingsInit')

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-app-shell"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-sky-200/20"></div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">explore</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-slate-500 text-sm">{t('desc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition shadow-sm"
              >
                <span className="material-icons-outlined text-base">arrow_back</span>
                {t('backToSettings')}
              </Link>
              <HomeButton />
            </div>
          </div>

          <InitializationManager />
        </div>
      </div>
    </div>
  )
}
