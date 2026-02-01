/**
 * 方案 B - 简化版（约 50-60 行）
 * 特点：固定 3 个配置项，无需动态添加/删除，UI 简洁
 */

'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface CustomRewardType {
  id: string
  type_key: string
  display_name: string
  icon: string
  color: string
  default_unit: string | null
}

interface RewardConfigItem {
  type_id: string
  type_key: string
  amount: number | null
  formula: string | null
  unit: string | null
}

interface RewardConfigFormSimpleProps {
  rewardConfig: RewardConfigItem[]
  onChange: (config: RewardConfigItem[]) => void
}

export default function RewardConfigFormSimple({ 
  rewardConfig, 
  onChange 
}: RewardConfigFormSimpleProps) {
  const t = useTranslations('rewardRules')
  const [rewardTypes, setRewardTypes] = useState<CustomRewardType[]>([])
  
  // 确保始终有 3 个配置项（空或已填充）
  const [configs, setConfigs] = useState<RewardConfigItem[]>(() => {
    const initial = rewardConfig || []
    // 补齐到 3 个
    while (initial.length < 3) {
      initial.push({
        type_id: '',
        type_key: '',
        amount: 0,
        formula: null,
        unit: null
      })
    }
    return initial.slice(0, 3) // 最多 3 个
  })

  useEffect(() => {
    loadRewardTypes()
  }, [])

  const loadRewardTypes = async () => {
    try {
      const response = await fetch('/api/custom-reward-types/list')
      const data = await response.json()
      if (data.success) {
        setRewardTypes(data.types || [])
      }
    } catch (err) {
      console.error('Failed to load reward types:', err)
    }
  }

  const updateConfig = (index: number, updates: Partial<RewardConfigItem>) => {
    const newConfigs = [...configs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    
    // 如果选择了类型，自动填充
    if (updates.type_id) {
      const selectedType = rewardTypes.find(rt => rt.id === updates.type_id)
      if (selectedType) {
        newConfigs[index].type_key = selectedType.type_key
        newConfigs[index].unit = selectedType.default_unit || null
      }
    }
    
    setConfigs(newConfigs)
    // 只返回非空的配置
    onChange(newConfigs.filter(c => c.type_id))
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {t('rewardConfig') || '奖励配置'}
      </label>

      {/* 固定 3 个配置项 */}
      {[0, 1, 2].map((index) => {
        const config = configs[index]
        const selectedType = config.type_id ? rewardTypes.find(rt => rt.id === config.type_id) : null

        return (
          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {/* 类型选择 */}
            <select
              value={config.type_id || ''}
              onChange={(e) => {
                if (e.target.value) {
                  updateConfig(index, { type_id: e.target.value })
                } else {
                  // 清空配置
                  updateConfig(index, {
                    type_id: '',
                    type_key: '',
                    amount: 0,
                    formula: null,
                    unit: null
                  })
                }
              }}
              className="w-32 px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{t('none') || '无'}</option>
              {rewardTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.display_name}
                </option>
              ))}
            </select>

            {/* 金额输入 */}
            {selectedType && (
              <>
                <input
                  type="number"
                  value={config.amount || ''}
                  onChange={(e) => {
                    updateConfig(index, { 
                      amount: Number(e.target.value) || 0,
                      formula: null
                    })
                  }}
                  placeholder="0"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-gray-600 w-16">
                  {selectedType.default_unit || ''}
                </span>
              </>
            )}
          </div>
        )
      })}

      <p className="text-xs text-gray-500 mt-2">
        💡 {t('simpleModeHint') || '最多可配置 3 种奖励类型，选择"无"可清空该配置项'}
      </p>
    </div>
  )
}
