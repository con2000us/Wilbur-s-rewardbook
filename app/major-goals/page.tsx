'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import HomeButton from '@/app/components/HomeButton'

type ProgressBasis = 'total_earned' | 'current_balance' | 'net_value'

interface GoalConversionRule {
  id: string
  rewardType: string
  unit: string
  perUnitProgress: number
}

interface GoalItem {
  id: string
  name: string
  description: string
  targetValue: number
  currentValue: number
  progressBasis: ProgressBasis
  isActive: boolean
  displayOrder: number
  conversionRules: GoalConversionRule[]
}

const sampleGoals: GoalItem[] = [
  {
    id: 'goal-beach',
    name: '海邊度假',
    description: '累積行為獎勵，暑假安排海邊兩天一夜。',
    targetValue: 200,
    currentValue: 72,
    progressBasis: 'total_earned',
    isActive: true,
    displayOrder: 1,
    conversionRules: [
      { id: 'r1', rewardType: '學習積分', unit: '分', perUnitProgress: 0.4 },
      { id: 'r2', rewardType: '愛心', unit: '顆', perUnitProgress: 1.2 },
    ],
  },
  {
    id: 'goal-bookstore',
    name: '書店購書日',
    description: '達標後安排一次書店挑書活動。',
    targetValue: 120,
    currentValue: 35,
    progressBasis: 'net_value',
    isActive: true,
    displayOrder: 2,
    conversionRules: [{ id: 'r3', rewardType: '星星', unit: '顆', perUnitProgress: 0.8 }],
  },
]

function createEmptyGoal(): GoalItem {
  return {
    id: '',
    name: '',
    description: '',
    targetValue: 100,
    currentValue: 0,
    progressBasis: 'total_earned',
    isActive: true,
    displayOrder: 0,
    conversionRules: [{ id: crypto.randomUUID(), rewardType: '', unit: '', perUnitProgress: 0.5 }],
  }
}

