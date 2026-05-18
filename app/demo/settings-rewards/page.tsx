'use client'

import { useState } from 'react'

// ════════════════════════════════════════════════════════════
// 輔助函式
// ════════════════════════════════════════════════════════════

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ════════════════════════════════════════════════════════════
// 模擬資料
// ════════════════════════════════════════════════════════════

// ── Tab ① 獎勵類型 ──
const MOCK_REWARD_TYPES = [
  { id: 'rt-1', typeKey: 'points',   displayName: '點數', icon: '⭐', color: '#6a99e0', defaultUnit: '點', isAccumulable: true,  isSystem: true,  displayOrder: 1 },
  { id: 'rt-2', typeKey: 'money',    displayName: '金錢', icon: '💰', color: '#10B981', defaultUnit: '元', isAccumulable: true,  isSystem: true,  displayOrder: 2 },
  { id: 'rt-3', typeKey: 'hearts',   displayName: '愛心', icon: '❤️', color: '#F43F5E', defaultUnit: '顆', isAccumulable: true,  isSystem: true,  displayOrder: 3 },
  { id: 'rt-4', typeKey: 'stars',    displayName: '星星', icon: '🌟', color: '#F59E0B', defaultUnit: '顆', isAccumulable: true,  isSystem: true,  displayOrder: 4 },
  { id: 'rt-5', typeKey: 'diamonds', displayName: '鑽石', icon: '💎', color: '#A855F7', defaultUnit: '顆', isAccumulable: true,  isSystem: true,  displayOrder: 5 },
  { id: 'rt-6', typeKey: 'badges',   displayName: '徽章', icon: '🏅', color: '#F59E0B', defaultUnit: '枚', isAccumulable: false, isSystem: false, displayOrder: 6 },
]

// ── Tab ② 成就事件 ──
const MOCK_ACHIEVEMENT_EVENTS = [
  { id: 'ae-1', name: '考試滿分',       icon: '🏆', color: '#F59E0B', description: '任何科目考試獲得滿分',                                      displayOrder: 1 },
  { id: 'ae-2', name: '作業優良',       icon: '📝', color: '#6a99e0', description: '作業被評為優等或 A+',                                      displayOrder: 2 },
  { id: 'ae-3', name: '幫助同學',       icon: '🤝', color: '#F43F5E', description: '主動幫助同學解決學習問題',                                  displayOrder: 3 },
  { id: 'ae-4', name: '進步顯著',       icon: '📈', color: '#10B981', description: '成績或表現有明顯進步',                                      displayOrder: 4 },
  { id: 'ae-5', name: '準時交作業',     icon: '⭐', color: '#A855F7', description: '持續一週準時繳交所有作業',                                  displayOrder: 5 },
  { id: 'ae-6', name: '閱讀完成',       icon: '📖', color: '#3B82F6', description: '完成一本課外讀物並撰寫心得',                                displayOrder: 6 },
  { id: 'ae-7', name: '課堂積極發言',   icon: '🙋', color: '#06B6D4', description: '在課堂上積極參與討論與回答問題',                            displayOrder: 7 },
  { id: 'ae-8', name: '創作作品',       icon: '🎨', color: '#F59E0B', description: '完成一項藝術或科學創作',                                    displayOrder: 8 },
]

// 每個成就事件關聯的獎勵規則
const MOCK_EVENT_REWARDS: Record<string, { typeId: string; amount: number }[]> = {
  'ae-1': [{ typeId: 'rt-1', amount: 30 }, { typeId: 'rt-2', amount: 50 }],
  'ae-2': [{ typeId: 'rt-1', amount: 15 }],
  'ae-3': [{ typeId: 'rt-1', amount: 10 }, { typeId: 'rt-3', amount: 5 }],
  'ae-4': [{ typeId: 'rt-1', amount: 20 }],
  'ae-5': [{ typeId: 'rt-1', amount: 5 }],
  'ae-6': [{ typeId: 'rt-1', amount: 20 }, { typeId: 'rt-4', amount: 3 }],
  'ae-7': [{ typeId: 'rt-1', amount: 10 }],
  'ae-8': [{ typeId: 'rt-1', amount: 15 }, { typeId: 'rt-4', amount: 2 }],
}

