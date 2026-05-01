'use client'

import HomeButton from '@/app/components/HomeButton'
import CustomRewardTypesManager from '@/app/settings/CustomRewardTypesManager'

export default function RewardTypesPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-app-shell"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-100/30 to-purple-200/20"></div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">card_giftcard</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">獎勵類型管理</h1>
                <p className="text-slate-500 text-sm">管理全域獎勵定義與設定</p>
              </div>
            </div>
            <HomeButton />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <CustomRewardTypesManager />
          </div>
        </div>
      </div>
    </div>
  )
}
