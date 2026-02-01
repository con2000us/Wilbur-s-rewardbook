'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

interface CustomRewardType {
  id: string
  type_key: string
  display_name: string
  icon: string
  color: string
  default_unit: string | null
}

// Debug logging
const LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1'

function debugLog(location: string, message: string, data: any = {}) {
  if (typeof window !== 'undefined') {
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'rule-card-layout',
        hypothesisId: 'A'
      })
    }).catch(() => {})
  }
}

interface RewardConfigItem {
  type_id: string
  type_key: string
  amount: number | null
  formula: string | null
  unit: string | null
}

interface RewardRule {
  id: string
  student_id: string | null
  subject_id: string | null
  rule_name: string
  condition: string
  min_score: number | null
  max_score: number | null
  reward_amount: number
  reward_formula?: string | null
  reward_config?: RewardConfigItem[] | null
  priority: number
  is_active: boolean
  assessment_type: string | null
  display_order?: number | null
}

interface RuleCardProps {
  rule: RewardRule
  canEdit?: boolean
  onToggleActive?: (rule: RewardRule) => void
  onEdit?: (rule: RewardRule) => void
  onDelete?: (ruleId: string, ruleName: string) => void
  loading?: boolean
  showDragHandle?: boolean // 是否顯示拖拽手柄
  isEditing?: boolean // 是否正在編輯此規則
  isReadOnly?: boolean // 是否為只讀模式（用於對照顯示）
  isJustSaved?: boolean // 是否剛剛保存（用於顯示閃爍動畫）
  isDraggable?: boolean // 是否可拖曳
  onDragStart?: () => void // 拖曳開始事件
  onDragOver?: (e: React.DragEvent) => void // 拖曳經過事件
  onDrop?: (e: React.DragEvent) => void // 拖曳放下事件
  onDragEnd?: () => void // 拖曳結束事件
}

