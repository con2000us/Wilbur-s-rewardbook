'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── 模擬資料 ──────────────────────────────────────────────

const MOCK_STUDENT = {
  id: 'demo-student-1',
  name: '小明',
  emoji: '🦊',
  gradientStyle: 'from-blue-400 to-cyan-300'
}

const MOCK_REWARD_TYPES = [
  { id: 'rt-1', type_key: 'points',   display_name: '點數', icon: '⭐', color: '#6a99e0', default_unit: '點', is_accumulable: true },
  { id: 'rt-2', type_key: 'money',    display_name: '金錢', icon: '💰', color: '#10B981', default_unit: '元', is_accumulable: true },
  { id: 'rt-3', type_key: 'hearts',   display_name: '愛心', icon: '❤️', color: '#F43F5E', default_unit: '顆', is_accumulable: true },
  { id: 'rt-4', type_key: 'stars',    display_name: '星星', icon: '🌟', color: '#F59E0B', default_unit: '顆', is_accumulable: true },
  { id: 'rt-5', type_key: 'diamonds', display_name: '鑽石', icon: '💎', color: '#A855F7', default_unit: '顆', is_accumulable: true },
]

const MOCK_BALANCES: Record<string, number> = {
  'rt-1': 320,
  'rt-2': 150,
  'rt-3': 8,
  'rt-4': 12,
  'rt-5': 5,
}

const MOCK_GOALS = [
  {
    id: 'goal-1',
    name: '期末考數學滿分',
    icon: '🏆',
    color: '#F59E0B',
    eventName: '考試滿分',
    targetAmount: 500,
    currentAmount: 320,
    rewardTypeId: 'rt-1',
    rewardTypeName: '點數',
    rewardUnit: '⭐',
    rewardOnComplete: 200,
    deadline: '2026-06-30',
    daysLeft: 50,
    mode: 'amount' as const,
    lastActivity: '數學小考 95分 +30⭐ · 2天前',
  },
  {
    id: 'goal-2',
    name: '學期閱讀計畫',
    icon: '📚',
    color: '#6a99e0',
    eventName: '自訂目標',
    targetCount: 10,
    currentCount: 3,
    rewardTypeId: 'rt-1',
    rewardTypeName: '點數',
    rewardUnit: '⭐',
    rewardOnComplete: 300,
    deadline: '2026-07-15',
    daysLeft: 65,
    mode: 'count' as const,
    lastActivity: '讀完《小王子》· 5天前',
  },
  {
    id: 'goal-3',
    name: '幫助同學好習慣',
    icon: '🤝',
    color: '#F43F5E',
    eventName: '幫助同學',
    targetCount: 20,
    currentCount: 7,
    rewardTypeId: 'rt-3',
    rewardTypeName: '愛心',
    rewardUnit: '❤️',
    rewardOnComplete: 50,
    deadline: null,
    daysLeft: null,
    mode: 'count' as const,
    lastActivity: '幫助同學解數學題 · 昨天',
  },
]

const MOCK_EXCHANGE_ITEMS = [
  { id: 'ex-1', name: '樂高積木組',       icon: '🧱', requiredAmount: 200, requiredTypeId: 'rt-1', requiredTypeName: '⭐', currentBalance: 320, canExchange: true  },
  { id: 'ex-2', name: '30分鐘遊戲時間',    icon: '🎮', requiredAmount: 50,  requiredTypeId: 'rt-1', requiredTypeName: '⭐', currentBalance: 320, canExchange: true  },
  { id: 'ex-3', name: '新故事書',         icon: '📖', requiredAmount: 100, requiredTypeId: 'rt-1', requiredTypeName: '⭐', currentBalance: 320, canExchange: true  },
  { id: 'ex-4', name: '遊樂園一日遊',      icon: '🎢', requiredAmount: 500, requiredTypeId: 'rt-1', requiredTypeName: '⭐', currentBalance: 320, canExchange: false, shortfall: 180 },
  { id: 'ex-5', name: '披薩派對',         icon: '🍕', requiredAmount: 300, requiredTypeId: 'rt-1', requiredTypeName: '⭐', currentBalance: 320, canExchange: true  },
  { id: 'ex-6', name: '換取 5 次免作業券', icon: '🎫', requiredAmount: 4,   requiredTypeId: 'rt-5', requiredTypeName: '💎', currentBalance: 5,   canExchange: true  },
]

