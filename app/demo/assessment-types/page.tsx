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
// Material Icon 分類（與 SubjectForm 一致的圖示選擇器）
// ════════════════════════════════════════════════════════════

const ICON_CATEGORIES: Record<string, string[]> = {
  '文件': ['assignment', 'checklist_rtl', 'edit_note', 'fact_check', 'history_edu', 'description', 'summarize', 'contract_edit', 'draw', 'ink_pen'],
  '學習': ['menu_book', 'school', 'science', 'calculate', 'psychology', 'biology', 'biotech', 'experiment', 'local_library', 'book'],
  '運動': ['sports_score', 'sports_soccer', 'sports_basketball', 'fitness_center', 'directions_run', 'emoji_events', 'military_tech', 'swords'],
  '創作': ['palette', 'music_note', 'theater_comedy', 'movie', 'photo_camera', 'mic', 'headphones', 'brush', 'architecture'],
  '一般': ['star', 'favorite', 'thumb_up', 'auto_awesome', 'workspace_premium', 'verified', 'bolt', 'local_fire_department', 'diamond'],
}

// ════════════════════════════════════════════════════════════
// 模擬資料
// ════════════════════════════════════════════════════════════

type AssessmentTypeItem = {
  id: string
  typeKey: string
  displayName: string
  icon: string
  color: string
  isActive: boolean
  isSystem: boolean
  displayOrder: number
}

const MOCK_TYPES: AssessmentTypeItem[] = [
  { id: 'at-1', typeKey: 'exam',          displayName: '考試',   icon: 'fact_check',     color: '#F43F5E', isActive: true,  isSystem: true,  displayOrder: 1 },
  { id: 'at-2', typeKey: 'homework',      displayName: '作業',   icon: 'edit_note',      color: '#6a99e0', isActive: true,  isSystem: true,  displayOrder: 2 },
  { id: 'at-3', typeKey: 'quiz',          displayName: '小考',   icon: 'checklist_rtl',  color: '#F59E0B', isActive: true,  isSystem: true,  displayOrder: 3 },
  { id: 'at-4', typeKey: 'project',       displayName: '專題',   icon: 'science',        color: '#10B981', isActive: true,  isSystem: true,  displayOrder: 4 },
  { id: 'at-5', typeKey: 'presentation',  displayName: '報告',   icon: 'menu_book',      color: '#A855F7', isActive: true,  isSystem: true,  displayOrder: 5 },
  { id: 'at-6', typeKey: 'experiment',    displayName: '實驗',   icon: 'biotech',        color: '#06B6D4', isActive: true,  isSystem: false, displayOrder: 6 },
  { id: 'at-7', typeKey: 'competition',   displayName: '競賽',   icon: 'sports_score',   color: '#3B82F6', isActive: false, isSystem: false, displayOrder: 7 },
]

// ════════════════════════════════════════════════════════════
// 主頁面
// ════════════════════════════════════════════════════════════