export default function MajorGoalsPage() {
  const t = useTranslations('majorGoals')
  const [goals, setGoals] = useState<GoalItem[]>(sampleGoals)
  const [showForm, setShowForm] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [formData, setFormData] = useState<GoalItem>(createEmptyGoal())
  const [formError, setFormError] = useState('')

  const sortedGoals = useMemo(() => [...goals].sort((a, b) => a.displayOrder - b.displayOrder), [goals])

  const basisOptions: Array<{ value: ProgressBasis; label: string }> = [
    { value: 'total_earned', label: t('basisTotalEarned') },
    { value: 'current_balance', label: t('basisCurrentBalance') },
    { value: 'net_value', label: t('basisNetValue') },
  ]

  const openCreate = () => {
    setFormError('')
    setEditingGoalId(null)
    setFormData(createEmptyGoal())
    setShowForm(true)
  }

  const openEdit = (goal: GoalItem) => {
    setFormError('')
    setEditingGoalId(goal.id)
    setFormData({
      ...goal,
      conversionRules: goal.conversionRules.map((r) => ({ ...r })),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingGoalId(null)
    setFormError('')
  }

  const updateConversionRule = (ruleId: string, field: keyof GoalConversionRule, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      conversionRules: prev.conversionRules.map((rule) =>
        rule.id === ruleId ? { ...rule, [field]: value } : rule
      ),
    }))
  }

  const addConversionRule = () => {
    setFormData((prev) => ({
      ...prev,
      conversionRules: [...prev.conversionRules, { id: crypto.randomUUID(), rewardType: '', unit: '', perUnitProgress: 0.5 }],
    }))
  }

  const removeConversionRule = (ruleId: string) => {
    setFormData((prev) => ({
      ...prev,
      conversionRules: prev.conversionRules.filter((rule) => rule.id !== ruleId),
    }))
  }

  const calcPercent = (goal: GoalItem) => {
    if (goal.targetValue <= 0) return 0
    return Math.max(0, Math.min(100, (goal.currentValue / goal.targetValue) * 100))
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError(t('nameRequired'))
      return
    }
    if (!(formData.targetValue > 0)) {
      setFormError(t('targetValueRequired'))
      return
    }

    const validRules = formData.conversionRules.filter((rule) => rule.rewardType.trim() && rule.perUnitProgress > 0)
    if (validRules.length === 0) {
      setFormError(t('conversionRuleRequired'))
      return
    }

    if (editingGoalId) {
      setGoals((prev) =>
        prev.map((goal) => (goal.id === editingGoalId ? { ...formData, id: editingGoalId, conversionRules: validRules } : goal))
      )
    } else {
      setGoals((prev) => [
        ...prev,
        {
          ...formData,
          id: `goal-${Date.now()}`,
          conversionRules: validRules,
        },
      ])
    }
    closeForm()
  }

  const handleDelete = (goalId: string) => {
    if (!confirm(t('confirmDelete'))) return
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId))
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-app-shell"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-sky-200/20"></div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">flag</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-slate-500 text-sm">{t('pageSubtitle')}</p>
              </div>
            </div>
            <HomeButton />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{t('existingGoals')}</h2>
                <p className="text-slate-500 text-sm mt-1">{t('scopeHint')}</p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 transition-opacity font-semibold shadow-sm"
              >
                <span className="material-icons-outlined text-lg">add</span>
                {t('addGoal')}
              </button>
            </div>

            <div className="mb-5 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sky-700 text-sm">{t('demoDataNotice')}</div>

            {sortedGoals.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <span className="material-icons-outlined text-5xl text-slate-300 mb-3">track_changes</span>
                <p className="text-slate-500 text-lg font-medium">{t('noGoals')}</p>
                <p className="text-slate-400 text-sm mt-1">{t('noGoalsHint')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedGoals.map((goal) => {
                  const percent = calcPercent(goal)
                  return (
                    <div key={goal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h3 className="text-lg font-bold text-slate-800">{goal.name}</h3>
                            {!goal.isActive && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">
                                {t('inactive')}
                              </span>
                            )}
                          </div>
                          {goal.description && <p className="text-sm text-slate-500 mb-3">{goal.description}</p>}

                          <div className="text-sm text-slate-600 mb-2">
                            {t('previewCurrentValue')}: <span className="font-semibold">{goal.currentValue}</span> / {goal.targetValue}
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                          </div>
                          <div className="text-sm text-slate-600 mb-3">
                            {t('previewPercent')}: <span className="font-semibold">{percent.toFixed(1)}%</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {goal.conversionRules.map((rule) => (
                              <span key={rule.id} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">
                                {rule.rewardType} ({rule.unit || '-'}) = {rule.perUnitProgress}%
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(goal)}
                            className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title={t('edit')}
                          >
                            <span className="material-icons-outlined text-xl">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(goal.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm()
          }}
        >
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSave} className="p-6 sm:p-7">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-slate-800">{editingGoalId ? t('editGoal') : t('addGoal')}</h3>
                <button
                  type="button"
                  onClick={closeForm}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <span className="material-icons-outlined">close</span>
                </button>
              </div>

              {formError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{formError}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('name')} *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                    placeholder={t('namePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('targetValue')} *</label>
                  <input
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetValue: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                    min={1}
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">{t('targetValueHint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('previewCurrentValue')}</label>
                  <input
                    type="number"
                    value={formData.currentValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, currentValue: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('progressBasis')}</label>
                  <select
                    value={formData.progressBasis}
                    onChange={(e) => setFormData((prev) => ({ ...prev, progressBasis: e.target.value as ProgressBasis }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                  >
                    {basisOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">{t('progressBasisHint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('displayOrder')}</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900"
                    min={0}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 resize-none"
                    rows={2}
                    placeholder={t('descriptionPlaceholder')}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-slate-800">{t('conversionRules')}</h4>
                  <button
                    type="button"
                    onClick={addConversionRule}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <span className="material-icons-outlined text-sm">add</span>
                    {t('addConversionRule')}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">{t('conversionRulesHint')}</p>

                <div className="space-y-2">
                  {formData.conversionRules.map((rule) => (
                    <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <input
                        type="text"
                        value={rule.rewardType}
                        onChange={(e) => updateConversionRule(rule.id, 'rewardType', e.target.value)}
                        placeholder={t('rewardType')}
                        className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                      />
                      <input
                        type="text"
                        value={rule.unit}
                        onChange={(e) => updateConversionRule(rule.id, 'unit', e.target.value)}
                        placeholder={t('unit')}
                        className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                      />
                      <input
                        type="number"
                        value={rule.perUnitProgress}
                        onChange={(e) => updateConversionRule(rule.id, 'perUnitProgress', Number(e.target.value))}
                        placeholder={t('perUnitProgress')}
                        className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                        min={0.01}
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => removeConversionRule(rule.id)}
                        className="sm:col-span-2 px-2 py-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={t('delete')}
                      >
                        <span className="material-icons-outlined text-lg">delete_outline</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  {t('isActive')}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity font-semibold">
                    {editingGoalId ? t('saveChanges') : t('create')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