// ── Tab ③ 大型目標 ──
const MOCK_GOAL_TEMPLATES = [
  {
    id: 'gt-1', name: '海邊一日遊', icon: '🏖️', color: '#06B6D4',
    description: '全家去海邊玩一整天！', trackingMode: 'cumulative_amount' as const,
    targetAmount: 2000, targetCount: null, rewardTypeId: 'rt-1', rewardOnComplete: 0,
    displayOrder: 1, isActive: true,
  },
  {
    id: 'gt-2', name: '新腳踏車', icon: '🚲', color: '#10B981',
    description: '一台全新的腳踏車', trackingMode: 'cumulative_amount' as const,
    targetAmount: 5000, targetCount: null, rewardTypeId: 'rt-2', rewardOnComplete: 0,
    displayOrder: 2, isActive: true,
  },
  {
    id: 'gt-3', name: '遊戲主機', icon: '🎮', color: '#A855F7',
    description: 'Nintendo Switch 或 PlayStation', trackingMode: 'cumulative_amount' as const,
    targetAmount: 3000, targetCount: null, rewardTypeId: 'rt-1', rewardOnComplete: 0,
    displayOrder: 3, isActive: true,
  },
  {
    id: 'gt-4', name: '幫助同學好習慣', icon: '🤝', color: '#F43F5E',
    description: '累積幫助同學的次數，養成助人好習慣', trackingMode: 'completion_count' as const,
    targetAmount: null, targetCount: 20, rewardTypeId: 'rt-3', rewardOnComplete: 50,
    displayOrder: 4, isActive: true,
  },
  {
    id: 'gt-5', name: '期末獎學金', icon: '🎓', color: '#F59E0B',
    description: '期末總成績達標的獎學金', trackingMode: 'cumulative_amount' as const,
    targetAmount: 1000, targetCount: null, rewardTypeId: 'rt-2', rewardOnComplete: 200,
    displayOrder: 5, isActive: false,
  },
]

// 模板 ↔ 成就事件關聯
const MOCK_TEMPLATE_EVENT_LINKS: Record<string, string[]> = {
  'gt-1': ['ae-1', 'ae-2', 'ae-4'],
  'gt-2': ['ae-1', 'ae-2', 'ae-4', 'ae-5'],
  'gt-3': ['ae-1', 'ae-2'],
  'gt-4': ['ae-3'],
  'gt-5': ['ae-1', 'ae-2', 'ae-4'],
}

// ── Tab ④ 小型兌換 ──
const MOCK_EXCHANGE_RULES = [
  { id: 'er-1', name: '樂高積木組',        icon: '🧱', requiredAmount: 200,  rewardTypeId: 'rt-1', isActive: true,  displayOrder: 1 },
  { id: 'er-2', name: '30分鐘遊戲時間',     icon: '🎮', requiredAmount: 50,   rewardTypeId: 'rt-1', isActive: true,  displayOrder: 2 },
  { id: 'er-3', name: '新故事書',           icon: '📚', requiredAmount: 100,  rewardTypeId: 'rt-1', isActive: true,  displayOrder: 3 },
  { id: 'er-4', name: '遊樂園一日遊',       icon: '🎢', requiredAmount: 500,  rewardTypeId: 'rt-1', isActive: true,  displayOrder: 4 },
  { id: 'er-5', name: '披薩派對',           icon: '🍕', requiredAmount: 300,  rewardTypeId: 'rt-1', isActive: true,  displayOrder: 5 },
  { id: 'er-6', name: '免作業券 (5張)',     icon: '🎫', requiredAmount: 4,    rewardTypeId: 'rt-5', isActive: true,  displayOrder: 6 },
  { id: 'er-7', name: '自選小禮物 ($50內)', icon: '🎁', requiredAmount: 50,   rewardTypeId: 'rt-2', isActive: true,  displayOrder: 7 },
  { id: 'er-8', name: '看電影',             icon: '🎬', requiredAmount: 150,  rewardTypeId: 'rt-1', isActive: false, displayOrder: 8 },
]

const rewardTypeMap = new Map(MOCK_REWARD_TYPES.map(t => [t.id, t]))

// ════════════════════════════════════════════════════════════
// 主元件
// ════════════════════════════════════════════════════════════