export default function AssessmentTypesDemoPage() {
  const [types, setTypes] = useState<AssessmentTypeItem[]>(MOCK_TYPES)
  const [toast, setToast] = useState<string | null>(null)

  // ── 新增 Modal ──
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addIcon, setAddIcon] = useState('assignment')
  const [addColor, setAddColor] = useState('#64748b')
  const [addCustomIcon, setAddCustomIcon] = useState('')
  const [addPickerVisible, setAddPickerVisible] = useState(true)
  const [addCategory, setAddCategory] = useState('文件')

  // ── 編輯 Modal ──
  const [showEditModal, setShowEditModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('assignment')
  const [editColor, setEditColor] = useState('#64748b')
  const [editCustomIcon, setEditCustomIcon] = useState('')
  const [editPickerVisible, setEditPickerVisible] = useState(true)
  const [editCategory, setEditCategory] = useState('文件')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  // ── 新增邏輯 ──
  const openAddModal = () => {
    setAddName('')
    setAddIcon('assignment')
    setAddColor('#64748b')
    setAddCustomIcon('')
    setAddPickerVisible(true)
    setAddCategory('文件')
    setShowAddModal(true)
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim()) return
    const icon = addCustomIcon.trim() || addIcon
    const typeKey = addName.trim().toLowerCase().replace(/\s+/g, '_')
    const newType: AssessmentTypeItem = {
      id: `at-new-${Date.now()}`,
      typeKey,
      displayName: addName.trim(),
      icon,
      color: addColor,
      isActive: true,
      isSystem: false,
      displayOrder: types.length + 1,
    }
    setTypes([...types, newType])
    setShowAddModal(false)
    showToast('✅ 評量類別已新增')
  }

  // ── 編輯邏輯 ──
  const openEditModal = (type: AssessmentTypeItem) => {
    setEditId(type.id)
    setEditName(type.displayName)
    setEditIcon(type.icon)
    setEditColor(type.color)
    setEditCustomIcon('')
    setEditPickerVisible(true)
    setEditCategory('文件')
    setShowEditModal(true)
  }

  const handleEditSubmit = () => {
    if (!editName.trim() || !editId) return
    const icon = editCustomIcon.trim() || editIcon
    setTypes(types.map(t =>
      t.id === editId ? { ...t, displayName: editName.trim(), icon, color: editColor } : t
    ))
    setShowEditModal(false)
    showToast('✅ 評量類別已更新')
  }

  const handleToggle = (id: string) => {
    setTypes(types.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t))
    const target = types.find(t => t.id === id)
    showToast(target?.isActive ? '⏸ 已停用' : '✅ 已啟用')
  }

  const handleDelete = (id: string) => {
    setTypes(types.filter(t => t.id !== id))
    showToast('🗑 已刪除')
  }

  const moveType = (id: string, dir: -1 | 1) => {
    const index = types.findIndex(t => t.id === id)
    if (index < 0) return
    const target = index + dir
    if (target < 0 || target >= types.length) return
    const reordered = [...types]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setTypes(reordered.map((t, i) => ({ ...t, displayOrder: i + 1 })))
    showToast('🔄 排序已更新')
  }

  const activeCount = types.filter(t => t.isActive).length
  const currentAddIcon = addCustomIcon.trim() || addIcon
  const currentEditIcon = editCustomIcon.trim() || editIcon

  return (
    <div
      className="min-h-screen p-4 md:p-6 flex justify-center items-start text-gray-800"
      style={{ background: 'linear-gradient(135deg, #a7d9ef 0%, #c1d9f0 50%, #e0e7f2 100%)' }}
    >
      <div className="w-full max-w-5xl glass-panel rounded-3xl p-5 md:p-8 min-h-[90vh] relative overflow-hidden">
        {/* 裝飾圓圈 */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#6a99e0]/15 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#a7d9ef]/20 rounded-full blur-[90px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10">
          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">category</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">評量類別管理</h1>
                <p className="text-sm text-gray-500">定義評量類型（考試、作業、專題…），設定代表圖示與顏色，在全系統中一致顯示。</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                🎯 Demo 預覽模式
              </span>
            </div>
          </div>

          {/* ── 統計小卡 ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="glass-card rounded-2xl p-4">
              <div className="text-2xl font-black text-gray-900">{types.length}</div>
              <div className="text-xs text-gray-500 mt-1">全部類別</div>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
              <div className="text-xs text-gray-500 mt-1">已啟用</div>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-2xl font-black text-amber-500">{types.filter(t => t.isSystem).length}</div>
              <div className="text-xs text-gray-500 mt-1">系統預設</div>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-2xl font-black text-purple-500">{types.filter(t => !t.isSystem).length}</div>
              <div className="text-xs text-gray-500 mt-1">自訂類別</div>
            </div>
          </div>

          {/* ── 操作列 ── */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{types.length} 個類別 · 拖曳排序或使用箭頭調整順序</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 shadow-md shadow-primary/20 cursor-pointer"
            >
              <span className="material-icons-outlined text-lg">add</span>
              新增類別
            </button>
          </div>

          {/* ── 類別列表 ── */}
          <div className="space-y-2">
            {types.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <span className="material-icons-outlined text-5xl text-gray-300 mb-3 block">category</span>
                <p className="text-sm text-gray-400 font-medium">尚無評量類別</p>
                <p className="text-xs text-gray-300 mt-1">點擊上方按鈕新增第一個類別</p>
              </div>
            ) : (
              types.map((type, index) => (
                <div
                  key={type.id}
                  className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_1fr_auto_auto_auto_auto] md:items-center transition-all ${
                    type.isActive
                      ? 'bg-white border-gray-100 hover:shadow-md'
                      : 'bg-gray-50/80 border-gray-200 opacity-75'
                  }`}
                >
                  {/* 圖示預覽 */}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
                      style={{ backgroundColor: hexToRgba(type.color, 0.12) }}
                    >
                      <span className="material-icons-outlined text-xl" style={{ color: type.color }}>
                        {type.icon}
                      </span>
                    </div>
                    <div className="md:hidden flex flex-col gap-0.5">
                      <span className="font-mono text-[10px] text-gray-400 uppercase">{type.typeKey}</span>
                      <span className={`text-[10px] font-bold ${type.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {type.isActive ? '啟用中' : '已停用'}
                      </span>
                    </div>
                  </div>

                  {/* 名稱 + key */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate">{type.displayName}</span>
                    <span className="hidden md:block font-mono text-[11px] text-gray-400">{type.typeKey}</span>
                  </div>

                  {/* 顏色指示 */}
                  <div className="hidden md:flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md border border-gray-200 flex-shrink-0" style={{ backgroundColor: type.color }} />
                    <span className="font-mono text-[11px] text-gray-400">{type.color}</span>
                  </div>

                  {/* 標籤 */}
                  <div className="hidden md:flex items-center gap-1.5">
                    {type.isSystem && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600 border border-sky-100">系統</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      type.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                      {type.isActive ? '啟用' : '停用'}
                    </span>
                  </div>

                  {/* 排序 */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => moveType(type.id, -1)}
                      disabled={index === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="上移"
                    >
                      <span className="material-icons-outlined text-sm">keyboard_arrow_up</span>
                    </button>
                    <button
                      onClick={() => moveType(type.id, 1)}
                      disabled={index === types.length - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="下移"
                    >
                      <span className="material-icons-outlined text-sm">keyboard_arrow_down</span>
                    </button>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEditModal(type)}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <span className="material-icons-outlined text-sm">edit</span>
                      編輯
                    </button>
                    <button
                      onClick={() => handleToggle(type.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <span className="material-icons-outlined text-sm">{type.isActive ? 'toggle_off' : 'toggle_on'}</span>
                      {type.isActive ? '停用' : '啟用'}
                    </button>
                    {!type.isSystem && (
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <span className="material-icons-outlined text-sm">delete_outline</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── 說明提示 ── */}
          <div className="mt-6 rounded-2xl bg-sky-50/60 border border-sky-100 p-4">
            <div className="flex items-start gap-2">
              <span className="material-icons-outlined text-sky-500 text-lg mt-0.5 flex-shrink-0">info</span>
              <div>
                <p className="text-sm font-bold text-sky-800">關於評量類別</p>
                <ul className="mt-1.5 text-xs text-sky-600 space-y-1 list-disc list-inside">
                  <li><strong>系統類別</strong>（考試、作業、小考、專題、報告）不可刪除，但可編輯名稱、圖示、顏色。</li>
                  <li><strong>自訂類別</strong>可自由新增、編輯、刪除，排序決定在表單中的顯示順序。</li>
                  <li>圖示選用 Material Icons，會在評量表單、列表、列印頁面中統一顯示。</li>
                  <li>停用的類別不會出現在新增評量的下拉選單中，但既有評量不受影響。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          新增 Modal — 完全對齊 SubjectForm 排版風格
      ════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn" style={{ zIndex: 99999 }}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-800">➕ 新增評量類別</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                aria-label="關閉"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="flex flex-col" style={{ minHeight: 0 }}>
              <div className="p-8 space-y-8 flex-1 overflow-y-auto min-h-0">
                {/* Two-Column: Name + Color | Icon Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* 名稱 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                        類別名稱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900"
                        placeholder="例如：口試、實作…"
                        type="text"
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        required
                      />
                    </div>

                    {/* 顏色 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">代表顏色</label>
                      <div className="flex items-center gap-3">
                        <input
                          className="h-12 w-20 p-1 rounded-lg border border-slate-200 bg-white cursor-pointer overflow-hidden"
                          type="color"
                          value={addColor}
                          onChange={(e) => setAddColor(e.target.value)}
                        />
                        <div
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                          style={{ backgroundColor: `${addColor}20`, color: addColor }}
                        >
                          預覽
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Icon 預覽 */}
                  <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center border border-dashed border-slate-300 transition-all">
                    <div
                      className="w-32 h-32 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                      style={{ backgroundColor: `${addColor}15`, color: addColor }}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '4.8rem' }}>{currentAddIcon}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mb-4">目前圖示</p>
                    <button
                      type="button"
                      onClick={() => setAddPickerVisible(!addPickerVisible)}
                      className="px-6 py-2 bg-white text-slate-700 rounded-full text-sm font-semibold shadow-sm hover:shadow-md active:scale-95 transition-all border border-slate-200 cursor-pointer"
                    >
                      {addPickerVisible ? '隱藏圖示選擇器' : '選擇圖示'}
                    </button>
                  </div>
                </div>

                {/* Icon 選擇面板 */}
                <div className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
                  addPickerVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-600">圖示</label>
                  </div>

                  {/* 分類藥丸 */}
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(203 213 225) transparent' }}>
                    {Object.keys(ICON_CATEGORIES).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setAddCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                          addCategory === cat
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Icon 網格 */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(203 213 225) transparent' }}>
                    <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-3">
                      {(ICON_CATEGORIES[addCategory] || []).map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => { setAddIcon(icon); setAddCustomIcon('') }}
                          className={`aspect-square flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                            addIcon === icon && !addCustomIcon.trim()
                              ? 'bg-primary/10 text-primary border-2 border-primary scale-110'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="material-icons-outlined text-2xl">{icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 手動搜尋 */}
                  <div className="relative group">
                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                    <input
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 text-sm"
                      placeholder="自訂圖標名稱 (例如: fact_check, edit_note, science...)"
                      type="text"
                      value={addCustomIcon}
                      onChange={(e) => setAddCustomIcon(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-200/60 flex flex-col-reverse sm:flex-row gap-4 justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-8 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-12 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 active:shadow-none cursor-pointer"
                >
                  <span className="material-icons-outlined text-lg">save</span>
                  建立類別
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          編輯 Modal — 完全對齊 SubjectForm 排版風格
      ════════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn" style={{ zIndex: 99999 }}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={() => setShowEditModal(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-800">✏️ 編輯評量類別</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                aria-label="關閉"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col" style={{ minHeight: 0 }}>
              <div className="p-8 space-y-8 flex-1 overflow-y-auto min-h-0">
                {/* Two-Column */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                        類別名稱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">代表顏色</label>
                      <div className="flex items-center gap-3">
                        <input
                          className="h-12 w-20 p-1 rounded-lg border border-slate-200 bg-white cursor-pointer overflow-hidden"
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                        />
                        <div
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                          style={{ backgroundColor: `${editColor}20`, color: editColor }}
                        >
                          預覽
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Icon Preview */}
                  <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center border border-dashed border-slate-300 transition-all">
                    <div
                      className="w-32 h-32 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                      style={{ backgroundColor: `${editColor}15`, color: editColor }}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '4.8rem' }}>{currentEditIcon}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mb-4">目前圖示</p>
                    <button
                      type="button"
                      onClick={() => setEditPickerVisible(!editPickerVisible)}
                      className="px-6 py-2 bg-white text-slate-700 rounded-full text-sm font-semibold shadow-sm hover:shadow-md active:scale-95 transition-all border border-slate-200 cursor-pointer"
                    >
                      {editPickerVisible ? '隱藏圖示選擇器' : '選擇圖示'}
                    </button>
                  </div>
                </div>

                {/* Icon Picker */}
                <div className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
                  editPickerVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-600">圖示</label>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(203 213 225) transparent' }}>
                    {Object.keys(ICON_CATEGORIES).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                          editCategory === cat
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(203 213 225) transparent' }}>
                    <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-3">
                      {(ICON_CATEGORIES[editCategory] || []).map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => { setEditIcon(icon); setEditCustomIcon('') }}
                          className={`aspect-square flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                            editIcon === icon && !editCustomIcon.trim()
                              ? 'bg-primary/10 text-primary border-2 border-primary scale-110'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="material-icons-outlined text-2xl">{icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative group">
                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                    <input
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 text-sm"
                      placeholder="自訂圖標名稱"
                      type="text"
                      value={editCustomIcon}
                      onChange={(e) => setEditCustomIcon(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-200/60 flex flex-col-reverse sm:flex-row gap-4 justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-8 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  className="px-12 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 active:shadow-none cursor-pointer"
                >
                  <span className="material-icons-outlined text-lg">save</span>
                  儲存變更
                </button>
              </div>
            </div>
          </div>
        </div>
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

      {/* ── 動畫 ── */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-fade-in-up {
          animation: slideUp 0.35s ease-out;
        }
      `}</style>
    </div>
  )
}
