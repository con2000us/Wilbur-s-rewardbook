'use client'

import { useState } from 'react'
import Link from 'next/link'

const rewardBalances = [
  {
    name: '獎金',
    amount: '$350',
    unit: '可用餘額',
    icon: 'account_balance_wallet',
    color: '#6a99e0',
    tint: 'rgba(106, 153, 224, 0.16)',
  },
  {
    name: '星星',
    amount: '42 顆',
    unit: '可用餘額',
    icon: 'star',
    color: '#F59E0B',
    tint: 'rgba(245, 158, 11, 0.16)',
  },
  {
    name: '點數',
    amount: '120 點',
    unit: '可用餘額',
    icon: 'toll',
    color: '#10B981',
    tint: 'rgba(16, 185, 129, 0.16)',
  },
  {
    name: '愛心',
    amount: '18 顆',
    unit: '可用餘額',
    icon: 'favorite',
    color: '#F43F5E',
    tint: 'rgba(244, 63, 94, 0.14)',
  },
  {
    name: '寶石',
    amount: '7 顆',
    unit: '可用餘額',
    icon: 'diamond',
    color: '#A855F7',
    tint: 'rgba(168, 85, 247, 0.14)',
  },
  {
    name: '閱讀章',
    amount: '13 枚',
    unit: '可用餘額',
    icon: 'local_library',
    color: '#06B6D4',
    tint: 'rgba(6, 182, 212, 0.14)',
  },
]

const goals = [
  {
    name: '新腳踏車',
    description: '完成後消耗獎勵',
    status: '進行中',
    statusClass: 'bg-blue-50 text-blue-700 border-blue-100',
    icon: 'directions_bike',
    progress: 90,
    current: '450',
    target: '500',
    unit: '獎金',
    trackingType: '獎金',
    startDate: '2026/05/01',
    reward: '無額外獎勵',
    action: '尚未達成',
    actionDisabled: true,
    color: '#6a99e0',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: '週末看電影',
    description: '里程碑模式',
    status: '可完成',
    statusClass: 'bg-amber-50 text-amber-700 border-amber-100',
    icon: 'movie',
    progress: 100,
    current: '30',
    target: '30',
    unit: '星星',
    trackingType: '星星',
    startDate: '2026/06/10',
    reward: '+50 點',
    action: '完成目標',
    actionDisabled: false,
    color: '#F59E0B',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: '閱讀計畫',
    description: '完成後消耗獎勵',
    status: '進行中',
    statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: 'menu_book',
    progress: 64,
    current: '16',
    target: '25',
    unit: '次',
    trackingType: '閱讀事件',
    startDate: '2026/05/20',
    reward: '+100 獎金',
    action: '尚未達成',
    actionDisabled: true,
    color: '#10B981',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&q=80',
  },
]

const exchangeItems = [
  {
    name: '看一集動畫',
    cost: '50 點',
    balanceAfter: '兌換後剩 70 點',
    icon: 'smart_display',
    canExchange: true,
  },
  {
    name: '遊戲時間 30 分鐘',
    cost: '80 點',
    balanceAfter: '兌換後剩 40 點',
    icon: 'sports_esports',
    canExchange: true,
  },
  {
    name: '小玩具',
    cost: '200 點',
    balanceAfter: '還差 80 點',
    icon: 'toys',
    canExchange: false,
  },
  {
    name: '週末點心',
    cost: '$120',
    balanceAfter: '兌換後剩 $230',
    icon: 'bakery_dining',
    canExchange: true,
  },
]

const recentRecords = [
  {
    title: '日常作業完成',
    date: '2026/07/01',
    amount: '+10 點',
    type: '獲得',
    icon: 'add',
    tone: 'emerald',
  },
  {
    title: '兌換：看一集動畫',
    date: '2026/06/28',
    amount: '-50 點',
    type: '兌換',
    icon: 'redeem',
    tone: 'rose',
    group: 'exchange-1',
  },
  {
    title: '退回：兌換差額',
    date: '2026/06/28',
    amount: '+5 點',
    type: '退回',
    icon: 'undo',
    tone: 'blue',
    group: 'exchange-1',
  },
  {
    title: '大型目標：閱讀計畫',
    date: '2026/06/25',
    amount: '+100 獎金',
    type: '大型目標',
    icon: 'emoji_events',
    tone: 'amber',
  },
]