// ── 輔助函式 ──────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getProgressPercent(current: number, target: number): number {
  return Math.min(Math.round((current / target) * 100), 100)
}

// ── 主元件 ────────────────────────────────────────────────

export default function RewardGoalsDemoPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'goals' | 'history'>('goals')
  const [showAddReward, setShowAddReward] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showExchangeConfirm, setShowExchangeConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="min-h-screen p-4 md:p-10 flex justify-center items-start text-gray-800" style={{
      background: 'linear-gradient(135deg, #a7d9ef 0%, #f7b2c9 50%, #fcd6b6 100%)'
    }}>
      <div className="w-full max-w-7xl glass-panel rounded-3xl p-6 md:p-10 min-h-[90vh] relative overflow-hidden flex flex-col lg:flex-row">

        {/* 裝飾性背景圓圈 */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-f7b2c9/40 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-a7d9ef/30 rounded-full blur-[90px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* ═══════════ 左側欄 ═══════════ */}
        <aside className="relative z-20 lg:w-80 lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8 p-4 lg:p-0 rounded-2xl lg:rounded-none lg:min-w-0">
          <div className="flex flex-col lg:items-start lg:sticky lg:top-0 w-full lg:min-w-0">

            {/* 學生頭像區 */}
            <div className="flex items-center gap-4 mb-6 w-full">
              <div className="relative group flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-300 to-primary rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-16 h-16 rounded-full bg-white/40 flex items-center justify-center border border-white/60">
                  <span className="text-3xl leading-none" style={{ transform: 'translateY(-3px)' }}>
                    {MOCK_STUDENT.emoji}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 truncate">
                  {MOCK_STUDENT.name}
                </h2>
                <p className="text-sm text-primary font-medium">獎勵目標</p>
              </div>
            </div>

            {/* 快速統計 */}
            <div className="grid grid-cols-3 gap-3 mb-6 w-full">
              <div className="glass-card p-3 rounded-2xl text-center border border-blue-50/50">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">進行中</span>
                <span className="text-xl font-black text-slate-700">{MOCK_GOALS.length}</span>
                <span className="block text-[10px] text-slate-400">個目標</span>
              </div>
              <div className="glass-card p-3 rounded-2xl text-center border border-blue-50/50">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">已達成</span>
                <span className="text-xl font-black text-emerald-500">2</span>
                <span className="block text-[10px] text-slate-400">個目標</span>
              </div>
              <div className="glass-card p-3 rounded-2xl text-center border border-blue-50/50">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">累積獎勵</span>
                <span className="text-xl font-black text-amber-500">970</span>
                <span className="block text-[10px] text-slate-400">⭐</span>
              </div>
            </div>

            {/* 快速導覽 */}
            <nav className="w-full space-y-1.5 mb-6">
              {[
                { icon: 'description',    label: '學習記錄', href: '/' },
                { icon: 'menu_book',      label: '科目管理', href: '/' },
                { icon: 'account_balance_wallet', label: '獎金存摺', href: '/' },
                { icon: 'track_changes',  label: '獎勵目標', href: '#', active: true },
                { icon: 'print',          label: '列印報表', href: '/' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.href !== '#' && router.push('/')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer
                    ${item.active
                      ? 'sidebar-item-active text-primary shadow-sm'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
                    }`}
                >
                  <span className="material-icons-outlined text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </nav>

            {/* 返回首頁 */}
            <button
              onClick={() => router.push('/')}
              className="student-toolbar-primary w-full min-h-11 px-5 py-2.5 rounded-full transition-all cursor-pointer inline-flex items-center justify-center gap-2 text-base font-semibold hover:scale-105 active:scale-95"
            >
              <span className="material-icons-outlined text-[1.375rem] leading-none">home</span>
              <span>返回首頁</span>
            </button>
          </div>
        </aside>

        {/* ═══════════ 主內容區 ═══════════ */}
        <main className="relative z-10 flex-1 min-w-0">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">track_changes</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">獎勵目標</h1>
                <p className="text-sm text-gray-500">設定目標、追蹤進度、兌換獎勵</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 快速添加獎勵 */}
              <button
                onClick={() => setShowAddReward(true)}
                className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-full shadow-lg shadow-green-500/20 transition-all cursor-pointer items-center justify-center gap-2 font-semibold text-sm"
              >
                <span className="material-icons-outlined text-lg">card_giftcard</span>
                <span>快速添加獎勵</span>
              </button>
              {/* 新增目標 */}
              <button
                onClick={() => setShowAddGoal(true)}
                className="hidden md:flex bg-primary hover:opacity-90 text-white px-4 py-2.5 rounded-full shadow-lg shadow-primary/20 transition-all cursor-pointer items-center justify-center gap-2 font-semibold text-sm"
              >
                <span className="material-icons-outlined text-lg">add</span>
                <span>新增目標</span>
              </button>
            </div>
          </div>

          {/* ── 區塊 ①：獎勵餘額總覽 ── */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="material-icons-outlined text-gray-400">dashboard</span>
                獎勵餘額
              </h2>
              {/* 手機版快速添加 */}
              <button
                onClick={() => setShowAddReward(true)}
                className="md:hidden flex bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer items-center gap-1 shadow-md"
              >
                <span className="material-icons-outlined text-sm">add</span>
                快速添加
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {MOCK_REWARD_TYPES.map((type) => {
                const balance = MOCK_BALANCES[type.id] || 0
                return (
                  <div
                    key={type.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    {/* 圖標 */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                      style={{ backgroundColor: hexToRgba(type.color, 0.12) }}
                    >
                      <span className="text-2xl">{type.icon}</span>
                    </div>
                    {/* 名稱 */}
                    <p className="text-xs font-medium text-gray-500 mb-1">{type.display_name}</p>
                    {/* 餘額 */}
                    <span className="text-2xl font-bold" style={{ color: type.color }}>
                      {balance.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400 mb-3">{type.default_unit}</span>
                    {/* 使用按鈕 */}
                    <button
                      className="w-full py-2 rounded-full text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ backgroundColor: type.color }}
                      onClick={(e) => { e.stopPropagation(); showToast(`已開啟 ${type.display_name} 使用介面（Demo）`) }}
                    >
                      使用
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── 區塊 ②：進行中的目標 ── */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="material-icons-outlined text-gray-400">flag</span>
                進行中的目標
              </h2>
              {/* 手機版新增目標 */}
              <button
                onClick={() => setShowAddGoal(true)}
                className="md:hidden flex bg-primary hover:opacity-90 text-white px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer items-center gap-1 shadow-md"
              >
                <span className="material-icons-outlined text-sm">add</span>
                新增目標
              </button>
            </div>

            <div className="space-y-4">
              {MOCK_GOALS.map((goal) => {
                const pct = goal.mode === 'amount'
                  ? getProgressPercent(goal.currentAmount, goal.targetAmount)
                  : getProgressPercent(goal.currentCount!, goal.targetCount!)
                const isUrgent = goal.daysLeft !== null && goal.daysLeft <= 7

                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      {/* 左側：目標資訊 */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: hexToRgba(goal.color, 0.12) }}
                        >
                          <span className="text-xl">{goal.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{goal.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 rounded-full px-2.5 py-0.5 text-gray-500">
                              {goal.eventName}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              達成獎勵 +{goal.rewardOnComplete}{goal.rewardUnit}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* 右側：期限 + 操作 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {goal.deadline && (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                            isUrgent
                              ? 'bg-red-50 text-red-500 border border-red-200'
                              : 'bg-blue-50 text-blue-500 border border-blue-200'
                          }`}>
                            {isUrgent ? `⚠️ 剩 ${goal.daysLeft} 天` : `剩 ${goal.daysLeft} 天`}
                          </span>
                        )}
                        {!goal.deadline && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 border border-gray-200 whitespace-nowrap">
                            無限期
                          </span>
                        )}
                        <button
                          className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          onClick={() => showToast(`編輯目標「${goal.name}」（Demo）`)}
                        >
                          <span className="material-icons-outlined text-base">more_horiz</span>
                        </button>
                      </div>
                    </div>

                    {/* 進度條 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">
                          {goal.mode === 'amount'
                            ? `${goal.currentAmount} / ${goal.targetAmount} ${goal.rewardUnit}`
                            : `${goal.currentCount} / ${goal.targetCount} 次`
                          }
                        </span>
                        <span className="text-xs font-bold" style={{ color: goal.color }}>{pct}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${hexToRgba(goal.color, 0.6)}, ${goal.color})`
                          }}
                        />
                      </div>
                    </div>

                    {/* 近期活動 + 操作 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 italic truncate max-w-[60%]">
                        {goal.lastActivity}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => showToast(`記錄「${goal.name}」進度（Demo）`)}
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10"
                        >
                          記錄進度
                        </button>
                        <button
                          onClick={() => showToast(`標記「${goal.name}」完成！獎勵 +${goal.rewardOnComplete}${goal.rewardUnit}`)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100"
                        >
                          標記完成
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── 區塊 ③：可兌換獎勵 ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="material-icons-outlined text-gray-400">redeem</span>
                可兌換獎勵
              </h2>
              <button
                onClick={() => showToast('新增兌換規則（Demo）')}
                className="text-primary text-sm font-bold flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="material-icons-outlined text-sm">add</span>
                新增兌換規則
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {MOCK_EXCHANGE_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* 頂部色條 */}
                  <div className="h-2" style={{ backgroundColor: item.canExchange ? '#10B981' : '#F59E0B' }} />

                  <div className="p-5 flex flex-col items-center text-center flex-1">
                    {/* 圖標 */}
                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                      <span className="text-3xl">{item.icon}</span>
                    </div>
                    {/* 獎品名稱 */}
                    <h4 className="font-bold text-gray-900 mb-2">{item.name}</h4>
                    {/* 所需金額 */}
                    <p className="text-sm text-gray-500 mb-2">
                      需要 {item.requiredAmount} {item.requiredTypeName}
                    </p>
                    {/* 餘額狀態 */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 ${
                      item.canExchange
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.canExchange ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {item.canExchange
                        ? `目前 ${item.currentBalance} ${item.requiredTypeName} · 可以兌換`
                        : `還差 ${item.shortfall} ${item.requiredTypeName}`
                      }
                    </div>

                    <div className="mt-auto w-full">
                      {item.canExchange ? (
                        <button
                          onClick={() => setShowExchangeConfirm(item.id)}
                          className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all cursor-pointer hover:opacity-90"
                          style={{ backgroundColor: '#10B981' }}
                        >
                          立即兌換
                        </button>
                      ) : (
                        <button
                          onClick={() => showToast(`已將「${item.name}」存入願望清單（Demo）`)}
                          className="w-full py-2.5 rounded-full text-sm font-bold text-amber-600 bg-amber-50 border border-amber-200 transition-all cursor-pointer hover:bg-amber-100"
                        >
                          <span className="flex items-center justify-center gap-1">
                            <span className="material-icons-outlined text-base">bookmark_border</span>
                            存入願望清單
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>

      {/* ═══════════ 模態框：快速添加獎勵 ═══════════ */}
      {showAddReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowAddReward(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="material-icons-outlined text-primary">card_giftcard</span>
                快速添加獎勵
              </h3>
              <button onClick={() => setShowAddReward(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors cursor-pointer">
                <span className="material-icons-outlined text-lg">close</span>
              </button>
            </div>

            {/* 事件模板快速選取 */}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">事件模板（可選）</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['🏆 考試滿分','📝 作業優良','🤝 幫助同學','📈 進步顯著','⭐ 準時交作業','📖 閱讀完成'].map((tpl) => (
                <button
                  key={tpl}
                  onClick={() => showToast(`已選取模板：${tpl}`)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  {tpl}
                </button>
              ))}
            </div>

            {/* 表單欄位（靜態展示） */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">獎勵類型 *</label>
                <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
                  <span>⭐ 點數</span>
                  <span className="material-icons-outlined text-gray-400 text-sm">expand_more</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">標題 *</label>
                <input
                  type="text"
                  placeholder="例如：數學小考表現優異"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">金額 *</label>
                <input
                  type="number"
                  placeholder="30"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">備註</label>
                <input
                  type="text"
                  placeholder="選填"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddReward(false)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => { setShowAddReward(false); showToast('獎勵添加成功！（Demo）') }}
                className="flex-1 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                確認添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ 模態框：新增目標 ═══════════ */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowAddGoal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="material-icons-outlined text-primary">flag</span>
                新增獎勵目標
              </h3>
              <button onClick={() => setShowAddGoal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors cursor-pointer">
                <span className="material-icons-outlined text-lg">close</span>
              </button>
            </div>

            {/* 目標模板選取 */}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">從成就事件選擇（可選）</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['🏆 考試滿分','📝 作業優良','🤝 幫助同學','📈 進步顯著','📖 閱讀完成'].map((tpl) => (
                <button
                  key={tpl}
                  onClick={() => showToast(`已選取事件模板：${tpl}`)}
                  className="text-xs px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  {tpl}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mb-4">
              <input type="checkbox" className="rounded" />
              自訂目標（不使用模板）
            </label>

            {/* 表單 */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">目標名稱 *</label>
                <input
                  type="text"
                  placeholder="例如：期末考數學滿分"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">追蹤模式 *</label>
                <div className="flex gap-2">
                  {['累積金額型', '完成次數型'].map((mode) => (
                    <button
                      key={mode}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        mode === '累積金額型'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">目標金額 *</label>
                <input
                  type="number"
                  placeholder="500"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">達成獎勵 *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="200"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
                    <span>⭐ 點數</span>
                    <span className="material-icons-outlined text-gray-400 text-sm">expand_more</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">目標期限</label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    defaultValue="2026-06-30"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" className="rounded" />
                    無限期
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddGoal(false)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => { setShowAddGoal(false); showToast('目標建立成功！（Demo）') }}
                className="flex-1 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                建立目標
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ 模態框：確認兌換 ═══════════ */}
      {showExchangeConfirm && (() => {
        const item = MOCK_EXCHANGE_ITEMS.find(i => i.id === showExchangeConfirm)!
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 modal-backdrop" onClick={() => setShowExchangeConfirm(null)} />
            <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-up text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">{item.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">確認兌換</h3>
              <p className="text-sm text-gray-500 mb-4">
                確定要用 {item.requiredAmount} {item.requiredTypeName} 兌換<br />
                <span className="font-bold text-gray-700">「{item.name}」</span> 嗎？
              </p>
              <p className="text-xs text-gray-400 mb-5">
                兌換後剩餘 {(item.currentBalance - item.requiredAmount)} {item.requiredTypeName}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExchangeConfirm(null)}
                  className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => { setShowExchangeConfirm(null); showToast(`兌換成功！獲得「${item.name}」🎉`) }}
                  className="flex-1 py-2.5 rounded-full bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors cursor-pointer"
                >
                  確認兌換
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══════════ Toast 提示 ═══════════ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
          <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-2">
            <span className="material-icons-outlined text-emerald-400 text-lg">check_circle</span>
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
