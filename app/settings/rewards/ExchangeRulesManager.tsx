'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import ExchangeRulePopup from '@/app/student/[id]/rewards/ExchangeRulePopup'

interface ExchangeRule {
  id?: string
  name?: string
  description?: string
  required_reward_type_id: string
  required_amount: number
  reward_type_id?: string
  reward_amount?: number
  reward_item?: string
  is_active: boolean
  display_order: number
}

interface RewardType {
  id: string
  type_key: string
  display_name: string
  icon: string
  color: string
  default_unit: string | null
}

export default function ExchangeRulesManager() {
  const t = useTranslations('exchangeRules')

  const [rules, setRules] = useState<ExchangeRule[]>([])
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showPopup, setShowPopup] = useState(false)
  const [editingRule, setEditingRule] = useState<ExchangeRule | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesRes, typesRes] = await Promise.all([
        fetch('/api/exchange-rules/list'),
        fetch('/api/custom-reward-types/list'),
      ])

      if (rulesRes.ok) {
        const data = await rulesRes.json()
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
  }

  const getRewardType = (id: string) => rewardTypes.find((rt) => rt.id === id)
  const getRewardTypeName = (rt: RewardType | undefined) => {
    if (!rt) return ''
    return rt.display_name || rt.type_key
  }

  const handleSave = async (rule: ExchangeRule) => {
    const isEdit = !!editingRule?.id
    const ruleId = editingRule?.id

    const payload: any = {
      name: rule.name,
      description: rule.description || null,
      required_reward_type_id: rule.required_reward_type_id,
      required_amount: rule.required_amount,
      reward_type_id: rule.reward_type_id || null,
      reward_amount: rule.reward_amount ?? null,
      reward_item: rule.reward_item || null,
      is_active: rule.is_active,
    }

    const url = isEdit ? '/api/exchange-rules/update' : '/api/exchange-rules/create'
    if (isEdit) payload.id = ruleId

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || t('saveFailed'))
    }

    await loadData()
  }

  const handleDelete = async (ruleId: string) => {
    const res = await fetch('/api/exchange-rules/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ruleId }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || t('deleteFailed'))
    }

    await loadData()
  }

  const handleToggleActive = async (rule: ExchangeRule) => {
    try {
      const res = await fetch('/api/exchange-rules/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      })
      if (res.ok) {
        await loadData()
      } else {
        const data = await res.json()
        setError(data.error || t('saveFailed'))
      }
    } catch (err) {
      setError(t('saveFailed'))
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <span className="material-icons-outlined text-4xl animate-spin mb-2">autorenew</span>
        <p>{t('loading')}</p>
      </div>
    )
  }

  const activeRules = rules.filter((r) => r.is_active)
  const inactiveRules = rules.filter((r) => !r.is_active)

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-500 text-xs mt-1 underline">{t('dismiss')}</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-700">{t('existingRules')}</h2>
        <button
          onClick={() => { setEditingRule(null); setShowPopup(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold shadow-md"
        >
          <span className="material-icons-outlined text-lg">add</span>
          {t('addRule')}
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <span className="material-icons-outlined text-5xl text-slate-300 mb-3">swap_horiz</span>
          <p className="text-slate-500 text-lg font-medium">{t('noRules')}</p>
          <p className="text-slate-400 text-sm mt-1">{t('noRulesHint')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRules.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('active')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    rewardTypes={rewardTypes}
                    getRewardType={getRewardType}
                    getRewardTypeName={getRewardTypeName}
                    onEdit={() => { setEditingRule(rule); setShowPopup(true) }}
                    onToggle={() => handleToggleActive(rule)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
          {inactiveRules.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">{t('inactive')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inactiveRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    rewardTypes={rewardTypes}
                    getRewardType={getRewardType}
                    getRewardTypeName={getRewardTypeName}
                    onEdit={() => { setEditingRule(rule); setShowPopup(true) }}
                    onToggle={() => handleToggleActive(rule)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mounted && showPopup && (
        <ExchangeRulePopup
          isOpen={showPopup}
          onClose={() => { setShowPopup(false); setEditingRule(null) }}
          onSave={handleSave}
          onDelete={editingRule?.id ? handleDelete : undefined}
          editingRule={editingRule}
          rewardTypes={rewardTypes.map((rt) => ({
            id: rt.id,
            type_key: rt.type_key,
            display_name: rt.display_name || rt.type_key,
          }))}
        />
      )}
    </div>
  )
}

function RuleCard({
  rule,
  rewardTypes,
  getRewardType,
  getRewardTypeName,
  onEdit,
  onToggle,
  t,
}: {
  rule: ExchangeRule
  rewardTypes: RewardType[]
  getRewardType: (id: string) => RewardType | undefined
  getRewardTypeName: (rt: RewardType | undefined) => string
  onEdit: () => void
  onToggle: () => void
  t: any
}) {
  const requiredRT = getRewardType(rule.required_reward_type_id)
  const rewardRT = rule.reward_type_id ? getRewardType(rule.reward_type_id) : undefined

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* Top color bar */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: requiredRT?.color || '#8b5cf6' }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 truncate text-sm">
              {rule.name || t('unnamedRule')}
            </h3>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggle}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title={rule.is_active ? t('deactivate') : t('activate')}
            >
              <span className="material-icons-outlined text-lg">
                {rule.is_active ? 'toggle_on' : 'toggle_off'}
              </span>
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={t('edit')}
            >
              <span className="material-icons-outlined text-lg">edit</span>
            </button>
          </div>
        </div>

        {/* Exchange visualization */}
        <div className="flex items-center justify-center gap-3 py-3 bg-slate-50 rounded-xl mb-3">
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold" style={{ color: requiredRT?.color || '#8b5cf6' }}>
              {rule.required_amount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              {requiredRT?.icon && <span className="text-sm">{requiredRT.icon}</span>}
              <span className="truncate max-w-[60px]">{getRewardTypeName(requiredRT)}</span>
            </div>
          </div>

          <span className="material-icons-outlined text-slate-400 text-xl">arrow_forward</span>

          <div className="flex flex-col items-center">
            <div className="text-lg font-bold" style={{ color: rewardRT?.color || '#6366f1' }}>
              {rule.reward_amount ?? '?'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              {rewardRT?.icon && <span className="text-sm">{rewardRT.icon}</span>}
              <span className="truncate max-w-[60px]">
                {rewardRT ? getRewardTypeName(rewardRT) : (rule.reward_item || '—')}
              </span>
            </div>
          </div>
        </div>

        {rule.description && (
          <p className="text-xs text-slate-400 line-clamp-2">
            {rule.description}
          </p>
        )}
      </div>
    </div>
  )
}