type ModalType = 'addRewardType' | 'editRewardType' |
  'addAchievement' | 'editAchievement' |
  'addGoalTemplate' | 'editGoalTemplate' |
  'addExchangeRule' | 'editExchangeRule' | null

const TABS = [
  { key: 'reward-types' as const,    label: '獎勵類型', icon: 'category',        index: '①' },
  { key: 'achievements' as const,    label: '成就事件', icon: 'emoji_events',    index: '②' },
  { key: 'goal-templates' as const,  label: '大型目標', icon: 'flag',            index: '③' },
  { key: 'exchange-rules' as const,  label: '小型兌換', icon: 'redeem',          index: '④' },
] as const

type TabKey = typeof TABS[number]['key']

export default function SettingsRewardsDemoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('reward-types')
  const [modal, setModal] = useState<ModalType>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const tabCounts: Record<TabKey, number> = {
    'reward-types': MOCK_REWARD_TYPES.length,
    'achievements': MOCK_ACHIEVEMENT_EVENTS.length,
    'goal-templates': MOCK_GOAL_TEMPLATES.filter(g => g.isActive).length,
    'exchange-rules': MOCK_EXCHANGE_RULES.filter(r => r.isActive).length,
  }

  return (
    <div
      className="min-h-screen p-4 md:p-6 flex justify-center items-start text-gray-800"
      style={{ background: 'linear-gradient(135deg, #a7d9ef 0%, #f7b2c9 50%, #fcd6b6 100%)' }}
    >
      <div className="w-full max-w-6xl glass-panel rounded-3xl p-5 md:p-8 min-h-[90vh] relative overflow-hidden">
        {/* 裝飾圓圈 */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-f7b2c9/25 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-a7d9ef/20 rounded-full blur-[90px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10">
          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">settings</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">獎勵中心</h1>
                <p className="text-sm text-gray-500">管理非評量的優良行為獎勵：類型 · 事件 · 大型目標 · 兌換</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                🎯 Demo 預覽模式
              </span>
            </div>
          </div>

          {/* ── Tab 導覽列 ── */}
          <div className="flex flex-wrap gap-1.5 mb-6 p-1 glass-card rounded-2xl border border-white/30">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer
                    ${isActive
                      ? 'bg-white text-primary shadow-md shadow-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                    }`}
                >
                  <span className="text-xs text-gray-400 font-mono">{tab.index}</span>
                  <span className="material-icons-outlined text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Tab 內容 ── */}
          <div className="min-h-[500px]">
            {activeTab === 'reward-types' && (
              <RewardTypesTab
                onAdd={() => setModal('addRewardType')}
                onEdit={() => { setModal('editRewardType'); showToast('編輯獎勵類型（Demo）') }}
                onDelete={() => showToast('刪除獎勵類型（Demo）')}
                onReorder={() => showToast('排序已儲存（Demo）')}
              />
            )}
            {activeTab === 'achievements' && (
              <AchievementEventsTab
                onAdd={() => setModal('addAchievement')}
                onEdit={() => { setModal('editAchievement'); showToast('編輯成就事件（Demo）') }}
                onDelete={() => showToast('刪除成就事件（Demo）')}
              />
            )}
            {activeTab === 'goal-templates' && (
              <GoalTemplatesTab
                onAdd={() => setModal('addGoalTemplate')}
                onEdit={() => { setModal('editGoalTemplate'); showToast('編輯大型目標模板（Demo）') }}
                onDelete={() => showToast('刪除大型目標模板（Demo）')}
                onToggleActive={() => showToast('已切換啟用狀態（Demo）')}
              />
            )}
            {activeTab === 'exchange-rules' && (
              <ExchangeRulesTab
                onAdd={() => setModal('addExchangeRule')}
                onEdit={() => { setModal('editExchangeRule'); showToast('編輯兌換規則（Demo）') }}
                onDelete={() => showToast('刪除兌換規則（Demo）')}
              />
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ 模態框 ═══════════ */}
      {(modal === 'addRewardType' || modal === 'editRewardType') && (
        <ModalWrapper title={modal === 'addRewardType' ? '新增獎勵類型' : '編輯獎勵類型'} onClose={() => setModal(null)}>
          <FormField label="顯示名稱 *">
            <input type="text" placeholder="例如：代幣" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <p className="text-[10px] text-gray-400 -mt-2">系統將自動從名稱生成唯一識別碼</p>
          <FormField label="圖標 *">
            <input type="text" placeholder="🪙" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="顏色">
            <input type="color" defaultValue="#6a99e0" className="w-full h-10 rounded-xl border border-gray-200 cursor-pointer" />
          </FormField>
          <FormField label="預設單位">
            <input type="text" placeholder="枚" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" /> 可累積
          </label>
          <ModalActions onCancel={() => setModal(null)} onConfirm={() => { setModal(null); showToast('獎勵類型已儲存（Demo）') }} />
        </ModalWrapper>
      )}

      {(modal === 'addAchievement' || modal === 'editAchievement') && (
        <ModalWrapper title={modal === 'addAchievement' ? '新增成就事件' : '編輯成就事件'} onClose={() => setModal(null)}>
          <FormField label="事件名稱 *">
            <input type="text" placeholder="例如：考試滿分" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="圖標">
            <input type="text" placeholder="🏆" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="顏色">
            <input type="color" defaultValue="#F59E0B" className="w-full h-10 rounded-xl border border-gray-200 cursor-pointer" />
          </FormField>
          <FormField label="描述">
            <textarea placeholder="描述這個成就事件…" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white min-h-[80px] resize-none" />
          </FormField>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-2">關聯獎勵</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white">
                {MOCK_REWARD_TYPES.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.icon} {rt.displayName}</option>
                ))}
              </select>
              <input type="number" defaultValue={30} className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm" />
              <span className="text-xs text-gray-400">點數</span>
            </div>
            <button className="text-xs text-primary font-medium hover:underline cursor-pointer">+ 新增獎勵</button>
          </div>
          <ModalActions onCancel={() => setModal(null)} onConfirm={() => { setModal(null); showToast('成就事件已儲存（Demo）') }} />
        </ModalWrapper>
      )}

      {(modal === 'addGoalTemplate' || modal === 'editGoalTemplate') && (
        <ModalWrapper title={modal === 'addGoalTemplate' ? '新增大型目標模板' : '編輯大型目標模板'} onClose={() => setModal(null)}>
          <FormField label="目標名稱 *">
            <input type="text" placeholder="例如：海邊一日遊" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="描述">
            <textarea placeholder="描述這個大型目標…" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white min-h-[60px] resize-none" />
          </FormField>
          <FormField label="追蹤模式 *">
            <div className="flex gap-2">
              {['累積金額型', '完成次數型'].map(mode => (
                <button key={mode} className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  mode === '累積金額型' ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>{mode}</button>
              ))}
            </div>
          </FormField>
          <FormField label="目標金額 *">
            <div className="flex gap-2">
              <input type="number" placeholder="2000" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white flex-1" />
              <select className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                {MOCK_REWARD_TYPES.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.icon} {rt.displayName}</option>
                ))}
              </select>
            </div>
          </FormField>
          <FormField label="達成獎勵">
            <input type="number" placeholder="0" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="圖標">
            <input type="text" placeholder="🏖️" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="顏色">
            <input type="color" defaultValue="#06B6D4" className="w-full h-10 rounded-xl border border-gray-200 cursor-pointer" />
          </FormField>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-2">綁定成就事件（可選）</p>
          <div className="flex flex-wrap gap-2">
            {MOCK_ACHIEVEMENT_EVENTS.slice(0, 6).map(ae => (
              <button key={ae.id} className="text-xs px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors cursor-pointer">
                {ae.icon} {ae.name}
              </button>
            ))}
          </div>
          <ModalActions onCancel={() => setModal(null)} onConfirm={() => { setModal(null); showToast('大型目標模板已儲存（Demo）') }} />
        </ModalWrapper>
      )}

      {(modal === 'addExchangeRule' || modal === 'editExchangeRule') && (
        <ModalWrapper title={modal === 'addExchangeRule' ? '新增兌換規則' : '編輯兌換規則'} onClose={() => setModal(null)}>
          <FormField label="獎品名稱 *">
            <input type="text" placeholder="例如：樂高積木組" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="圖標">
            <input type="text" placeholder="🧱" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white" />
          </FormField>
          <FormField label="所需點數 *">
            <div className="flex gap-2">
              <input type="number" placeholder="200" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white flex-1" />
              <select className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                {MOCK_REWARD_TYPES.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.icon} {rt.displayName}</option>
                ))}
              </select>
            </div>
          </FormField>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" /> 啟用
          </label>
          <ModalActions onCancel={() => setModal(null)} onConfirm={() => { setModal(null); showToast('兌換規則已儲存（Demo）') }} />
        </ModalWrapper>
      )}

      {/* ── Toast ── */}
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

