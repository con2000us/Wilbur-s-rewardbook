'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'
import ImageUploader, { GoalTemplateImage } from '@/app/components/ImageUploader'
import { toDateInputValue } from '@/lib/utils/goalTracking'

interface StudentGoal {
  id?: string
  student_id?: string
  name: string
  description: string | null
  tracking_mode: 'cumulative_amount' | 'completion_count'
  target_amount: number | null
  target_count: number | null
  tracking_reward_type_id: string | null  // 要追蹤累積的獎勵類型 (cumulative_amount 模式)
  reward_type_id: string | null            // 完成時給予的獎勵類型（可為空，代表無額外獎勵）
  reward_on_complete: number
  consume_on_complete: boolean             // 完成時是否消耗交易（false = 里程碑模式）
  icon: string
  color: string
  is_active: boolean
  display_order: number
  image_urls: GoalTemplateImage[]
  current_progress?: number
  linked_event_ids?: string[]
  tracking_started_at?: string | null
}

interface AchievementEvent {
  id: string
  name: string
  icon?: string
}

interface RewardType {
  id: string
  type_key: string
  display_name: string
  icon: string
  color: string
  default_unit: string | null
}

interface GoalPopupProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goal: StudentGoal) => Promise<void>
  onDelete?: (goalId: string) => Promise<void>
  editingGoal?: StudentGoal | null
  rewardTypes: RewardType[]
}

const COLOR_OPTIONS = [
  { name: 'blue', value: '#3b82f6' },
  { name: 'purple', value: '#8b5cf6' },
  { name: 'pink', value: '#ec4899' },
  { name: 'orange', value: '#f97316' },
  { name: 'green', value: '#10b981' },
  { name: 'yellow', value: '#fbbf24' }
]

