'use client'

import { useTranslations, useLocale } from 'next-intl'

interface PassbookSidebarContentProps {
  transactions: any[]
  summary: any
}

export default function PassbookSidebarContent({
  transactions,
  summary
}: PassbookSidebarContentProps) {
  const t = useTranslations('student')
  const tTransaction = useTranslations('transaction')
  const locale = useLocale()

  // 計算所有交易的收支（不使用月份過濾）
  const totalEarned = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0) || 0

  const totalSpent = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  const totalBalance = totalEarned - totalSpent

  return (
    <div className="flex flex-col gap-6">
      {/* 收支概況 */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-blue-50/50 dark:border-slate-700/50">
        <div className="flex items-center gap-2 text-blue-500 mb-6">
          <span className="material-icons-outlined text-sm">account_balance_wallet</span>
          <span className="text-xs font-bold uppercase tracking-wide">{t('financialOverview')}</span>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">{t('income')}</span>
            <span className="text-emerald-500 font-bold">${totalEarned}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">{t('expense')}</span>
            <span className="text-rose-500 font-bold">${totalSpent}</span>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="font-bold">{t('balance')}</span>
            <span className="text-2xl font-black">${totalBalance}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
