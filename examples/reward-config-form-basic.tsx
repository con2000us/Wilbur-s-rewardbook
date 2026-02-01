/**
 * 方案 B - 基础版（约 80-100 行）
 * 特点：支持动态添加/删除，UI 简单实用，功能完整
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

interface RewardConfigFormBasicProps {
  rewardConfig: RewardConfigItem[]
  onChange: (config: RewardConfigItem[]) => void
}

export default function RewardConfigFormBasic({ 
  rewardConfig, 
  onChange 
}: RewardConfigFormBasicProps) {
  const t = useTranslations('rewardRules')
  const [rewardTypes, setRewardTypes] = useState<CustomRewardType[]>([])
  const [configs, setConfigs] = useState<RewardConfigItem[]>(rewardConfig || [])

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

  const addRewardConfig = () => {
    const newConfig: RewardConfigItem = {
      type_id: '',
      type_key: '',
      amount: 0,
      formula: null,
      unit: null
    }
    const updated = [...configs, newConfig]
    setConfigs(updated)
    onChange(updated)
  }

  const updateRewardConfig = (index: number, updates: Partial<RewardConfigItem>) => {
    const newConfigs = [...configs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    
    if (updates.type_id) {
      const selectedType = rewardTypes.find(rt => rt.id === updates.type_id)
      if (selectedType) {
        newConfigs[index].type_key = selectedType.type_key
        newConfigs[index].unit = selectedType.default_unit || null
      }
    }
    
    // 如果输入了固定金额（且不为0），清除公式
    if (updates.amount !== undefined && updates.amount !== null && updates.amount !== 0) {
      newConfigs[index].formula = null
    }
    
    // 如果输入了公式，清除固定金额
    if (updates.formula !== undefined) {
      if (updates.formula) {
        // 有公式时，将 amount 设为 0
        newConfigs[index].amount = 0
      }
      // 如果清空公式（null 或空字符串），不清除 amount，允许用户切换回固定金额
    }
    
    setConfigs(newConfigs)
    onChange(newConfigs)
  }

  const removeRewardConfig = (index: number) => {
    const updated = configs.filter((_, i) => i !== index)
    setConfigs(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('rewardConfig') || '奖励配置'}
        </label>
        <button
          type="button"
          onClick={addRewardConfig}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          + {t('addReward') || '添加奖励'}
        </button>
      </div>

      {/* 奖励配置列表 */}
      {configs.map((config, index) => {
        const selectedType = rewardTypes.find(rt => rt.id === config.type_id)
        
        return (
          <div key={index} className="p-4 bg-white rounded-lg border-2 border-gray-200 space-y-3">
            {/* 配置项头部 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedType?.icon || '🎁'}</span>
                <span className="text-sm font-semibold text-gray-700">
                  {t('reward') || '奖励'} {index + 1}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeRewardConfig(index)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <span className="material-icons-outlined text-sm">delete</span>
              </button>
            </div>

            {/* 奖励配置 - 桌面宽度下三个字段同一行，移动端垂直排列 */}
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              {/* 奖励类型选择 - 30% */}
              <div className="flex-1 md:flex-[0_0_calc(30%-0.5rem)] md:min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('rewardType') || '奖励类型'} *
                </label>
                <select
                  value={config.type_id}
                  onChange={(e) => updateRewardConfig(index, { type_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">{t('selectRewardType') || '选择奖励类型'}</option>
                  {rewardTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 奖励金额或公式（二选一） */}
              {selectedType && (
                <>
                  {/* 固定金额 - 30% */}
                  <div className="flex-1 md:flex-[0_0_calc(30%-0.5rem)] md:min-w-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('fixedAmount') || '固定金额'} ({t('optional') || '可选'})
                    </label>
                    <input
                      type="number"
                      value={config.amount || ''}
                      onChange={(e) => updateRewardConfig(index, { 
                        amount: e.target.value ? Number(e.target.value) : 0,
                        formula: null
                      })}
                      placeholder="10"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {/* 公式 - 40% */}
                  <div className="flex-1 md:flex-[0_0_calc(40%-0.5rem)] md:min-w-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('formula') || '公式'} ({t('optional') || '可选'})
                    </label>
                    <input
                      type="text"
                      value={config.formula ?? ''}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        updateRewardConfig(index, { 
                          formula: value || null,
                          amount: value ? 0 : (config.amount || 0)
                        })
                      }}
                      placeholder="G*0.1"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* 提示文字 */}
            {config.formula && (
              <p className="text-xs text-gray-500">
                💡 {t('formulaHint') || 'G=分数, P=百分比, M=满分'}
              </p>
            )}

            {/* 显示单位 */}
            {config.unit && (
              <div className="text-xs text-gray-500">
                {t('unit') || '单位'}: <span className="font-semibold">{config.unit}</span>
              </div>
            )}
          </div>
        )
      })}

      {/* 空状态提示 */}
      {configs.length === 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
          <p className="text-sm text-gray-500">
            {t('noRewardsConfigured') || '尚未配置奖励，请点击上方按钮添加'}
          </p>
        </div>
      )}
    </div>
  )
}