export default function RuleCard({ 
  rule, 
  canEdit = false, 
  onToggleActive, 
  onEdit, 
  onDelete,
  loading = false,
  showDragHandle = false,
  isEditing = false,
  isReadOnly = false,
  isJustSaved = false,
  isDraggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: RuleCardProps) {
  const t = useTranslations('rewardRules')
  const tAssessment = useTranslations('assessment')
  const tCommon = useTranslations('common')
  
  // 加载奖励类型数据
  const [rewardTypes, setRewardTypes] = useState<CustomRewardType[]>([])
  
  useEffect(() => {
    const loadRewardTypes = async () => {
      try {
        const response = await fetch('/api/custom-reward-types/list')
        const data = await response.json()
        if (data.success && data.types) {
          setRewardTypes(data.types || [])
        }
      } catch (err) {
        console.error('Failed to load reward types:', err)
      }
    }
    loadRewardTypes()
  }, [])
  
  // 根据 type_id 或 type_key 获取奖励类型信息
  const getRewardTypeInfo = (config: RewardConfigItem): { icon: string; name: string; unit: string } => {
    const type = rewardTypes.find(rt => rt.id === config.type_id || rt.type_key === config.type_key)
    if (type) {
      return {
        icon: type.icon,
        name: type.display_name,
        unit: config.unit || type.default_unit || ''
      }
    }
    // 向后兼容：如果没有找到，使用默认映射
    const defaultMap: Record<string, { icon: string; name: string }> = {
      points: { icon: '⭐', name: '積分' },
      money: { icon: '💰', name: '獎金' },
      hearts: { icon: '❤️', name: '愛心' },
      diamonds: { icon: '💎', name: '鑽石' },
      gametime: { icon: '🎮', name: '遊戲時間' }
    }
    const defaultInfo = defaultMap[config.type_key] || { icon: '🎁', name: '獎勵' }
    return {
      icon: defaultInfo.icon,
      name: defaultInfo.name,
      unit: config.unit || ''
    }
  }
  
  // Debug: Track window width and responsive classes
  const logRef = useRef(false)
  const rewardContainerRef = useRef<HTMLDivElement>(null)
  const [isNarrowScreen, setIsNarrowScreen] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkWidth = () => {
        // window.innerWidth 返回的是 CSS 像素宽度（已考虑 viewport 缩放）
        const width = window.innerWidth
        const isNarrow = width < 850
        setIsNarrowScreen(isNarrow)
        
        if (rewardContainerRef.current) {
          if (isNarrow) {
            rewardContainerRef.current.style.display = 'block'
            rewardContainerRef.current.style.width = '100%'
            rewardContainerRef.current.style.marginTop = '0.5rem'
            rewardContainerRef.current.style.textAlign = 'right'
          } else {
            rewardContainerRef.current.style.display = 'flex'
            rewardContainerRef.current.style.flexDirection = 'row'
            rewardContainerRef.current.style.justifyContent = 'flex-end'
            rewardContainerRef.current.style.width = 'auto'
            rewardContainerRef.current.style.marginTop = '0'
          }
        }
        
        if (!logRef.current) {
          debugLog('RuleCard:effect', 'Component mounted, window width', { width, isLessThan850: isNarrow })
          logRef.current = true
        } else {
          debugLog('RuleCard:resize', 'Window resized', { newWidth: width, isLessThan850: isNarrow })
        }
      }
      
      checkWidth()
      window.addEventListener('resize', checkWidth)
      return () => window.removeEventListener('resize', checkWidth)
    }
  }, [])

  // Debug: Log rule card render
  useEffect(() => {
    debugLog('RuleCard:render', 'Rule card rendered', {
      ruleId: rule.id,
      ruleName: rule.rule_name,
      rewardAmount: rule.reward_amount,
      rewardFormula: rule.reward_formula,
      hasFormula: !!rule.reward_formula
    })
  }, [rule.id])

  // 判斷規則類型
  let ruleTypeLabel = ''
  let ruleTypeBadge = ''
  if (rule.student_id && rule.subject_id) {
    ruleTypeLabel = t('ruleTypes.exclusive')
    ruleTypeBadge = 'bg-purple-100 text-purple-700 border-purple-300'
  } else if (rule.subject_id) {
    ruleTypeLabel = t('ruleTypes.subject')
    ruleTypeBadge = 'bg-blue-100 text-blue-700 border-blue-300'
  } else if (rule.student_id) {
    ruleTypeLabel = t('ruleTypes.student')
    ruleTypeBadge = 'bg-green-100 text-green-700 border-green-300'
  } else {
    ruleTypeLabel = t('ruleTypes.global')
    ruleTypeBadge = 'bg-gray-100 text-gray-700 border-gray-300'
  }

  // 計算分數範圍
  let scoreRange = ''
  if (rule.condition === 'score_equals') {
    scoreRange = `= ${rule.min_score}${t('points')}`
  } else if (rule.condition === 'score_range') {
    if (rule.min_score !== null && rule.max_score !== null) {
      scoreRange = `${rule.min_score}-${rule.max_score}${t('points')}`
    } else if (rule.min_score !== null) {
      scoreRange = `≥ ${rule.min_score}${t('points')}`
    } else if (rule.max_score !== null) {
      scoreRange = `≤ ${rule.max_score}${t('points')}`
    }
  } else if (rule.condition === 'perfect_score') {
    scoreRange = t('conditionTypes.perfect_score')
  }

  // 評量類型標籤（所有類型都顯示為標籤，包括"不限"）
  const getAssessmentTypeBadge = () => {
    const typeLabels: Record<string, string> = {
      'exam': tAssessment('types.exam'),
      'quiz': tAssessment('types.quiz'),
      'homework': tAssessment('types.homework'),
      'project': tAssessment('types.project'),
      'all': t('allTypes') || '不限',
    }
    
    const typeIcons: Record<string, string> = {
      'exam': '📝',
      'quiz': '📋',
      'homework': '📓',
      'project': '🎨',
      'all': '🌐',
    }

    // 不同評量類型的顏色配置
    const typeColors: Record<string, { bg: string; text: string; border: string }> = {
      'exam': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
      'quiz': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
      'homework': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      'project': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      'all': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    }

    // 如果沒有評量類型，顯示"不限"
    const assessmentType = rule.assessment_type || 'all'
    const colors = typeColors[assessmentType] || typeColors['all']

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border-2 ${colors.border}`}>
        {typeIcons[assessmentType] || ''} {typeLabels[assessmentType] || assessmentType}
      </span>
    )
  }

  return (
    <div 
      onDragOver={(e) => {
        // 總是調用 preventDefault 以允許拖動（用於接收其他卡片的拖曳）
        e.preventDefault()
        e.stopPropagation()
        if (onDragOver) {
          onDragOver(e)
        }
      }}
      onDrop={(e) => {
        if (isDraggable && onDrop) {
          onDrop(e)
        }
      }}
      className={`group p-3 rounded-lg border-2 transition-all duration-200 ${
        isJustSaved
          ? 'rule-saved-flash border-solid'
          : isEditing
          ? 'bg-yellow-50 border-solid border-yellow-400 shadow-lg ring-2 ring-yellow-300'
          : isReadOnly
          ? 'bg-blue-50 border-solid border-blue-300 shadow-md'
          : rule.is_active 
          ? 'bg-white border-solid border-green-200 shadow-sm' 
          : 'bg-gray-50 border-dashed border-gray-400 opacity-70'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* 拖拽手柄視覺指示 */}
        {showDragHandle && (
          <div 
            draggable={isDraggable}
            onDragStart={(e) => {
              if (isDraggable && onDragStart) {
                try {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', rule.id || '')
                  onDragStart()
                } catch (err) {
                  // 處理可能的瀏覽器擴展錯誤
                  console.warn('Drag start error (possibly from browser extension):', err)
                }
              }
            }}
            onDragEnd={(e) => {
              if (isDraggable && onDragEnd) {
                onDragEnd()
              }
            }}
            className={`flex flex-col justify-center items-center flex-shrink-0 px-2 py-3 -ml-1 rounded ${isDraggable ? 'hover:bg-gray-200 cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isDraggable ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full ${isDraggable ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
              </div>
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isDraggable ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full ${isDraggable ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
              </div>
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isDraggable ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full ${isDraggable ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
              </div>
            </div>
          </div>
        )}
        
        <div className={`flex-1 ${isDraggable ? 'select-none' : ''}`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`flex items-center gap-2 flex-wrap ${isDraggable ? 'select-none' : ''}`}>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${ruleTypeBadge} ${isDraggable ? 'select-none' : ''}`}>
                {ruleTypeLabel}
              </span>
              {getAssessmentTypeBadge()}
              {canEdit && !isReadOnly ? (
                <button
                  onClick={() => onToggleActive?.(rule)}
                  disabled={loading}
                  className={`px-2 py-1 rounded text-xs font-semibold border transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer ${
                    rule.is_active
                      ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 hover:-translate-y-0.5 hover:shadow-md'
                      : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  {rule.is_active ? `✓ ${t('active')}` : `✕ ${t('inactive')}`}
                </button>
              ) : (
                rule.is_active ? (
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-semibold border border-green-300">
                    ✓ {t('active')}
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 font-semibold border border-red-300">
                    ✕ {t('inactive')}
                  </span>
                )
              )}
            </div>
            {canEdit && !isReadOnly && (
              <div 
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-2 flex-shrink-0 transition-opacity duration-200"
              >
                <button
                  onClick={(e) => {
                    onEdit?.(rule)
                  }}
                  disabled={loading}
                  className="text-sm px-3 py-1 rounded bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 font-semibold cursor-pointer"
                >
                  ✏️ {tCommon('edit')}
                </button>
                <button
                  onClick={(e) => {
                    onDelete?.(rule.id, rule.rule_name)
                  }}
                  disabled={loading}
                  className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 font-semibold cursor-pointer"
                >
                  🗑️ {tCommon('delete')}
                </button>
              </div>
            )}
          </div>
          
          {/* 規則信息 - 使用固定最小寬度確保對齊 */}
          <div
            className={`flex items-center justify-between gap-4 flex-wrap w-full ${isDraggable ? 'select-none' : ''}`}
            ref={(ref) => {
              if (typeof window !== 'undefined') {
                const width = window.innerWidth
                debugLog('RuleCard:info-container', 'Rule info container', {
                  width,
                  isLessThan850: width < 850,
                  className: `flex items-center justify-between gap-4 flex-wrap w-full ${isDraggable ? 'select-none' : ''}`
                })
              }
            }}
          >
            <div 
              className="flex-1 min-w-0"
            >
              <div 
                className="flex items-center gap-6"
              >
                {/* 規則名稱 - 使用固定最小寬度確保對齊 */}
                <span 
                  className={`font-bold text-base text-gray-800 min-w-[140px] ${isDraggable ? 'select-none' : ''}`}
                >
                  {rule.rule_name || t('unnamedRule')}
                </span>
                {/* 條件 - 使用固定最小寬度確保對齊 */}
                <span 
                  className={`text-gray-600 text-sm min-w-[100px] ${isDraggable ? 'select-none' : ''}`}
                >
                  {t('condition')}：{scoreRange || t('notSet')}
                </span>
              </div>
            </div>
            {/* 獎勵內容 - 優先顯示 reward_config，否則顯示舊的 reward_formula/reward_amount */}
            <div 
              ref={rewardContainerRef}
              className={`text-right ${isDraggable ? 'select-none' : ''}`}
            >
              {rule.reward_config && Array.isArray(rule.reward_config) && rule.reward_config.length > 0 ? (
                // 顯示多種獎勵配置 - 使用表格格式，窄屏時靠右顯示
                <div className={`min-w-[200px] ${isNarrowScreen ? 'ml-auto' : ''}`}>
                  <table className={`text-sm ${isNarrowScreen ? 'text-right ml-auto' : 'text-left'}`}>
                    <tbody>
                      {rule.reward_config.map((config, idx) => {
                        const typeInfo = getRewardTypeInfo(config)
                        const displayValue = config.formula 
                          ? config.formula 
                          : (config.amount !== null && config.amount !== undefined ? config.amount : 0)
                        
                        return (
                          <tr key={idx} className={idx > 0 ? 'border-t border-gray-200' : ''}>
                            <td className={`py-1 ${isNarrowScreen ? 'text-right' : 'pr-3'}`}>
                              <div className={`flex items-center gap-1.5 ${isNarrowScreen ? 'justify-end' : ''}`}>
                                <span className="text-base">{typeInfo.icon}</span>
                                <span className={`font-medium text-gray-700 ${isDraggable ? 'select-none' : ''}`}>
                                  {typeInfo.name}
                                </span>
                              </div>
                            </td>
                            <td className={`py-1 ${isNarrowScreen ? 'text-right pl-3' : ''}`}>
                              {config.formula ? (
                                <span className={`font-semibold text-green-600 ${isDraggable ? 'select-none' : ''}`}>
                                  {displayValue}
                                </span>
                              ) : (
                                <span className={`font-semibold text-green-600 ${isDraggable ? 'select-none' : ''}`}>
                                  {displayValue}{typeInfo.unit && ` ${typeInfo.unit}`}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : rule.reward_formula ? (
                // 向後兼容：顯示公式
                <div className="flex flex-col items-end">
                  <p className={`text-xs font-semibold text-gray-500 ${isDraggable ? 'select-none' : ''}`}>
                    {t('formula') || '公式'}
                  </p>
                  <p className={`text-xl font-bold text-green-600 ${isDraggable ? 'select-none' : ''}`}>
                    {rule.reward_formula}
                  </p>
                </div>
              ) : (
                // 向後兼容：顯示固定金額
                <p className="text-2xl font-bold text-green-600">
                  ${rule.reward_amount ?? 0}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