// ════════════════════════════════════════════════════════════
// Tab ①：獎勵類型
// ════════════════════════════════════════════════════════════

function RewardTypesTab({ onAdd, onEdit, onDelete, onReorder }: {
  onAdd: () => void; onEdit: () => void; onDelete: () => void; onReorder: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="material-icons-outlined text-gray-400">category</span>
            獎勵類型
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">定義可累積、花費、兌換的貨幣單位。系統預設 5 種，可自訂新增。</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReorder} className="text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1">
            <span className="material-icons-outlined text-sm">swap_vert</span>排序
          </button>
          <button onClick={onAdd} className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-md shadow-primary/20">
            <span className="material-icons-outlined text-lg">add</span>新增類型
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {MOCK_REWARD_TYPES.map(type => (
          <div key={type.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: hexToRgba(type.color, 0.12) }}>
              <span className="text-xl">{type.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 text-sm">{type.displayName}</h4>
                {type.isSystem && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">系統</span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                單位：{type.defaultUnit} · {type.isAccumulable ? '可累積' : '不可累積'}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              <button onClick={onEdit} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title="編輯">
                <span className="material-icons-outlined text-sm">edit</span>
              </button>
              {!type.isSystem && (
                <button onClick={onDelete} className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-500 transition-colors cursor-pointer" title="刪除">
                  <span className="material-icons-outlined text-sm">delete</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Tab ②：成就事件
// ════════════════════════════════════════════════════════════

function AchievementEventsTab({ onAdd, onEdit, onDelete }: {
  onAdd: () => void; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="material-icons-outlined text-gray-400">emoji_events</span>
            成就事件
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">定義學生的優良行為標籤，用於快速記錄獎勵時選取。描述「行為」，不是「獎勵」。</p>
        </div>
        <button onClick={onAdd} className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-md shadow-primary/20">
          <span className="material-icons-outlined text-lg">add</span>新增事件
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">事件</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">描述</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">關聯獎勵</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ACHIEVEMENT_EVENTS.map(event => {
              const rewards = MOCK_EVENT_REWARDS[event.id] || []
              return (
                <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: hexToRgba(event.color, 0.12) }}>
                        <span className="text-lg">{event.icon}</span>
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{event.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-gray-400">{event.description}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {rewards.map((r, i) => {
                        const rt = rewardTypeMap.get(r.typeId)
                        return (
                          <span key={i} className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {rt?.icon} +{r.amount}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={onEdit} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title="編輯">
                        <span className="material-icons-outlined text-sm">edit</span>
                      </button>
                      <button onClick={onDelete} className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-500 transition-colors cursor-pointer" title="刪除">
                        <span className="material-icons-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Tab ③：大型目標
// ════════════════════════════════════════════════════════════

function GoalTemplatesTab({ onAdd, onEdit, onDelete, onToggleActive }: {
  onAdd: () => void; onEdit: () => void; onDelete: () => void; onToggleActive: () => void
}) {
  const activeTemplates = MOCK_GOAL_TEMPLATES.filter(g => g.isActive)
  const inactiveTemplates = MOCK_GOAL_TEMPLATES.filter(g => !g.isActive)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="material-icons-outlined text-gray-400">flag</span>
            大型目標模板
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">定義終極大獎模板（🏖️海邊玩、🚲腳踏車…），家長可從模板庫選取指派給學生追蹤進度。</p>
        </div>
        <button onClick={onAdd} className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-md shadow-primary/20">
          <span className="material-icons-outlined text-lg">add</span>新增目標
        </button>
      </div>

      {activeTemplates.length > 0 && (
        <div className="space-y-3 mb-6">
          {activeTemplates.map(template => {
            const linkedEvents = MOCK_TEMPLATE_EVENT_LINKS[template.id] || []
            const rt = rewardTypeMap.get(template.rewardTypeId)
            return (
              <div key={template.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: hexToRgba(template.color, 0.12) }}>
                      <span className="text-xl">{template.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900">{template.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{template.description}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {template.trackingMode === 'cumulative_amount'
                            ? `${rt?.icon} 累積 ${template.targetAmount?.toLocaleString()} ${rt?.defaultUnit || ''}`
                            : `完成 ${template.targetCount} 次`
                          }
                        </span>
                        {template.rewardOnComplete > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                            達成獎勵 +{template.rewardOnComplete}{rt?.icon}
                          </span>
                        )}
                      </div>
                      {linkedEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {linkedEvents.map(eid => {
                            const ev = MOCK_ACHIEVEMENT_EVENTS.find(e => e.id === eid)
                            return ev ? (
                              <span key={eid} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                {ev.icon} {ev.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={onEdit} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title="編輯">
                      <span className="material-icons-outlined text-sm">edit</span>
                    </button>
                    <button onClick={onToggleActive} className="w-8 h-8 rounded-full bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-400 hover:text-amber-500 transition-colors cursor-pointer" title="停用">
                      <span className="material-icons-outlined text-sm">visibility_off</span>
                    </button>
                    <button onClick={onDelete} className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-500 transition-colors cursor-pointer" title="刪除">
                      <span className="material-icons-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {inactiveTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">已停用</h3>
          <div className="space-y-2">
            {inactiveTemplates.map(template => (
              <div key={template.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-60 flex items-center justify-between group hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{template.icon}</span>
                  <span className="text-sm font-medium text-gray-600">{template.name}</span>
                </div>
                <button onClick={onToggleActive} className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                  重新啟用
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Tab ④：小型兌換
// ════════════════════════════════════════════════════════════

function ExchangeRulesTab({ onAdd, onEdit, onDelete }: {
  onAdd: () => void; onEdit: () => void; onDelete: () => void
}) {
  const activeRules = MOCK_EXCHANGE_RULES.filter(r => r.isActive)
  const inactiveRules = MOCK_EXCHANGE_RULES.filter(r => !r.isActive)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="material-icons-outlined text-gray-400">redeem</span>
            小型兌換規則
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">定義小額點數可立即兌換的日常獎品（🧱樂高、🍕披薩…），提供學生即時滿足感。</p>
        </div>
        <button onClick={onAdd} className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-md shadow-primary/20">
          <span className="material-icons-outlined text-lg">add</span>新增兌換規則
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {activeRules.map(rule => {
          const rt = rewardTypeMap.get(rule.rewardTypeId)
          return (
            <div key={rule.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="h-2" style={{ backgroundColor: rt?.color || '#6a99e0' }} />
              <div className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                  <span className="text-2xl">{rule.icon}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">{rule.name}</h4>
                <p className="text-xs text-gray-400 mb-3">需要 {rule.requiredAmount} {rt?.icon}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={onEdit} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title="編輯">
                    <span className="material-icons-outlined text-sm">edit</span>
                  </button>
                  <button onClick={onDelete} className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-500 transition-colors cursor-pointer" title="刪除">
                    <span className="material-icons-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {inactiveRules.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">已停用</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {inactiveRules.map(rule => {
              const rt = rewardTypeMap.get(rule.rewardTypeId)
              return (
                <div key={rule.id} className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden opacity-50 hover:opacity-70 transition-opacity">
                  <div className="h-2 bg-gray-300" />
                  <div className="p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <span className="text-2xl grayscale">{rule.icon}</span>
                    </div>
                    <h4 className="font-bold text-gray-500 text-sm mb-1">{rule.name}</h4>
                    <p className="text-xs text-gray-400">需要 {rule.requiredAmount} {rt?.icon}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// 共用 UI 元件
// ════════════════════════════════════════════════════════════

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="material-icons-outlined text-primary">edit_note</span>
            {title}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors cursor-pointer">
            <span className="material-icons-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function ModalActions({ onCancel, onConfirm, confirmLabel }: { onCancel: () => void; onConfirm: () => void; confirmLabel?: string }) {
  return (
    <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
      >取消</button>
      <button
        onClick={onConfirm}
        className="flex-1 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-primary/20"
      >{confirmLabel || '確認儲存'}</button>
    </div>
  )
}
