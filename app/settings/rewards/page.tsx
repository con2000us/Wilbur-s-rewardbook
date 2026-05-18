'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import HomeButton from '@/app/components/HomeButton'
import CustomRewardTypesManager from '@/app/settings/CustomRewardTypesManager'
import AchievementEventsManager from '@/app/achievement-events/AchievementEventsManager'
import GoalTemplatesManager from './GoalTemplatesManager'
import ExchangeRulesManager from './ExchangeRulesManager'

const TABS = [
  { id: 'rewardTypes', icon: 'category', labelKey: 'tabRewardTypes' },
  { id: 'achievementEvents', icon: 'emoji_events', labelKey: 'tabAchievementEvents' },
  { id: 'goalTemplates', icon: 'flag', labelKey: 'tabGoalTemplates' },
  { id: 'exchangeRules', icon: 'swap_horiz', labelKey: 'tabExchangeRules' },
] as const

type TabId = typeof TABS[number]['id']

function parseTab(tab: string | null): TabId {
  return TABS.some((item) => item.id === tab) ? (tab as TabId) : 'rewardTypes'
}

export default function SettingsRewardsPage() {
  const t = useTranslations('settingsRewards')
  const searchParams = useSearchParams()
  const queryTab = parseTab(searchParams.get('tab'))
  const [selectedTab, setSelectedTab] = useState<TabId | null>(null)
  const activeTab = selectedTab || queryTab

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-app-shell"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-pink-50/30 to-orange-100/20"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent"></div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-pink-400 to-purple-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">stars</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-slate-500 text-sm">{t('subtitle')}</p>
              </div>
            </div>
            <HomeButton />
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 mb-6 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/60 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 min-w-[120px] justify-center ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                <span className="material-icons-outlined text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
            {activeTab === 'rewardTypes' && <CustomRewardTypesManager />}
            {activeTab === 'achievementEvents' && <AchievementEventsManager />}
            {activeTab === 'goalTemplates' && <GoalTemplatesManager />}
            {activeTab === 'exchangeRules' && <ExchangeRulesManager />}
          </div>
        </div>
      </div>
    </div>
  )
}
