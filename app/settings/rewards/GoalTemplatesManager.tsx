'use client'

import { useCallback, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'
import ImageUploader, { GoalTemplateImage } from '@/app/components/ImageUploader'
import ImageViewer from '@/app/components/ImageViewer'
import { toDateInputValue } from '@/lib/utils/goalTracking'

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

interface Student {
  id: string
  name: string
  avatar_url?: string | null
}

interface AssignedStudentGoal {
  id: string
  student_id: string
  student_name: string
  student_avatar_url?: string | null
  status?: string | null
  is_active?: boolean | null
  tracking_started_at?: string | null
  completed_at?: string | null
}

type AchievementEventResponse = {
  id: string
  name?: string | null
  icon?: string | null
}

type TranslationFn = (key: string) => string

interface GoalTemplate {
  id: string
  name: string
  description: string | null
  tracking_mode: 'cumulative_amount' | 'completion_count'
  target_amount: number | null
  target_count: number | null
  tracking_reward_type_id: string | null
  reward_type_id: string | null
  reward_on_complete: number
  consume_on_complete: boolean
  tracking_started_at: string | null
  icon: string
  color: string
  is_active: boolean
  display_order: number
  events: AchievementEvent[]
  image_urls: GoalTemplateImage[]
  assigned_goals?: AssignedStudentGoal[]
}

export default function GoalTemplatesManager() {
  const t = useTranslations('goalTemplates')

  const [templates, setTemplates] = useState<GoalTemplate[]>([])
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([])
  const [achievementEvents, setAchievementEvents] = useState<AchievementEvent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<GoalTemplate | null>(null)
  const [draftTemplate, setDraftTemplate] = useState<GoalTemplate | null>(null)
  const [assigningTemplate, setAssigningTemplate] = useState<GoalTemplate | null>(null)
  const [mounted, setMounted] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [templatesRes, typesRes, eventsRes, studentsRes] = await Promise.all([
        fetch('/api/goal-templates/list'),
        fetch('/api/custom-reward-types/list'),
        fetch('/api/achievement-events/list'),
        fetch('/api/students/list'),
      ])

      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setTemplates(data.templates || [])
      }
      if (typesRes.ok) {
        const data = await typesRes.json()
        setRewardTypes(data.types || [])
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        // Normalize achievement events to single name field
        const normalized = (data.events || []).map((e: AchievementEventResponse) => ({
          id: e.id,
          name: e.name || '',
          icon: e.icon,
        }))
        setAchievementEvents(normalized)
      }
      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data.students || [])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    try {
      const res = await fetch('/api/goal-templates/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        await loadData()
      } else {
        const data = await res.json()
        setError(data.error || t('deleteFailed'))
      }
    } catch {
      setError(t('deleteFailed'))
    }
  }

  const handleToggleActive = async (template: GoalTemplate) => {
    try {
      const res = await fetch('/api/goal-templates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, is_active: !template.is_active }),
      })
      if (res.ok) {
        await loadData()
      } else {
        const data = await res.json()
        setError(data.error || t('saveFailed'))
      }
    } catch {
      setError(t('saveFailed'))
    }
  }

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const handleDuplicate = (template: GoalTemplate) => {
    setEditingTemplate(null)
    setDraftTemplate({
      ...template,
      id: '',
      name: `${template.name || 'Goal'} copy`,
      assigned_goals: [],
    })
    setShowForm(true)
  }

  const getRewardTypeName = (rt: RewardType | undefined) => {
    if (!rt) return ''
    return rt.display_name || rt.type_key
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <span className="material-icons-outlined text-4xl animate-spin mb-2">autorenew</span>
        <p>{t('loading')}</p>
      </div>
    )
  }

  const activeTemplates = templates.filter((t) => t.is_active)
  const inactiveTemplates = templates.filter((t) => !t.is_active)

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-500 text-xs mt-1 underline">{t('dismiss')}</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-700">{t('existingGoals')}</h2>
        <button
          onClick={() => { setEditingTemplate(null); setDraftTemplate(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold shadow-md"
        >
          <span className="material-icons-outlined text-lg">add</span>
          {t('addGoal')}
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <span className="material-icons-outlined text-5xl text-slate-300 mb-3">flag</span>
          <p className="text-slate-500 text-lg font-medium">{t('noGoals')}</p>
          <p className="text-slate-400 text-sm mt-1">{t('noGoalsHint')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTemplates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('active')}</h3>
              <div className="space-y-3">
                {activeTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    rewardTypes={rewardTypes}
                    onEdit={() => { setEditingTemplate(template); setDraftTemplate(null); setShowForm(true) }}
                    onAssign={() => setAssigningTemplate(template)}
                    onDuplicate={() => handleDuplicate(template)}
                    onDelete={() => handleDelete(template.id)}
                    onToggle={() => handleToggleActive(template)}
                    getRewardTypeName={getRewardTypeName}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
          {inactiveTemplates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">{t('inactive')}</h3>
              <div className="space-y-3 opacity-60">
                {inactiveTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    rewardTypes={rewardTypes}
                    onEdit={() => { setEditingTemplate(template); setDraftTemplate(null); setShowForm(true) }}
                    onAssign={() => setAssigningTemplate(template)}
                    onDuplicate={() => handleDuplicate(template)}
                    onDelete={() => handleDelete(template.id)}
                    onToggle={() => handleToggleActive(template)}
                    getRewardTypeName={getRewardTypeName}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mounted && showForm && (
        <GoalTemplateFormModal
          template={editingTemplate}
          draftTemplate={draftTemplate}
          rewardTypes={rewardTypes}
          achievementEvents={achievementEvents}
          onClose={() => { setShowForm(false); setEditingTemplate(null); setDraftTemplate(null) }}
          onSaved={() => { setShowForm(false); setEditingTemplate(null); setDraftTemplate(null); loadData() }}
        />
      )}

      {mounted && assigningTemplate && (
        <GoalAssignModal
          template={assigningTemplate}
          students={students}
          onClose={() => setAssigningTemplate(null)}
          onAssigned={() => { setAssigningTemplate(null); loadData() }}
        />
      )}
    </div>
  )
}

function TemplateCard({
  template,
  rewardTypes,
  onEdit,
  onAssign,
  onDuplicate,
  onDelete,
  onToggle,
  getRewardTypeName,
  t,
}: {
  template: GoalTemplate
  rewardTypes: RewardType[]
  onEdit: () => void
  onAssign: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggle: () => void
  getRewardTypeName: (rt: RewardType | undefined) => string
  t: TranslationFn
}) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const completionRt = template.reward_type_id
    ? rewardTypes.find((r) => r.id === template.reward_type_id)
    : undefined
  const trackingRt = template.tracking_reward_type_id
    ? rewardTypes.find((r) => r.id === template.tracking_reward_type_id)
    : undefined
  const coverImage = template.image_urls && template.image_urls.length > 0
    ? template.image_urls[0]
    : null
  const activeAssignedGoals = (template.assigned_goals || []).filter(
    (goal) => goal.status !== 'completed' && goal.is_active !== false
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage.url}
              alt={template.name}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity hover:scale-105"
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setViewerIndex(0)
                setViewerOpen(true)
              }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
              style={{ backgroundColor: `${template.color}20`, color: template.color }}
            >
              {template.icon || '🎯'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-slate-800 truncate">
                {template.name || String(template.id).slice(0, 8)}
              </h3>
              {!template.is_active && (
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">
                  {t('inactive')}
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-slate-500 mb-2 line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
              {activeAssignedGoals.length > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                    <span className="material-icons-outlined text-sm">group</span>
                    已指派 {activeAssignedGoals.length} 位
                  </span>
                  {activeAssignedGoals.slice(0, 3).map((goal) => (
                    <span key={goal.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                      {goal.student_name || goal.student_id.slice(0, 8)}
                    </span>
                  ))}
                  {activeAssignedGoals.length > 3 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                      +{activeAssignedGoals.length - 3}
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                  <span className="material-icons-outlined text-sm">inventory_2</span>
                  模板
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {/* 追蹤模式標籤 */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
                <span className="material-icons-outlined text-sm">
                  {template.tracking_mode === 'cumulative_amount' ? 'trending_up' : 'repeat'}
                </span>
                {template.tracking_mode === 'cumulative_amount'
                  ? (t('trackingCumulativeAmount') || '累積數量')
                  : (t('trackingCompletionCount') || '完成次數')}
              </span>

              {/* 里程碑標記 */}
              {template.consume_on_complete === false && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  📈 {t('milestone') || '里程碑'}
                </span>
              )}

              {/* 追蹤的獎勵類型（cumulative_amount 模式） */}
              {template.tracking_mode === 'cumulative_amount' && trackingRt && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${trackingRt.color}15`, color: trackingRt.color }}
                >
                  <span>{trackingRt.icon}</span>
                  {getRewardTypeName(trackingRt)}
                </span>
              )}

              {/* 目標數值 */}
              {template.tracking_mode === 'cumulative_amount' && template.target_amount != null && (
                <span className="inline-flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">flag</span>
                  {t('targetAmount') || '目標'}: {template.target_amount}
                </span>
              )}
              {template.tracking_mode === 'completion_count' && template.target_count != null && (
                <span className="inline-flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">flag</span>
                  {t('targetCount') || '目標次數'}: {template.target_count}
                </span>
              )}

              {/* 達成獎勵 */}
              {completionRt && template.reward_on_complete > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${completionRt.color}15`, color: completionRt.color }}
                >
                  <span>{completionRt.icon}</span>
                  🏆 +{template.reward_on_complete}
                </span>
              )}
            </div>

            {/* 追蹤起算時間 */}
            {template.tracking_started_at && (
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <span className="material-icons-outlined text-sm">calendar_today</span>
                {t('trackingSince') || '追蹤自'}: {toDateInputValue(template.tracking_started_at)}
              </div>
            )}

            {/* 優良事件標籤（completion_count 模式） */}
            {template.events && template.events.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {template.events.map((event) => (
                  <span
                    key={event.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                  >
                    {event.icon && <span>{event.icon}</span>}
                    {event.name || event.id}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onAssign}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
            title="指派學生"
          >
            <span className="material-icons-outlined text-xl">person_add</span>
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
            title="複製模板"
          >
            <span className="material-icons-outlined text-xl">content_copy</span>
          </button>
          <button
            onClick={onToggle}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
            title={template.is_active ? t('deactivate') : t('activate')}
          >
            <span className="material-icons-outlined text-xl">
              {template.is_active ? 'toggle_on' : 'toggle_off'}
            </span>
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            title={t('edit')}
          >
            <span className="material-icons-outlined text-xl">edit</span>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title={t('delete')}
          >
            <span className="material-icons-outlined text-xl">delete_outline</span>
          </button>
        </div>
      </div>

      <ImageViewer
        images={template.image_urls || []}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}

interface GoalTemplateFormModalProps {
  template: GoalTemplate | null
  draftTemplate?: GoalTemplate | null
  rewardTypes: RewardType[]
  achievementEvents: AchievementEvent[]
  onClose: () => void
  onSaved: () => void
}

function GoalTemplateFormModal({
  template,
  draftTemplate,
  rewardTypes,
  achievementEvents,
  onClose,
  onSaved,
}: GoalTemplateFormModalProps) {
  const t = useTranslations('goalTemplates')
  const isEditing = !!template
  const sourceTemplate = template || draftTemplate

  const [name, setName] = useState(sourceTemplate?.name || '')
  const [description, setDescription] = useState(sourceTemplate?.description || '')
  const [trackingMode, setTrackingMode] = useState<'cumulative_amount' | 'completion_count'>(
    sourceTemplate?.tracking_mode || 'cumulative_amount'
  )
  const [targetAmount, setTargetAmount] = useState(sourceTemplate?.target_amount ?? null as number | null)
  const [targetCount, setTargetCount] = useState(sourceTemplate?.target_count ?? null as number | null)
  const [trackingRewardTypeId, setTrackingRewardTypeId] = useState(sourceTemplate?.tracking_reward_type_id || '')
  // rewardTypeId: null = toggle OFF, '' = toggle ON but unselected, string = selected
  const [rewardTypeId, setRewardTypeId] = useState<string | null>(
    (sourceTemplate?.reward_type_id && sourceTemplate.reward_type_id.length > 0) ? sourceTemplate.reward_type_id : null
  )
  const [rewardOnComplete, setRewardOnComplete] = useState(sourceTemplate?.reward_on_complete ?? 0)
  const [trackingStartedAt, setTrackingStartedAt] = useState(toDateInputValue(sourceTemplate?.tracking_started_at))
  const [consumeOnComplete, setConsumeOnComplete] = useState(sourceTemplate?.consume_on_complete ?? true)
  const [icon, setIcon] = useState(sourceTemplate?.icon || '🎯')
  const [color, setColor] = useState(sourceTemplate?.color || '#6a99e0')
  const [isActive, setIsActive] = useState(sourceTemplate?.is_active ?? true)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(
    sourceTemplate?.events?.map((e) => e.id) || []
  )

  const [imageUrls, setImageUrls] = useState<GoalTemplateImage[]>(
    sourceTemplate?.image_urls || []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }
    // cumulative_amount 模式需要選擇追蹤的獎勵類型
    if (trackingMode === 'cumulative_amount' && !trackingRewardTypeId) {
      setError(t('trackingRewardTypeRequired') || 'Please select a reward type to track')
      return
    }
    // 若開啟了達成獎勵但未選擇類型
    if (rewardTypeId !== null && !rewardTypeId) {
      setError(t('rewardTypeRequired'))
      return
    }
    setSaving(true)
    setError('')

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      tracking_mode: trackingMode,
      target_amount: trackingMode === 'cumulative_amount' ? targetAmount : null,
      target_count: trackingMode === 'completion_count' ? targetCount : null,
      tracking_reward_type_id: trackingMode === 'cumulative_amount' ? trackingRewardTypeId : null,
      tracking_started_at: trackingStartedAt || null,
      consume_on_complete: consumeOnComplete,
      reward_type_id: rewardTypeId || null,
      reward_on_complete: rewardTypeId !== null ? rewardOnComplete : 0,
      icon: icon || '🎯',
      color: color || '#6a99e0',
      image_urls: imageUrls,
      is_active: isActive,
      event_ids: trackingMode === 'completion_count' ? selectedEventIds : [],
    }

    try {
      const url = isEditing ? '/api/goal-templates/update' : '/api/goal-templates/create'
      if (isEditing) payload.id = template!.id

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSaved()
      } else {
        const data = await res.json()
        setError(data.error || t('saveFailed'))
      }
    } catch {
      setError(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const presetIcons = ['🎯', '🏖️', '🎮', '📚', '🚴', '🎸', '🎨', '🏆', '⭐', '💎', '🛴', '🎁', '✈️', '🏰', '🎪']
  const COLOR_OPTIONS = [
    { name: 'blue', value: '#3b82f6' },
    { name: 'purple', value: '#8b5cf6' },
    { name: 'pink', value: '#ec4899' },
    { name: 'orange', value: '#f97316' },
    { name: 'green', value: '#10b981' },
    { name: 'yellow', value: '#fbbf24' }
  ]

  // 判斷是否為 emoji
  const isEmojiIcon = (iconStr: string): boolean => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(iconStr) ||
           iconStr.length <= 2 ||
           !/^[a-z_]+$/i.test(iconStr)
  }

  const modal = (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左側視覺自訂區域 */}
        <div className="w-full md:w-1/3 bg-slate-50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto flex-shrink-0">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
              {t('visualCustomization') || '視覺自訂'}
            </h3>

            {/* 圖標預覽 */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border-4 border-white shadow-xl"
              style={{ backgroundColor: `${color}20` }}
            >
              {isEmojiIcon(icon) ? (
                <span className="text-3xl" style={{ color }}>{icon}</span>
              ) : (
                <span className="material-icons-outlined text-3xl" style={{ color }}>{icon}</span>
              )}
            </div>

            {/* 圖標選擇 */}
            <div className="mb-6 w-full">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                {t('icon') || '圖標'}
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                {presetIcons.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all ${
                      icon === em ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' : 'bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl"
                placeholder="🎯"
              />
              <p className="text-xs text-slate-400 mt-1">
                💡 {t('iconHint') || '可輸入 emoji 或 Material Icon 名稱'}
              </p>
            </div>

            {/* 顏色選擇 */}
            <div className="w-full">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                {t('color') || '顏色'}
              </p>
              <div className="flex justify-center gap-3 mb-3">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                      color === opt.value ? 'ring-4 ring-offset-2' : 'opacity-50 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.value }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 右側表單區域 */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors z-10"
          >
            <span className="material-icons-outlined">close</span>
          </button>

          <header className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {isEditing ? t('editGoal') : t('addGoal')}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {t('configureDescription') || '設定目標模板的追蹤方式與獎勵'}
            </p>
          </header>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 區塊一：基本資訊 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('name') || '目標名稱'} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder={t('namePlaceholder') || '例如：海邊度假'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('description') || '目標說明'}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                placeholder={t('descriptionPlaceholder') || '描述此目標的詳細內容...'}
              />
            </div>

            {/* 圖片上傳 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('images') || '圖片'}</label>
              <ImageUploader
                images={imageUrls}
                onChange={setImageUrls}
                maxCount={10}
                disabled={saving}
                idFieldName="templateId"
                entityId={template?.id}
              />
            </div>

            {/* 區塊二：追蹤目標（模式選擇） */}
            <div className="pt-2">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                {t('trackingTarget') || '追蹤目標'}
              </label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  trackingMode === 'cumulative_amount'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="tracking_mode"
                    value="cumulative_amount"
                    checked={trackingMode === 'cumulative_amount'}
                    onChange={() => { setTrackingMode('cumulative_amount'); setTargetCount(null); setSelectedEventIds([]) }}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">🎁 {t('trackingCumulativeAmount') || '針對獎勵'}</p>
                    <p className="text-xs text-slate-500">{t('trackingCumulativeAmountDesc') || '追蹤學生累積獲得的獎勵總量'}</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  trackingMode === 'completion_count'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="tracking_mode"
                    value="completion_count"
                    checked={trackingMode === 'completion_count'}
                    onChange={() => { setTrackingMode('completion_count'); setTargetAmount(null); setTrackingRewardTypeId('') }}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">✅ {t('trackingCompletionCount') || '針對行為'}</p>
                    <p className="text-xs text-slate-500">{t('trackingCompletionCountDesc') || '追蹤學生完成指定優良事件的次數'}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* 里程碑模式 */}
            <div>
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                !consumeOnComplete
                  ? 'border-green-400 bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={!consumeOnComplete}
                    onChange={(e) => setConsumeOnComplete(!e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-checked:bg-green-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      📈 {t('milestoneMode') || '里程碑模式'}
                    </span>
                    {!consumeOnComplete && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        {t('enabled') || '已啟用'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('milestoneModeDesc') || '達成後不消耗積分或次數，適合累計型目標。進度計算所有歷史紀錄，不受其他目標影響。'}
                  </p>
                </div>
              </label>
            </div>

            {/* 區塊三：模式相關選項 */}
            {trackingMode === 'cumulative_amount' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('trackingRewardType') || '要追蹤的獎勵類型'} *
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    {t('trackingRewardTypeHint') || '選擇要累積計算哪一種獎勵的數量'}
                  </p>
                  <select
                    value={trackingRewardTypeId}
                    onChange={(e) => setTrackingRewardTypeId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="">{t('selectRewardType') || '選擇獎勵類型'}</option>
                    {rewardTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.display_name || type.type_key}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('targetAmount') || '目標數量'}
                  </label>
                  <input
                    type="number"
                    value={targetAmount ?? ''}
                    onChange={(e) => setTargetAmount(e.target.value ? parseFloat(e.target.value) : null)}
                    min={0}
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder={t('targetAmountPlaceholder') || '例如：1000'}
                  />
                </div>
              </>
            )}

            {trackingMode === 'completion_count' && (
              <>
                {achievementEvents.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('linkedEvents') || '要追蹤的優良事件'}
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      {t('linkedEventsHint') || '選擇計入此目標的優良事件。未選擇時，所有事件都會計入。'}
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {achievementEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => toggleEvent(event.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedEventIds.includes(event.id)
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-600'
                          }`}
                        >
                          {event.icon && <span>{event.icon}</span>}
                          {event.name || event.id}
                          {selectedEventIds.includes(event.id) && (
                            <span className="material-icons-outlined text-sm">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t('targetCount') || '目標次數'}
                  </label>
                  <input
                    type="number"
                    value={targetCount ?? ''}
                    onChange={(e) => setTargetCount(e.target.value ? parseInt(e.target.value) : null)}
                    min={0}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder={t('targetCountPlaceholder') || '例如：10'}
                  />
                </div>
              </>
            )}

            {/* 區塊四：追蹤起算時間 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('trackingStartedAt') || '追蹤起算時間'}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {t('trackingStartedAtHint') || '開啟後只計算指定日期之後的紀錄；關閉則計算所有歷史紀錄。'}
              </p>
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={!!trackingStartedAt}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTrackingStartedAt(toDateInputValue(new Date().toISOString()))
                      } else {
                        setTrackingStartedAt('')
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {t('setStartDate') || '設定起算時間'}
                </span>
              </label>
              {trackingStartedAt && (
                <input
                  type="date"
                  value={trackingStartedAt}
                  onChange={(e) => setTrackingStartedAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              )}
            </div>

            {/* 區塊五：達成獎勵（toggle） */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🏆 {t('completionReward') || '達成目標後的獎勵'}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {t('completionRewardHint') || '可選。達成目標本身可能已經是最大的獎勵，不一定需要額外的系統獎勵回饋。'}
              </p>
              <label className={`flex items-center gap-3 cursor-pointer mb-3 p-3 rounded-xl border-2 transition-all ${
                rewardTypeId !== null
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rewardTypeId !== null}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRewardTypeId('')
                      } else {
                        setRewardTypeId(null)
                        setRewardOnComplete(0)
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-checked:bg-amber-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {t('setCompletionReward') || '設定達成獎勵'}
                </span>
              </label>
              {rewardTypeId !== null && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('rewardType') || '獎勵類型'}
                      </label>
                      <select
                        value={rewardTypeId ?? ''}
                        onChange={(e) => setRewardTypeId(e.target.value || '')}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      >
                        <option value="">{t('selectRewardType') || '選擇獎勵類型'}</option>
                        {rewardTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.icon} {type.display_name || type.type_key}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('rewardOnComplete') || '獎勵數量'}
                      </label>
                      <input
                        type="number"
                        value={rewardOnComplete}
                        onChange={(e) => setRewardOnComplete(parseFloat(e.target.value) || 0)}
                        min={0}
                        step="0.01"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 啟用狀態 */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">{t('isActive') || '啟用中'}</span>
              </label>
            </div>

            {/* 按鈕 */}
            <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {t('cancel') || '取消'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-2.5 rounded-xl font-semibold bg-primary text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (t('saving') || '儲存中...') : isEditing ? (t('saveChanges') || '儲存變更') : (t('create') || '建立目標')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function GoalAssignModal({
  template,
  students,
  onClose,
  onAssigned,
}: {
  template: GoalTemplate
  students: Student[]
  onClose: () => void
  onAssigned: () => void
}) {
  const activeAssignedStudentIds = new Set(
    (template.assigned_goals || [])
      .filter((goal) => goal.status !== 'completed' && goal.is_active !== false)
      .map((goal) => goal.student_id)
  )
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  const toggleStudent = (studentId: string) => {
    if (activeAssignedStudentIds.has(studentId)) return
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0) {
      setError('請至少選擇一位尚未指派的學生')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/goal-templates/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          student_ids: selectedStudentIds,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '指派失敗')
      }

      onAssigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : '指派失敗')
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">指派大型目標</h2>
            <p className="mt-1 text-sm text-slate-500">
              {template.name} 會複製成每位學生自己的目標實例。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {students.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              目前沒有可指派的學生
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => {
                const isAssigned = activeAssignedStudentIds.has(student.id)
                const isSelected = selectedStudentIds.includes(student.id)
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggleStudent(student.id)}
                    disabled={isAssigned}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      isAssigned
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : isSelected
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    <span className="font-medium">{student.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      {isAssigned ? (
                        <>
                          <span className="material-icons-outlined text-sm">check_circle</span>
                          已指派
                        </>
                      ) : isSelected ? (
                        <>
                          <span className="material-icons-outlined text-sm">check</span>
                          將指派
                        </>
                      ) : (
                        '可指派'
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={saving || selectedStudentIds.length === 0}
            className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '指派中...' : `指派 ${selectedStudentIds.length} 位`}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