const quickNavItems = [
  { label: '學生概況', icon: 'dashboard', href: '/' },
  { label: '評量紀錄', icon: 'assignment', href: '/' },
  { label: '獎勵管理', icon: 'stars', href: '#', active: true },
  { label: '獎勵存摺', icon: 'account_balance_wallet', href: '/student/demo/transactions' },
  { label: '科目管理', icon: 'menu_book', href: '/' },
  { label: '列印報表', icon: 'print', href: '/' },
]

const dashboardTabs = [
  { id: 'goals', label: '大型目標', icon: 'flag', count: goals.length },
  { id: 'shop', label: '兌換商店', icon: 'storefront', count: exchangeItems.length },
  { id: 'records', label: '最近紀錄', icon: 'history', count: recentRecords.length },
] as const

function toneClass(tone: string) {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700'
    case 'rose':
      return 'bg-rose-50 text-rose-700'
    case 'blue':
      return 'bg-blue-50 text-blue-700'
    case 'amber':
      return 'bg-amber-50 text-amber-700'
    default:
      return 'bg-slate-50 text-slate-700'
  }
}

export default function StudentRewardsDashboardDemoPage() {
  const [activeTab, setActiveTab] = useState<(typeof dashboardTabs)[number]['id']>('goals')
  const [activeGoalIndex, setActiveGoalIndex] = useState(0)
  const activeGoal = goals[activeGoalIndex] || goals[0]
  const previousGoal = () => setActiveGoalIndex((current) => (current === 0 ? goals.length - 1 : current - 1))
  const nextGoal = () => setActiveGoalIndex((current) => (current === goals.length - 1 ? 0 : current + 1))

  return (
    <div className="min-h-screen bg-app-shell p-4 text-slate-800 md:p-8">
      <main className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl gap-5 rounded-3xl glass-panel p-4 md:min-h-[calc(100vh-4rem)] md:p-7 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="relative z-10 lg:sticky lg:top-6">
          <div className="rounded-3xl bg-white/48 p-4 ring-1 ring-white/65">
            <div className="mb-5 flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/70 text-3xl shadow-sm ring-1 ring-white/80">
                  昊
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">目前學生</p>
                <h2 className="truncate text-xl font-black text-slate-900">王小明</h2>
                <p className="mt-1 text-xs text-slate-500">快速導覽</p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/62 p-3 text-center ring-1 ring-white/70">
                <div className="text-lg font-black text-slate-800">3</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-400">目標</div>
              </div>
              <div className="rounded-2xl bg-white/62 p-3 text-center ring-1 ring-white/70">
                <div className="text-lg font-black text-emerald-600">1</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-400">可完成</div>
              </div>
              <div className="rounded-2xl bg-white/62 p-3 text-center ring-1 ring-white/70">
                <div className="text-lg font-black text-amber-600">6</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-400">獎勵</div>
              </div>
            </div>

            <nav className="space-y-1.5">
              {quickNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${
                    item.active
                      ? 'sidebar-item-active text-primary'
                      : 'text-slate-600 hover:bg-white/55 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </Link>
              ))}
            </nav>

            <Link
              href="/"
              className="student-toolbar-primary mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition"
            >
              <span className="material-symbols-outlined text-lg">home</span>
              返回首頁
            </Link>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
        <section>
          <div className="flex flex-col gap-4 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
            <div className="flex items-start gap-3">
              <span className="material-icons-outlined flex-shrink-0 text-3xl text-blue-600 drop-shadow-sm">
                stars
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">獎勵管理</h1>
                <p className="text-sm text-slate-500">查看王小明的獎勵餘額與目標進度</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/student/demo/transactions"
                className="student-toolbar-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-base font-bold transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-icons-outlined text-lg">receipt_long</span>
                完整存摺
              </Link>
              <Link
                href="/"
                className="student-toolbar-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-base font-bold transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-icons-outlined text-lg">home</span>
                首頁
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {rewardBalances.map((item) => (
              <article
                key={item.name}
                className="reward-card-shadow min-h-36 rounded-2xl bg-white/68 p-4 ring-1 ring-white/70"
              >
                <div className="flex h-full flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-sm font-semibold text-slate-500">
                      <span className="material-symbols-outlined mb-1 block text-lg" style={{ color: item.color }}>
                        {item.icon}
                      </span>
                      <span className="block truncate">{item.name}</span>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: item.tint, color: item.color }}
                    >
                      <span className="material-symbols-outlined text-xl [font-variation-settings:'FILL'_1]">
                        {item.icon}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black leading-tight text-slate-900">{item.amount}</div>
                    <p className="mt-1 text-xs font-medium text-slate-400">{item.unit}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex min-w-max flex-nowrap items-center gap-1 rounded-full border border-white/40 bg-white/60 p-1.5 shadow-sm backdrop-blur-sm">
              {dashboardTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white font-bold text-slate-800 shadow-sm'
                      : 'font-medium text-slate-500 hover:bg-white/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
          <div className={activeTab === 'goals' ? 'block' : 'hidden'}>
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <span className="material-symbols-outlined text-primary">flag</span>
                    大型目標
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">只顯示已指派到此學生的目標</p>
                </div>
                <Link
                  href="/settings/rewards?tab=goalTemplates"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white/70 px-4 text-sm font-semibold text-primary shadow-sm ring-1 ring-white/80 transition hover:bg-white"
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  前往指派目標
                </Link>
              </div>

              <article
                className="relative min-h-[520px] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl shadow-slate-900/15"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.64) 45%, rgba(15, 23, 42, 0.24) 100%), url(${activeGoal.imageUrl})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }}
              >
                <div className="flex min-h-[520px] flex-col justify-between p-5 text-white md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ring-1 ring-white/30"
                        style={{ backgroundColor: activeGoal.color }}
                      >
                        <span className="material-symbols-outlined text-3xl">{activeGoal.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white/70">大型目標 {activeGoalIndex + 1} / {goals.length}</p>
                        <h3 className="mt-1 truncate text-3xl font-black md:text-5xl">{activeGoal.name}</h3>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border border-white/30 bg-white/88 px-3 py-1.5 text-xs font-black ${activeGoal.statusClass}`}>
                      {activeGoal.status}
                    </span>
                  </div>

                  <div className="max-w-2xl">
                    <p className="mb-5 text-base font-medium text-white/78 md:text-lg">{activeGoal.description}</p>
                    <div className="rounded-3xl bg-white/18 p-4 backdrop-blur-md ring-1 ring-white/25 md:p-5">
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white/65">目前進度</p>
                          <p className="mt-1 text-3xl font-black md:text-4xl">
                            {activeGoal.current}
                            <span className="mx-2 text-xl text-white/55">/</span>
                            {activeGoal.target}
                            <span className="ml-2 text-base font-bold text-white/70">{activeGoal.unit}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white/65">完成率</p>
                          <p className="text-3xl font-black">{activeGoal.progress}%</p>
                        </div>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/24">
                        <div
                          className="progress-bar-fill h-full rounded-full"
                          style={{ width: `${activeGoal.progress}%`, backgroundColor: activeGoal.color }}
                        />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm font-medium text-white/78 sm:grid-cols-3">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">category</span>
                          追蹤：{activeGoal.trackingType}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">calendar_today</span>
                          起算：{activeGoal.startDate}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">card_giftcard</span>
                          獎勵：{activeGoal.reward}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        className={`min-h-11 rounded-full px-5 text-sm font-black transition sm:min-w-40 ${
                          activeGoal.actionDisabled
                            ? 'cursor-not-allowed bg-white/24 text-white/58 ring-1 ring-white/25'
                            : 'bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-300'
                        }`}
                        disabled={activeGoal.actionDisabled}
                      >
                        {activeGoal.action}
                      </button>
                      <button className="min-h-11 rounded-full bg-white/20 px-5 text-sm font-bold text-white backdrop-blur-md ring-1 ring-white/25 transition hover:bg-white/28">
                        查看詳情
                      </button>
                    </div>
                  </div>
                </div>
              </article>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={previousGoal}
                  className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/75 text-slate-600 shadow-sm ring-1 ring-white/80 transition hover:bg-white md:flex"
                  aria-label="上一個大型目標"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto p-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {goals.map((goal, index) => (
                    <button
                      key={goal.name}
                      type="button"
                      onClick={() => setActiveGoalIndex(index)}
                      className={`flex min-h-16 min-w-[190px] items-center gap-3 rounded-2xl px-4 text-left transition sm:min-w-[220px] ${
                        activeGoalIndex === index
                          ? 'bg-white text-slate-900 shadow-sm ring-2 ring-primary/45'
                          : 'bg-white/55 text-slate-600 ring-1 ring-white/70 hover:bg-white/75'
                      }`}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: goal.color }}
                      >
                        <span className="material-symbols-outlined text-xl">{goal.icon}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{goal.name}</span>
                        <span className="mt-0.5 block text-xs font-semibold opacity-70">{goal.progress}% 完成</span>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={nextGoal}
                  className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/75 text-slate-600 shadow-sm ring-1 ring-white/80 transition hover:bg-white md:flex"
                  aria-label="下一個大型目標"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
            </section>
          </div>

          <div className={activeTab === 'shop' ? 'block' : 'hidden'}>
            <section>
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <span className="material-symbols-outlined text-primary">storefront</span>
                  兌換商店
                </h2>
                <p className="mt-1 text-sm text-slate-500">兌換項由全域設定管理，學生頁只負責執行兌換</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {exchangeItems.map((item) => (
                  <article
                    key={item.name}
                    className={`store-card flex min-h-48 flex-col rounded-2xl bg-white/66 p-4 ring-1 ring-white/70 ${
                      item.canExchange ? '' : 'opacity-70'
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.canExchange
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.canExchange ? '可兌換' : '餘額不足'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-primary">花費：{item.cost}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.balanceAfter}</p>
                    <button
                      className={`mt-auto min-h-10 rounded-full px-4 text-sm font-bold transition ${
                        item.canExchange
                          ? 'bg-white/75 text-primary ring-1 ring-white/90 hover:bg-white'
                          : 'cursor-not-allowed bg-white/45 text-slate-400 ring-1 ring-white/70'
                      }`}
                      disabled={!item.canExchange}
                    >
                      兌換
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className={activeTab === 'records' ? 'block' : 'hidden'}>
          <aside>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <span className="material-symbols-outlined text-primary">history</span>
                  最近獎勵紀錄
                </h2>
                <p className="mt-1 text-sm text-slate-500">完整紀錄請到獎勵存摺查看</p>
              </div>
            </div>

            <div className="space-y-2">
              {recentRecords.map((record, index) => (
                <div
                  key={`${record.title}-${index}`}
                  className={`flex gap-3 rounded-2xl p-3 ring-1 ring-white/60 ${
                    record.group ? 'bg-blue-50/55' : 'bg-white/60'
                  }`}
                >
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClass(record.tone)}`}>
                    <span className="material-symbols-outlined text-lg">{record.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-bold text-slate-800">{record.title}</h3>
                      <span className="shrink-0 text-sm font-black text-slate-800">{record.amount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{record.date}</span>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 font-semibold">{record.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/student/demo/transactions"
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-white/75 px-4 text-sm font-bold text-primary ring-1 ring-white/90 transition hover:bg-white"
            >
              查看完整存摺
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </aside>
        </div>
        </div>
        </section>
        </div>
      </main>
    </div>
  )
}
