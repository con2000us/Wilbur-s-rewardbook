'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  normalizeAssessmentTypes,
  type AssessmentType,
} from '@/lib/assessmentTypes'

const ICON_OPTIONS = [
  'assignment',
  'checklist_rtl',
  'edit_note',
  'palette',
  'fact_check',
  'history_edu',
  'science',
  'menu_book',
  'calculate',
  'sports_score',
]

type Draft = {
  display_name: string
  icon: string
  color: string
}

export default function AssessmentTypesManager() {
  const locale = useLocale()
  const isZh = locale === 'zh-TW'
  const [types, setTypes] = useState<AssessmentType[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [newType, setNewType] = useState<Draft>({
    display_name: '',
    icon: 'assignment',
    color: '#64748b',
  })
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const sortedTypes = useMemo(() => normalizeAssessmentTypes(types), [types])

  async function loadTypes() {
    setError('')
    try {
      const response = await fetch('/api/assessment-types/list?includeInactive=true')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load assessment types')
      }

      const list = normalizeAssessmentTypes(data.types || [])
      setTypes(list)
      setDrafts(Object.fromEntries(list.map((type) => [
        type.id || type.type_key,
        {
          display_name: type.display_name,
          icon: type.icon,
          color: type.color || '#64748b',
        },
      ])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment types')
    }
  }

  useEffect(() => {
    loadTypes()
  }, [])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/assessment-types/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create assessment type')
      }
      setNewType({ display_name: '', icon: 'assignment', color: '#64748b' })
      await loadTypes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment type')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(type: AssessmentType) {
    const id = type.id
    if (!id) return
    const draft = drafts[id]
    if (!draft) return

    setSavingId(id)
    setError('')
    try {
      const response = await fetch('/api/assessment-types/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...draft }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update assessment type')
      }
      await loadTypes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assessment type')
    } finally {
      setSavingId(null)
    }
  }

  async function handleToggleActive(type: AssessmentType) {
    if (!type.id) return
    setSavingId(type.id)
    setError('')

    try {
      const endpoint = type.is_active === false
        ? '/api/assessment-types/update'
        : '/api/assessment-types/delete'
      const body = type.is_active === false
        ? { id: type.id, is_active: true }
        : { id: type.id }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update assessment type')
      }
      await loadTypes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assessment type')
    } finally {
      setSavingId(null)
    }
  }

  async function moveType(type: AssessmentType, direction: -1 | 1) {
    const index = sortedTypes.findIndex((item) => item.id === type.id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= sortedTypes.length) return

    const reordered = [...sortedTypes]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    setTypes(reordered.map((item, itemIndex) => ({
      ...item,
      display_order: itemIndex + 1,
    })))

    try {
      const response = await fetch('/api/assessment-types/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentTypeOrders: reordered
            .filter((item) => item.id)
            .map((item, itemIndex) => ({ id: item.id, display_order: itemIndex + 1 })),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reorder assessment types')
      }
      await loadTypes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder assessment types')
      await loadTypes()
    }
  }

  const text = {
    title: isZh ? '評量類別' : 'Assessment Types',
    add: isZh ? '新增類別' : 'Add Type',
    name: isZh ? '顯示名稱' : 'Display Name',
    icon: isZh ? '圖示' : 'Icon',
    color: isZh ? '顏色' : 'Color',
    key: isZh ? '資料 key' : 'Data Key',
    active: isZh ? '啟用' : 'Active',
    inactive: isZh ? '已停用' : 'Inactive',
    system: isZh ? '系統' : 'System',
    save: isZh ? '儲存' : 'Save',
    disable: isZh ? '停用' : 'Disable',
    enable: isZh ? '啟用' : 'Enable',
    noTypes: isZh ? '尚未建立評量類別。' : 'No assessment types yet.',
  }

  return (
    <div className="bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-800">{text.title}</h2>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="text"
          required
          value={newType.display_name}
          onChange={(event) => setNewType({ ...newType, display_name: event.target.value })}
          placeholder={text.name}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
        />
        <select
          value={newType.icon}
          onChange={(event) => setNewType({ ...newType, icon: event.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          aria-label={text.icon}
        >
          {ICON_OPTIONS.map((icon) => (
            <option key={icon} value={icon}>{icon}</option>
          ))}
        </select>
        <input
          type="color"
          value={newType.color}
          onChange={(event) => setNewType({ ...newType, color: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 bg-white px-2"
          aria-label={text.color}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          <span className="material-icons-outlined text-base">add_circle</span>
          {text.add}
        </button>
      </form>

      <div className="space-y-2">
        {sortedTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {text.noTypes}
          </div>
        ) : sortedTypes.map((type, index) => {
          const id = type.id || type.type_key
          const draft = drafts[id] || {
            display_name: type.display_name,
            icon: type.icon,
            color: type.color || '#64748b',
          }
          const isSaving = savingId === id

          return (
            <div
              key={id}
              className={`grid gap-3 rounded-lg border p-3 md:grid-cols-[auto_1fr_auto_auto_auto_auto] md:items-center ${
                type.is_active === false
                  ? 'border-slate-200 bg-slate-50 opacity-75'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-icons-outlined flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl"
                  style={{ color: draft.color }}
                >
                  {draft.icon}
                </span>
                <div className="md:hidden">
                  <div className="text-xs font-bold uppercase text-slate-400">{text.key}</div>
                  <div className="font-mono text-xs text-slate-500">{type.type_key}</div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-[minmax(140px,1fr)_minmax(120px,0.8fr)]">
                <input
                  type="text"
                  value={draft.display_name}
                  onChange={(event) => setDrafts({
                    ...drafts,
                    [id]: { ...draft, display_name: event.target.value },
                  })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                  aria-label={text.name}
                />
                <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500 md:flex">
                  {type.type_key}
                </div>
              </div>

              <select
                value={draft.icon}
                onChange={(event) => setDrafts({
                  ...drafts,
                  [id]: { ...draft, icon: event.target.value },
                })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                aria-label={text.icon}
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>

              <input
                type="color"
                value={draft.color}
                onChange={(event) => setDrafts({
                  ...drafts,
                  [id]: { ...draft, color: event.target.value },
                })}
                className="h-10 rounded-lg border border-slate-200 bg-white px-2"
                aria-label={text.color}
              />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveType(type, -1)}
                  disabled={index === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  title="Move up"
                >
                  <span className="material-icons-outlined text-base">keyboard_arrow_up</span>
                </button>
                <button
                  type="button"
                  onClick={() => moveType(type, 1)}
                  disabled={index === sortedTypes.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  title="Move down"
                >
                  <span className="material-icons-outlined text-base">keyboard_arrow_down</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                  type.is_active === false
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {type.is_active === false ? text.inactive : text.active}
                </span>
                {type.is_system && (
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">
                    {text.system}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSave(type)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  <span className="material-icons-outlined text-sm">save</span>
                  {text.save}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(type)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="material-icons-outlined text-sm">
                    {type.is_active === false ? 'toggle_on' : 'toggle_off'}
                  </span>
                  {type.is_active === false ? text.enable : text.disable}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
