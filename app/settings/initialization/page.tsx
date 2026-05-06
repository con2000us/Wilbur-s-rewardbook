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

      <div className="relative z-10 p-6 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center text-3xl shadow-lg ring-4 ring-white/80 flex-shrink-0">
                🧭
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-slate-600 text-base md:text-lg font-semibold">{t('desc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="px-4 py-2.5 rounded-2xl bg-white/80 border border-white/90 text-slate-700 hover:bg-white hover:text-slate-900 shadow-sm"
              >
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
