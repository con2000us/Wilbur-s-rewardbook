/**
 * 方案 B - 完整版（约 150-200 行）
 * 特点：最灵活，支持动态添加/删除，UI 精美，功能完整
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

interface RewardConfigFormFullProps {
  rewardConfig: RewardConfigItem[]
  onChange: (config: RewardConfigItem[]) => void
}

export default function RewardConfigFormFull({ 
  rewardConfig, 
  onChange 
}: RewardConfigFormFullProps) {
  const t = useTranslations('rewardRules')
  const [rewardTypes, setRewardTypes] = useState<CustomRewardType[]>([])
  const [configs, setConfigs] = useState<RewardConfigItem[]>(rewardConfig || [])

  // 加载奖励类型
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

  // 添加奖励配置
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

  // 更新奖励配置
  const updateRewardConfig = (index: number, updates: Partial<RewardConfigItem>) => {
    const newConfigs = [...configs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    
    // 如果选择了类型，自动填充相关信息
    if (updates.type_id) {
      const selectedType = rewardTypes.find(rt => rt.id === updates.type_id)
      if (selectedType) {
        newConfigs[index].type_key = selectedType.type_key
        newConfigs[index].unit = selectedType.default_unit || null
      }
    }
    
    // 如果输入了固定金额，清除公式
    if (updates.amount !== undefined && updates.amount !== null) {
      newConfigs[index].formula = null
    }
    
    // 如果输入了公式，清除固定金额
    if (updates.formula !== undefined && updates.formula !== null) {
      newConfigs[index].amount = 0
    }
    
    setConfigs(newConfigs)
    onChange(newConfigs)
  }

  // 删除奖励配置
  const removeRewardConfig = (index: number) => {
    const updated = configs.filter((_, i) => i !== index)
    setConfigs(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* 标题和添加按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('rewardConfig') || '奖励配置'}
          </label>
          <p className="text-xs text-gray-500">
            {t('rewardConfigHint') || '可以为同一规则配置多种奖励类型'}
          </p>
        </div>
        <button
          type="button"
          onClick={addRewardConfig}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all hover:scale-105 shadow-sm"
        >
          <span className="material-icons-outlined text-sm">add</span>
          {t('addReward') || '添加奖励'}
        </button>
      </div>

      {/* 奖励配置列表 - 卡片式设计 */}
      <div className="space-y-3">
        {configs.map((config, index) => {
          const selectedType = rewardTypes.find(rt => rt.id === config.type_id)
          
          return (
            <div 
              key={index}
              className="relative p-4 rounded-xl border-2 transition-all shadow-sm"
              style={{
                borderColor: selectedType?.color || '#e5e7eb',
                backgroundColor: selectedType ? `${selectedType.color}08` : '#ffffff'
              }}
            >
              {/* 删除按钮 - 右上角 */}
              <button
                type="button"
                onClick={() => removeRewardConfig(index)}
                className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title={t('removeReward') || '移除奖励'}
              >
                <span className="material-icons-outlined text-lg">close</span>
              </button>

              {/* 配置项内容 */}
              <div className="space-y-3 pr-8">
                {/* 奖励类型选择 - 大图标显示 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {t('rewardType') || '奖励类型'} *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {rewardTypes.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => updateRewardConfig(index, { 
                          type_id: type.id,
                          type_key: type.type_key,
                          unit: type.default_unit || null
                        })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          config.type_id === type.id
                            ? 'border-purple-500 bg-purple-50 scale-105 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-xs font-medium text-gray-700 truncate">
                          {type.display_name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 如果已选择类型，显示金额/公式输入 */}
                {selectedType && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{selectedType.icon}</span>
                      <span className="font-medium">{selectedType.display_name}</span>
                      {selectedType.default_unit && (
                        <span className="text-xs text-gray-500">({selectedType.default_unit})</span>
                      )}
                    </div>

                    {/* 切换：固定金额 vs 公式 */}
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => updateRewardConfig(index, { formula: null })}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          !config.formula
                            ? 'bg-purple-100 text-purple-700 font-semibold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t('fixedAmount') || '固定金额'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRewardConfig(index, { amount: 0 })}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          config.formula
                            ? 'bg-purple-100 text-purple-700 font-semibold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t('formula') || '公式'}
                      </button>
                    </div>

                    {/* 输入框 */}
                    {config.formula ? (
                      <div>
                        <input
                          type="text"
                          value={config.formula || ''}
                          onChange={(e) => updateRewardConfig(index, { 
                            formula: e.target.value || null,
                            amount: 0
                          })}
                          placeholder="G*0.1 或 P*0.2"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          💡 G={t('score') || '分数'}, P={t('percentage') || '百分比'}, M={t('maxScore') || '满分'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="number"
                          value={config.amount || ''}
                          onChange={(e) => updateRewardConfig(index, { 
                            amount: e.target.value ? Number(e.target.value) : 0,
                            formula: null
                          })}
                          placeholder="10"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 空状态提示 */}
      {configs.length === 0 && (
        <div className="p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
          <div className="text-4xl mb-2">🎁</div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {t('noRewardsConfigured') || '尚未配置奖励'}
          </p>
          <p className="text-xs text-gray-500">
            {t('clickAddButtonToConfigure') || '点击上方按钮开始配置奖励'}
          </p>
        </div>
      )}

      {/* 向后兼容：快速添加传统单一奖励 */}
      {configs.length === 0 && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              const moneyType = rewardTypes.find(rt => rt.type_key === 'money')
              if (moneyType) {
                const newConfig: RewardConfigItem = {
                  type_id: moneyType.id,
                  type_key: 'money',
                  amount: 0,
                  formula: null,
                  unit: moneyType.default_unit || '元'
                }
                setConfigs([newConfig])
                onChange([newConfig])
              }
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {t('useLegacyMode') || '使用传统单一奖励模式'}
          </button>
        </div>
      )}
    </div>
  )
}