export default function GoalPopup({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingGoal,
  rewardTypes
}: GoalPopupProps) {
  const locale = useLocale()
  const isEditing = !!editingGoal

  const [formData, setFormData] = useState<StudentGoal>({
    name: '',
    description: null,
    tracking_mode: 'cumulative_amount',
    target_amount: null,
    target_count: null,
    tracking_reward_type_id: null,
    reward_type_id: '',
    reward_on_complete: 0,
    consume_on_complete: true,
    icon: '🎯',
    color: '#3b82f6',
    is_active: true,
    display_order: 0,
    image_urls: [],
    linked_event_ids: [],
    tracking_started_at: '' // 預設不限制起算時間，計算所有歷史紀錄
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [achievementEvents, setAchievementEvents] = useState<AchievementEvent[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name || '',
        description: editingGoal.description ?? null,
        tracking_mode: editingGoal.tracking_mode || 'cumulative_amount',
        target_amount: editingGoal.target_amount ?? null,
        target_count: editingGoal.target_count ?? null,
        tracking_reward_type_id: editingGoal.tracking_reward_type_id ?? null,
        reward_type_id: editingGoal.reward_type_id ?? null, // null = toggle OFF, '' = toggle ON 未選
        reward_on_complete: editingGoal.reward_on_complete ?? 0,
        consume_on_complete: editingGoal.consume_on_complete ?? true,
        icon: editingGoal.icon || '🎯',
        color: editingGoal.color || '#3b82f6',
        is_active: editingGoal.is_active ?? true,
        display_order: editingGoal.display_order ?? 0,
        image_urls: editingGoal.image_urls || [],
        linked_event_ids: editingGoal.linked_event_ids || [],
        tracking_started_at: toDateInputValue(editingGoal.tracking_started_at)
      })
    } else {
      setFormData({
        name: '',
        description: null,
        tracking_mode: 'cumulative_amount',
        target_amount: null,
        target_count: null,
        tracking_reward_type_id: null,
        reward_type_id: '',
        reward_on_complete: 0,
        consume_on_complete: true,
        icon: '🎯',
        color: '#3b82f6',
        is_active: true,
        display_order: 0,
        image_urls: [],
        linked_event_ids: [],
        tracking_started_at: '' // 預設不限制起算時間
      })
    }
    setError('')
  }, [editingGoal, isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // 載入成就事件列表（用於 linked_event_ids）
  useEffect(() => {
    if (isOpen && achievementEvents.length === 0) {
      fetch('/api/achievement-events/list')
        .then(res => res.json())
        .then(data => {
          if (data.events) {
            setAchievementEvents(data.events.map((e: AchievementEvent) => ({
              id: e.id,
              name: e.name || '',
              icon: e.icon
            })))
          }
        })
        .catch(() => {})
    }
  }, [isOpen, achievementEvents.length])

  if (!isOpen || !mounted) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError(locale === 'zh-TW' ? '請輸入目標名稱' : 'Please enter a goal name')
      return
    }
    if (formData.tracking_mode === 'cumulative_amount' && !formData.tracking_reward_type_id) {
      setError(locale === 'zh-TW' ? '請選擇要追蹤的獎勵類型' : 'Please select a reward type to track')
      return
    }
    // 若開啟了達成獎勵但未選擇類型，提醒使用者
    if (formData.reward_type_id !== null && !formData.reward_type_id) {
      setError(locale === 'zh-TW' ? '請選擇達成獎勵的類型，或關閉達成獎勵開關' : 'Please select a completion reward type, or turn off the completion reward toggle')
      return
    }
    setLoading(true)
    setError('')

    try {
      const dataToSave = {
        ...formData,
        ...(isEditing && editingGoal?.id ? { id: editingGoal.id } : {}),
      }
      await onSave(dataToSave)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '儲存失敗' : 'Save failed'))
    } finally {
      setLoading(false)
    }
  }

  // 判断是否为 emoji
  const isEmojiIcon = (icon: string): boolean => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) ||
           icon.length <= 2 ||
           !/^[a-z_]+$/i.test(icon)
  }

  const popupContent = (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左側視覺自訂區域 */}
        <div className="w-full md:w-1/3 bg-slate-50 p-8 border-r border-slate-100 overflow-y-auto">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
              {locale === 'zh-TW' ? '視覺自訂' : 'Visual Customization'}
            </h3>

            {/* 圖標預覽 */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border-4 border-white shadow-xl"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              {isEmojiIcon(formData.icon) ? (
                <span className="text-4xl" style={{ color: formData.color }}>
                  {formData.icon}
                </span>
              ) : (
                <span
                  className="material-icons-outlined text-4xl"
                  style={{ color: formData.color }}
                >
                  {formData.icon}
                </span>
              )}
            </div>

            {/* 圖標選擇 */}
            <div className="mb-8 w-full">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
                {locale === 'zh-TW' ? '選擇圖標' : 'Select Icon'}
              </p>
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2">
                  {locale === 'zh-TW' ? '常用表情符號：' : 'Common emojis:'}
                </p>
                <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl">
                  {['🎯', '🏖️', '🎮', '📚', '🚴', '🎸', '🎨', '🏆', '⭐', '💎', '🛴', '🎁', '✈️', '🏰', '🎪', '🌟', '🔥', '✨'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-all hover:scale-110 ${
                        formData.icon === emoji
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value || '🎯' })}
                placeholder={locale === 'zh-TW' ? '輸入圖標' : 'Enter icon'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center text-2xl"
                maxLength={10}
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                💡 {locale === 'zh-TW' ? '可輸入 emoji 或 Material Icon 名稱' : 'Enter emoji or Material Icon name'}
              </p>
            </div>

            {/* 顏色選擇 */}
            <div className="w-full">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
                {locale === 'zh-TW' ? '主題顏色' : 'Theme Color'}
              </p>
              <div className="flex justify-center gap-4">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                      formData.color === color.value
                        ? 'ring-4 ring-offset-2'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 mt-4 rounded-xl border border-slate-200 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 右側表單區域 */}
        <div className="flex-1 p-8 md:p-10 relative overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-icons-outlined">close</span>
          </button>

          <header className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              {isEditing
                ? (locale === 'zh-TW' ? '編輯大型目標' : 'Edit Major Goal')
                : (locale === 'zh-TW' ? '新增大型目標' : 'Add Major Goal')
              }
            </h2>
            <p className="text-slate-500 mt-1">
              {locale === 'zh-TW' ? '設定學生的長期大型目標與追蹤方式' : 'Configure the student\'s long-term major goal and tracking method'}
            </p>
          </header>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 目標名稱 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '目標名稱' : 'Goal Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={locale === 'zh-TW' ? '例如：海邊度假' : 'e.g. Beach Vacation'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '目標說明' : 'Description'}
              </label>
              <textarea
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                placeholder={locale === 'zh-TW' ? '描述此目標的詳細內容...' : 'Describe this goal...'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              />
            </div>

            {/* 追蹤目標類型 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '追蹤目標' : 'Tracking Target'}
              </label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.tracking_mode === 'cumulative_amount'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="tracking_mode"
                    value="cumulative_amount"
                    checked={formData.tracking_mode === 'cumulative_amount'}
                    onChange={() => setFormData({ ...formData, tracking_mode: 'cumulative_amount', target_count: null, linked_event_ids: [] })}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {locale === 'zh-TW' ? '🎁 針對獎勵' : '🎁 Track Rewards'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {locale === 'zh-TW' ? '追蹤學生累積獲得的獎勵總量（如 ⭐、💎），達到設定目標值後即完成。' : 'Track the total accumulated reward amount (e.g. stars, diamonds). Goal completes when the target is reached.'}
                    </p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.tracking_mode === 'completion_count'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="tracking_mode"
                    value="completion_count"
                    checked={formData.tracking_mode === 'completion_count'}
                    onChange={() => setFormData({ ...formData, tracking_mode: 'completion_count', target_amount: null, tracking_reward_type_id: null })}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {locale === 'zh-TW' ? '✅ 針對行為' : '✅ Track Behaviors'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {locale === 'zh-TW' ? '追蹤學生完成指定優良事件的次數，達到設定目標次數後即完成。' : 'Track the number of times an achievement event is completed. Goal completes when the target count is reached.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 里程碑模式 */}
            <div>
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                !formData.consume_on_complete
                  ? 'border-green-400 bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={!formData.consume_on_complete}
                    onChange={(e) => setFormData({ ...formData, consume_on_complete: !e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-checked:bg-green-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      📈 {locale === 'zh-TW' ? '里程碑模式' : 'Milestone Mode'}
                    </span>
                    {!formData.consume_on_complete && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        {locale === 'zh-TW' ? '已啟用' : 'Enabled'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {locale === 'zh-TW'
                      ? '達成後不消耗積分或次數，適合累計型目標（如：走路 10 萬步 → 20 萬步）。進度計算所有歷史紀錄，不受其他目標影響。'
                      : 'No consumption on completion. Ideal for cumulative milestones (e.g. 100k steps → 200k steps). Progress counts all history, unaffected by other goals.'}
                  </p>
                </div>
              </label>
            </div>

            {/* 針對獎勵：選擇要追蹤的獎勵類型 + 目標數量 */}
            {formData.tracking_mode === 'cumulative_amount' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {locale === 'zh-TW' ? '要追蹤的獎勵類型' : 'Reward Type to Track'} *
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    {locale === 'zh-TW' ? '選擇要累積計算哪一種獎勵的數量' : 'Select which reward type\'s amount to accumulate'}
                  </p>
                  <select
                    value={formData.tracking_reward_type_id || ''}
                    onChange={(e) => setFormData({ ...formData, tracking_reward_type_id: e.target.value || null })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="">
                      {locale === 'zh-TW' ? '選擇獎勵類型' : 'Select reward type'}
                    </option>
                    {rewardTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.display_name || type.type_key}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {locale === 'zh-TW' ? '目標數量' : 'Target Amount'}
                  </label>
                  <input
                    type="number"
                    value={formData.target_amount ?? ''}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    min={0}
                    step="0.01"
                    placeholder={locale === 'zh-TW' ? '例如：1000' : 'e.g. 1000'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </>
            )}

            {/* 針對行為：選擇要追蹤的優良事件 + 目標次數 */}
            {formData.tracking_mode === 'completion_count' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {locale === 'zh-TW' ? '要追蹤的優良事件' : 'Achievement Events to Track'}
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    {locale === 'zh-TW' 
                      ? '選擇計入此目標的優良事件。未選擇時，所有事件都會計入。'
                      : 'Select which events count toward this goal. If none selected, all events will count.'}
                  </p>
                  {achievementEvents.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {achievementEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => {
                            const current = formData.linked_event_ids || []
                            const updated = current.includes(event.id)
                              ? current.filter(id => id !== event.id)
                              : [...current, event.id]
                            setFormData({ ...formData, linked_event_ids: updated })
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            (formData.linked_event_ids || []).includes(event.id)
                              ? 'bg-primary text-white shadow-md'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-primary/30 hover:text-primary'
                          }`}
                        >
                          {event.icon && <span>{event.icon}</span>}
                          {event.name || event.id}
                          {(formData.linked_event_ids || []).includes(event.id) && (
                            <span className="material-icons-outlined text-sm">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 flex items-center gap-2 py-2">
                      <span className="material-icons-outlined text-sm animate-spin">autorenew</span>
                      {locale === 'zh-TW' ? '載入優良事件列表中...' : 'Loading achievement events...'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {locale === 'zh-TW' ? '目標次數' : 'Target Count'}
                  </label>
                  <input
                    type="number"
                    value={formData.target_count ?? ''}
                    onChange={(e) => setFormData({ ...formData, target_count: e.target.value ? parseInt(e.target.value) : null })}
                    min={0}
                    placeholder={locale === 'zh-TW' ? '例如：10' : 'e.g. 10'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </>
            )}

            {/* 追蹤起算時間 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '追蹤起算時間' : 'Tracking Start Date'}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {locale === 'zh-TW'
                  ? '開啟後只計算指定日期之後的紀錄；關閉則計算所有歷史紀錄，讓學生可以直接用現有的累積獎勵兌換目標。'
                  : 'When enabled, only count records after the specified date. When disabled, all history counts — students can use existing rewards to redeem goals immediately.'}
              </p>
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={!!formData.tracking_started_at}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, tracking_started_at: toDateInputValue(new Date().toISOString()) })
                      } else {
                        setFormData({ ...formData, tracking_started_at: '' })
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {locale === 'zh-TW' ? '設定起算時間' : 'Set start date'}
                </span>
              </label>
              {formData.tracking_started_at && (
                <input
                  type="date"
                  value={formData.tracking_started_at}
                  onChange={(e) => setFormData({ ...formData, tracking_started_at: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              )}
            </div>

            {/* 完成獎勵 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🏆 {locale === 'zh-TW' ? '達成目標後的獎勵' : 'Completion Reward'}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {locale === 'zh-TW'
                  ? '可選。達成目標本身可能已經是最大的獎勵（如去海邊玩、買腳踏車），不一定需要額外的系統獎勵回饋。'
                  : 'Optional. The goal itself may already be the reward (e.g. a beach trip, a new bike). Extra system rewards are not always needed.'}
              </p>
              <label className={`flex items-center gap-3 cursor-pointer mb-3 p-3 rounded-xl border-2 transition-all ${
                formData.reward_type_id !== null
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.reward_type_id !== null}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, reward_type_id: '' })
                      } else {
                        setFormData({ ...formData, reward_type_id: null, reward_on_complete: 0 })
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-checked:bg-amber-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {locale === 'zh-TW' ? '設定達成獎勵' : 'Set completion reward'}
                </span>
              </label>
              {formData.reward_type_id !== null && formData.reward_type_id !== undefined && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'zh-TW' ? '獎勵類型' : 'Reward Type'}
                      </label>
                      <select
                        value={formData.reward_type_id || ''}
                        onChange={(e) => setFormData({ ...formData, reward_type_id: e.target.value || '' })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      >
                        <option value="">
                          {locale === 'zh-TW' ? '選擇獎勵類型' : 'Select reward type'}
                        </option>
                        {rewardTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.icon} {type.display_name || type.type_key}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'zh-TW' ? '獎勵數量' : 'Reward Amount'}
                      </label>
                      <input
                        type="number"
                        value={formData.reward_on_complete}
                        onChange={(e) => setFormData({ ...formData, reward_on_complete: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step="0.01"
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 圖片上傳 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '圖片' : 'Images'}
              </label>
              <ImageUploader
                images={formData.image_urls}
                onChange={(images) => setFormData({ ...formData, image_urls: images })}
                maxCount={10}
                disabled={loading}
                uploadEndpoint="/api/student-goals/upload-image"
                deleteEndpoint="/api/student-goals/delete-image"
                idFieldName="goalId"
                entityId={editingGoal?.id}
              />
            </div>

            {/* 啟用狀態 */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">
                  {locale === 'zh-TW' ? '啟用中' : 'Active'}
                </span>
              </label>
            </div>

            {/* 按鈕區域 */}
            <div className="pt-6 flex gap-3 justify-between border-t border-slate-100 mt-8">
              <div>
                {isEditing && editingGoal?.id && onDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                      const goalId = editingGoal?.id
                      if (!goalId) return
                      if (!confirm(locale === 'zh-TW' ? '確定要刪除這個大型目標嗎？' : 'Are you sure you want to delete this goal?')) {
                        return
                      }
                      setDeleting(true)
                      try {
                        await onDelete(goalId)
                        onClose()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '刪除失敗' : 'Delete failed'))
                      } finally {
                        setDeleting(false)
                      }
                    }}
                    disabled={deleting || loading}
                    className="px-6 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? (locale === 'zh-TW' ? '刪除中...' : 'Deleting...') : '🗑️ ' + (locale === 'zh-TW' ? '刪除' : 'Delete')}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {locale === 'zh-TW' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading || deleting}
                  className="px-8 py-2.5 rounded-xl font-semibold bg-primary text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (locale === 'zh-TW' ? '儲存中...' : 'Saving...')
                    : isEditing
                      ? (locale === 'zh-TW' ? '儲存變更' : 'Save Changes')
                      : (locale === 'zh-TW' ? '建立目標' : 'Create Goal')
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}
