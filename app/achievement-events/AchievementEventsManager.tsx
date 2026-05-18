'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'

interface RewardType {
  id: string
  type_key: string
  display_name?: string
  icon: string
  color: string
  default_unit: string | null
}

interface RewardRule {
  id?: string
  event_id?: string
  reward_type_id: string
  default_amount: number
  is_default: boolean
}

interface AchievementEvent {
  id: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

type RewardRulePayload = Pick<RewardRule, 'reward_type_id' | 'default_amount' | 'is_default'>
type RewardRuleField = keyof RewardRulePayload

type AchievementEventPayload = {
  id?: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
  reward_rules: RewardRulePayload[]
}

function getRewardTypeName(rt: RewardType) {
  return rt.display_name || rt.type_key
}

export default function AchievementEventsManager() {
  const t = useTranslations('achievementEvents')

  const [events, setEvents] = useState<AchievementEvent[]>([])
  const [rules, setRules] = useState<RewardRule[]>([])
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingEvent, setEditingEvent] = useState<AchievementEvent | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [mounted, setMounted] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [eventsRes, typesRes] = await Promise.all([
        fetch('/api/achievement-events/list'),
        fetch('/api/custom-reward-types/list'),
      ])

      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setEvents(data.events || [])
        setRules(data.rules || [])
      }
      if (typesRes.ok) {
        const data = await typesRes.json()
        setRewardTypes(data.types || [])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    try {
      const res = await fetch('/api/achievement-events/delete', {
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

  const getRulesForEvent = (eventId: string) => {
    return rules.filter((r) => r.event_id === eventId)
  }

  const getRewardType = (rewardTypeId: string) => {
    return rewardTypes.find((rt) => rt.id === rewardTypeId)
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <span className="material-icons-outlined text-4xl animate-spin mb-2">autorenew</span>
        <p>{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-500 text-xs mt-1 underline">{t('dismiss')}</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-700">{t('existingEvents')}</h2>
        <button
          onClick={() => { setEditingEvent(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-semibold shadow-md"
        >
          <span className="material-icons-outlined text-lg">add</span>
          {t('addEvent')}
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <span className="material-icons-outlined text-5xl text-slate-300 mb-3">emoji_events</span>
          <p className="text-slate-500 text-lg font-medium">{t('noEvents')}</p>
          <p className="text-slate-400 text-sm mt-1">{t('noEventsHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const eventRules = getRulesForEvent(event.id)
            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-800">
                        {event.name || String(event.id).slice(0, 8)}
                      </h3>
                      {!event.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">
                          {t('inactive')}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-500 mb-3">
                        {event.description}
                      </p>
                    )}

                    {eventRules.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {eventRules.map((rule) => {
                          const rt = getRewardType(rule.reward_type_id)
                          if (!rt) return null
                          return (
                            <span
                              key={`${rule.event_id}-${rule.reward_type_id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                              style={{
                                backgroundColor: `${rt.color}15`,
                                color: rt.color,
                                borderColor: `${rt.color}40`,
                              }}
                            >
                              <span className="text-sm">{rt.icon}</span>
                              {getRewardTypeName(rt)}
                              {rule.default_amount > 0 && (
                                <span className="opacity-70">+{rule.default_amount}{rt.default_unit || ''}</span>
                              )}
                              {rule.is_default && (
                                <span className="ml-0.5 opacity-60">★</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditingEvent(event); setShowForm(true) }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title={t('edit')}
                    >
                      <span className="material-icons-outlined text-xl">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title={t('delete')}
                    >
                      <span className="material-icons-outlined text-xl">delete_outline</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mounted && showForm && (
        <EventFormModal
          event={editingEvent}
          rewardTypes={rewardTypes}
          existingRules={editingEvent ? getRulesForEvent(editingEvent.id) : []}
          onClose={() => { setShowForm(false); setEditingEvent(null) }}
          onSaved={() => { setShowForm(false); setEditingEvent(null); loadData() }}
        />
      )}
    </div>
  )
}

interface EventFormModalProps {
  event: AchievementEvent | null
  rewardTypes: RewardType[]
  existingRules: RewardRule[]
  onClose: () => void
  onSaved: () => void
}

function EventFormModal({ event, rewardTypes, existingRules, onClose, onSaved }: EventFormModalProps) {
  const t = useTranslations('achievementEvents')
  const isEditing = !!event

  const [name, setName] = useState(event?.name || '')
  const [description, setDescription] = useState(event?.description || '')
  const [isActive, setIsActive] = useState(event?.is_active ?? true)
  const [displayOrder, setDisplayOrder] = useState(event?.display_order ?? 0)
  const [formRules, setFormRules] = useState<RewardRule[]>(
    existingRules.length > 0
      ? existingRules.map(r => ({ ...r }))
      : []
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

  const addRule = () => {
    const usedIds = formRules.map(r => r.reward_type_id)
    const available = rewardTypes.filter(rt => !usedIds.includes(rt.id))
    if (available.length === 0) return
    setFormRules([...formRules, {
      reward_type_id: available[0].id,
      default_amount: 1,
      is_default: formRules.length === 0,
    }])
  }

  const removeRule = (index: number) => {
    setFormRules(formRules.filter((_, i) => i !== index))
  }

  const updateRule = <K extends RewardRuleField>(index: number, field: K, value: RewardRulePayload[K]) => {
    setFormRules((currentRules) => {
      const updated = currentRules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      )

      if (field === 'is_default' && value === true) {
        return updated.map((rule, i) =>
          i === index ? rule : { ...rule, is_default: false }
        )
      }

      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }
    setSaving(true)
    setError('')

    const payload: AchievementEventPayload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      display_order: displayOrder,
      reward_rules: formRules.map(r => ({
        reward_type_id: r.reward_type_id,
        default_amount: r.default_amount,
        is_default: r.is_default,
      })),
    }

    try {
      const url = isEditing ? '/api/achievement-events/update' : '/api/achievement-events/create'
      if (isEditing && event) payload.id = event.id

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

  function getRewardTypeName(rt: RewardType) {
    return rt.display_name || rt.type_key
  }

  const usedRewardTypeIds = formRules.map(r => r.reward_type_id)

  const modal = (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {isEditing ? t('editEvent') : t('addEvent')}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-icons-outlined">close</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700">{t('isActive')}</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">{t('displayOrder')}</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-center text-sm"
                  min={0}
                />
              </div>
            </div>

            {/* 獎勵規則 */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-700">{t('rewardRules')}</h3>
                <button
                  type="button"
                  onClick={addRule}
                  disabled={usedRewardTypeIds.length >= rewardTypes.length}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-40"
                >
                  <span className="material-icons-outlined text-sm">add</span>
                  {t('addRule')}
                </button>
              </div>

              {formRules.length === 0 ? (
                <p className="text-sm text-slate-400 py-3">{t('noRules')}</p>
              ) : (
                <div className="space-y-3">
                  {formRules.map((rule, index) => {
                    const rt = rewardTypes.find(r => r.id === rule.reward_type_id)
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <select
                          value={rule.reward_type_id}
                          onChange={(e) => updateRule(index, 'reward_type_id', e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                        >
                          {rewardTypes.map((type) => (
                            <option
                              key={type.id}
                              value={type.id}
                              disabled={usedRewardTypeIds.includes(type.id) && type.id !== rule.reward_type_id}
                            >
                              {type.icon} {getRewardTypeName(type)}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={rule.default_amount}
                            onChange={(e) => updateRule(index, 'default_amount', Number(e.target.value))}
                            className="w-20 px-2 py-2 rounded-lg border border-slate-200 text-center text-sm bg-white"
                            min={0}
                            step="0.01"
                          />
                          <span className="text-xs text-slate-500 w-8">{rt?.default_unit || ''}</span>
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                          <input
                            type="radio"
                            name="default_rule"
                            checked={rule.is_default}
                            onChange={() => updateRule(index, 'is_default', true)}
                            className="text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-xs text-slate-500">{t('default')}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <span className="material-icons-outlined text-lg">close</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-2.5 rounded-xl font-semibold bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                {saving ? t('saving') : (isEditing ? t('saveChanges') : t('create'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
