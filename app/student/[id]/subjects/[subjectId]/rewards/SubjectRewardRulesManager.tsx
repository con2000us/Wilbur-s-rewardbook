'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import RuleCard from '../../components/RuleCard'
import RewardConfigFormBasic from '@/examples/reward-config-form-basic'

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

interface Props {
  studentId: string
  studentName: string
  subjectId: string
  subjectName: string
  subjectIcon: string
  subjectRules: RewardRule[]
  studentRules: RewardRule[]
  globalRules: RewardRule[]
  onSuccess?: () => void  // 成功後的回調
  onCancel?: () => void  // 取消的回調
}

export default function SubjectRewardRulesManager({
  studentId,
  studentName,
  subjectId,
  subjectName,
  subjectIcon,
  subjectRules,
  studentRules,
  globalRules,
  onSuccess,
  onCancel
}: Props) {
  const router = useRouter()
  const t = useTranslations('rewardRules')
  const tAssessment = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const formRef = useRef<HTMLFormElement>(null)
  const referenceCardRef = useRef<HTMLDivElement>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null)
  const [loading, setLoading] = useState(false)
  const [justSavedRuleId, setJustSavedRuleId] = useState<string | null>(null)
  const [error, setError] = useState('')
  // 排序相關狀態 - 使用與科目列表相同的邏輯
  const [isReorderingExclusive, setIsReorderingExclusive] = useState(false)
  const [isReorderingSubject, setIsReorderingSubject] = useState(false)
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const justSavedRef = useRef(false) // 使用 ref 標記是否剛剛保存完成，避免重複渲染

  // 表單狀態
  const [formData, setFormData] = useState({
    rule_name: '',
    condition: 'score_range' as 'score_equals' | 'score_range' | 'perfect_score',
    min_score: '',
    max_score: '',
    reward_amount: '', // 保留用于向后兼容
    reward_config: [] as RewardConfigItem[], // 新增：多种奖励配置
    is_active: true,
    is_student_specific: true, // 是否為學生專屬（科目+學生）
    assessment_type: '' as '' | 'exam' | 'quiz' | 'homework' | 'project', // 評量類型
  })

  const isNumericReward = (value: string) => {
    const v = (value ?? '').trim()
    return v !== '' && /^[0-9]+(\.[0-9]+)?$/.test(v)
  }

  const resetForm = () => {
    setFormData({
      rule_name: '',
      condition: 'score_range',
      min_score: '',
      max_score: '',
      reward_amount: '',
      reward_config: [],
      is_active: true,
      is_student_specific: true,
      assessment_type: '',
    })
    setEditingRule(null)
    setShowAddForm(false)
  }

  const handleEdit = (rule: RewardRule) => {
    setEditingRule(rule)
    
    // 优先使用 reward_config，如果没有则从 reward_amount/reward_formula 构建
    let rewardConfig: RewardConfigItem[] = []
    if (rule.reward_config && Array.isArray(rule.reward_config) && rule.reward_config.length > 0) {
      rewardConfig = rule.reward_config
    } else if (rule.reward_amount || rule.reward_formula) {
      // 向后兼容：从旧的 reward_amount 构建 reward_config
      // 注意：这里需要加载 reward types 来获取 money 类型的 ID
      // 暂时留空，让组件自己处理
    }
    
    setFormData({
      rule_name: rule.rule_name || '',
      condition: rule.condition as any,
      min_score: rule.min_score?.toString() || '',
      max_score: rule.max_score?.toString() || '',
      // 若有公式，編輯時優先顯示公式（用于向后兼容显示）
      reward_amount: (rule.reward_formula?.toString() || rule.reward_amount?.toString() || ''),
      reward_config: rewardConfig,
      is_active: rule.is_active ?? true,
      is_student_specific: rule.student_id !== null,
      assessment_type: (rule.assessment_type as any) || '',
    })
    setShowAddForm(true)
  }

  // 當表單展開且正在編輯時，等待展開動畫結束後滾動到對照規則卡片
  useEffect(() => {
    if (showAddForm && editingRule && referenceCardRef.current) {
      // 等待展開動畫結束後（500ms）滾動到對照規則卡片
      const timer = setTimeout(() => {
        referenceCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }, 550) // 稍微延遲以確保動畫完成
      return () => clearTimeout(timer)
    }
  }, [showAddForm, editingRule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 自動生成規則名稱（如果為空）
    let ruleName = formData.rule_name.trim()
    if (!ruleName) {
      const minScore = formData.min_score ? parseFloat(formData.min_score) : null
      const pointsText = t('points')
      const rewardText = t('reward')
      
      if (formData.condition === 'perfect_score') {
        ruleName = `${subjectName} ${t('conditionTypes.perfect_score')}${rewardText}`
      } else if (minScore !== null) {
        ruleName = `${subjectName} ${minScore}${pointsText}${rewardText}`
      } else {
        ruleName = `${subjectName} ${rewardText}`
      }
    }

    try {
      // 計算新規則的 display_order（放在列表最後）
      let displayOrder = null
      if (!editingRule) {
        const targetRules = formData.is_student_specific ? sortedExclusiveRules : sortedSubjectOnlyRules
        if (targetRules.length > 0) {
          const maxOrder = Math.max(...targetRules.map(r => (r as any).display_order ?? 0))
          displayOrder = maxOrder + 1
        } else {
          displayOrder = 1
        }
      }
      
      // 优先使用 reward_config，如果没有则使用旧的 reward_amount/reward_formula（向后兼容）
      const hasRewardConfig = formData.reward_config && formData.reward_config.length > 0
      
      const payload = {
        ...(editingRule ? { rule_id: editingRule.id } : {}),
        student_id: formData.is_student_specific ? studentId : null,
        subject_id: subjectId,
        rule_name: ruleName,
        condition: formData.condition,
        min_score: formData.min_score ? parseFloat(formData.min_score) : null,
        max_score: formData.max_score ? parseFloat(formData.max_score) : null,
        // 如果配置了 reward_config，使用它；否则使用旧的 reward_amount/reward_formula
        reward_config: hasRewardConfig ? formData.reward_config : null,
        reward_amount: hasRewardConfig ? 0 : (isNumericReward(formData.reward_amount) ? parseFloat(formData.reward_amount) : 0),
        reward_formula: hasRewardConfig ? null : (isNumericReward(formData.reward_amount) ? null : (formData.reward_amount.trim() || null)),
        priority: formData.is_student_specific ? 40 : 30, // 自動設置優先級
        is_active: formData.is_active,
        assessment_type: formData.assessment_type || null,
        ...(displayOrder !== null ? { display_order: displayOrder } : {}),
      }

      const endpoint = editingRule ? '/api/reward-rules/update' : '/api/reward-rules/create'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        // 如果是更新規則，立即更新本地狀態
        if (editingRule && result.data) {
          const updatedRule = result.data
          
          // 判斷規則類型並更新對應的列表
          if (updatedRule.student_id && updatedRule.subject_id) {
            // 專屬規則（科目+學生）
            setSortedExclusiveRules(prevRules => 
              prevRules.map(r => r.id === editingRule.id ? updatedRule : r)
            )
          } else if (updatedRule.subject_id) {
            // 科目規則（僅科目）
            setSortedSubjectOnlyRules(prevRules => 
              prevRules.map(r => r.id === editingRule.id ? updatedRule : r)
            )
          }
          
          // 標記剛剛更新完成，防止 useEffect 覆蓋當前狀態
          justSavedRef.current = true
          setTimeout(() => {
            justSavedRef.current = false
          }, 2000)
        }
        
        // 記錄剛剛保存的規則 ID，用於顯示閃爍動畫
        const savedRuleId = editingRule ? editingRule.id : result.data?.id
        if (savedRuleId) {
          setJustSavedRuleId(savedRuleId)
          // 4.5秒後清除閃爍效果（2.5秒閃爍 + 2秒淡出）
          setTimeout(() => {
            setJustSavedRuleId(null)
          }, 4500)
        }
        
        resetForm()
        if (onSuccess) {
          router.refresh()
          onSuccess()
        } else {
          router.refresh()
        }
      } else {
        setError(result.error || t('operationFailed'))
      }
    } catch (err) {
      setError(t('errorOccurred') + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (ruleId: string, ruleName: string) => {
    if (!confirm(t('deleteConfirm', { ruleName }))) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reward-rules/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: ruleId }),
      })

      const result = await response.json()

      if (response.ok) {
        // 立即從本地狀態中移除被刪除的規則
        setSortedExclusiveRules(prevRules => 
          prevRules.filter(r => r.id !== ruleId)
        )
        
        setSortedSubjectOnlyRules(prevRules => 
          prevRules.filter(r => r.id !== ruleId)
        )
        
        // 如果正在編輯這個規則，清除編輯狀態
        if (editingRule && editingRule.id === ruleId) {
          setEditingRule(null)
          setShowAddForm(false)
        }
        
        // 標記剛剛刪除完成，防止 useEffect 覆蓋當前狀態
        justSavedRef.current = true
        setTimeout(() => {
          justSavedRef.current = false
        }, 2000)
        
        if (onSuccess) {
          router.refresh()
          onSuccess()
        } else {
          router.refresh()
        }
      } else {
        setError(result.error || t('deleteFailed'))
      }
    } catch (err) {
      setError(t('errorOccurred') + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (rule: RewardRule) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reward-rules/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_id: rule.id,
          is_active: !rule.is_active,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // 立即更新本地狀態，確保規則不會消失
        const updatedRule = { ...rule, is_active: !rule.is_active }
        
        // 更新專屬規則列表（科目+學生）
        setSortedExclusiveRules(prevRules => 
          prevRules.map(r => r.id === rule.id ? updatedRule : r)
        )
        
        // 更新科目規則列表（僅科目）
        setSortedSubjectOnlyRules(prevRules => 
          prevRules.map(r => r.id === rule.id ? updatedRule : r)
        )
        
        // 如果正在編輯這個規則，也要更新編輯狀態
        if (editingRule && editingRule.id === rule.id) {
          setEditingRule(updatedRule)
        }
        
        // 標記剛剛更新完成，防止 useEffect 覆蓋當前狀態
        // 使用延遲確保在 router.refresh() 完成後才清除標記
        justSavedRef.current = true
        setTimeout(() => {
          justSavedRef.current = false
        }, 1000)
        
        // 調用 onSuccess，但合併邏輯會保留本地已更新的規則狀態
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(result.error || t('updateFailed'))
      }
    } catch (err) {
      setError(t('errorOccurred') + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }


  // 分離規則類型
  const exclusiveRules = useMemo(() => 
    subjectRules.filter(r => r.student_id === studentId && r.subject_id === subjectId),
    [subjectRules, studentId, subjectId]
  )
  const subjectOnlyRules = useMemo(() => 
    subjectRules.filter(r => r.student_id === null && r.subject_id === subjectId),
    [subjectRules, subjectId]
  )

  // 排序規則（按 display_order，如果沒有則按 priority）
  const sortRules = (rules: RewardRule[]) => {
    return [...rules].sort((a, b) => {
      const orderA = a.display_order ?? a.priority ?? 0
      const orderB = b.display_order ?? b.priority ?? 0
      return orderA - orderB
    })
  }

  const [sortedExclusiveRules, setSortedExclusiveRules] = useState(() => sortRules(exclusiveRules))
  const [sortedSubjectOnlyRules, setSortedSubjectOnlyRules] = useState(() => sortRules(subjectOnlyRules))
  const sortedStudentRules = useMemo(() => sortRules(studentRules), [studentRules])
  const sortedGlobalRules = useMemo(() => sortRules(globalRules), [globalRules])

  // 當 props 變化時更新排序後的規則
  useEffect(() => {
    // 如果剛剛保存完成，不覆蓋當前狀態
    if (justSavedRef.current) {
      return
    }
    if (!isReorderingExclusive) {
      // 合併更新：保留本地已更新的規則狀態，即使新數據中沒有也要保留
      setSortedExclusiveRules(prevRules => {
        const newRules = sortRules(exclusiveRules)
        // 創建一個映射，保留本地已更新的規則狀態
        const localUpdates = new Map(prevRules.map(r => [r.id, r]))
        
        // 合併：優先使用本地更新，如果本地沒有則使用新數據
        const mergedRules = new Map()
        
        // 先添加所有本地規則（包括可能被過濾掉的）
        prevRules.forEach(rule => {
          mergedRules.set(rule.id, rule)
        })
        
        // 然後用新數據更新（如果新數據中有更新的版本）
        newRules.forEach(rule => {
          mergedRules.set(rule.id, localUpdates.get(rule.id) || rule)
        })
        
        // 轉換回數組並排序
        return sortRules(Array.from(mergedRules.values()))
      })
    }
    if (!isReorderingSubject) {
      // 合併更新：保留本地已更新的規則狀態，即使新數據中沒有也要保留
      setSortedSubjectOnlyRules(prevRules => {
        const newRules = sortRules(subjectOnlyRules)
        // 創建一個映射，保留本地已更新的規則狀態
        const localUpdates = new Map(prevRules.map(r => [r.id, r]))
        
        // 合併：優先使用本地更新，如果本地沒有則使用新數據
        const mergedRules = new Map()
        
        // 先添加所有本地規則（包括可能被過濾掉的）
        prevRules.forEach(rule => {
          mergedRules.set(rule.id, rule)
        })
        
        // 然後用新數據更新（如果新數據中有更新的版本）
        newRules.forEach(rule => {
          mergedRules.set(rule.id, localUpdates.get(rule.id) || rule)
        })
        
        // 轉換回數組並排序
        return sortRules(Array.from(mergedRules.values()))
      })
    }
  }, [exclusiveRules, subjectOnlyRules, isReorderingExclusive, isReorderingSubject])

  // 拖拽排序處理 - 使用與科目列表相同的邏輯
  const handleDragStart = (ruleId: string, index: number, type: 'exclusive' | 'subject') => {
    if (type === 'exclusive') {
      setIsReorderingExclusive(true)
    } else {
      setIsReorderingSubject(true)
    }
    setDraggedRuleId(ruleId)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, targetIndex: number, type: 'exclusive' | 'subject') => {
    e.preventDefault()
    
    if (draggedIndex === null) {
      return
    }

    // 如果目標位置與當前位置相同，不需要更新順序，但設置指示器
    if (draggedIndex === targetIndex) {
      setDropTargetIndex(targetIndex)
      return
    }

    // 設置顯示指示器的位置
    setDropTargetIndex(targetIndex)

    const rules = type === 'exclusive' ? sortedExclusiveRules : sortedSubjectOnlyRules
    const draggedRuleItem = rules[draggedIndex]
    
    // 移除被拖曳的項目
    const newRules = [...rules]
    newRules.splice(draggedIndex, 1)
    // 插入到新位置
    newRules.splice(targetIndex, 0, draggedRuleItem)
    
    if (type === 'exclusive') {
      setSortedExclusiveRules(newRules)
    } else {
      setSortedSubjectOnlyRules(newRules)
    }
    setDraggedIndex(targetIndex)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    // drop 事件已经在 handleDragOver 中处理了顺序更新
    
    // 設置被移動的規則閃爍效果（拖曳放下時立即閃爍）
    if (draggedRuleId) {
      setJustSavedRuleId(draggedRuleId)
      setTimeout(() => {
        setJustSavedRuleId(null)
      }, 750) // 0.75秒後清除閃爍效果
    }
  }

  const handleDragEnd = () => {
    // 清理拖拽視覺效果，但保持排序模式
    setDropTargetIndex(null)
    setDraggedIndex(null)
  }

  const handleSaveOrder = async (type: 'exclusive' | 'subject') => {
    const rules = type === 'exclusive' ? sortedExclusiveRules : sortedSubjectOnlyRules
    const updates = rules.map((rule, index) => ({
      id: rule.id,
      display_order: index + 1
    }))

    setLoading(true)
    try {
      const response = await fetch('/api/reward-rules/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleOrders: updates }),
      })

      if (response.ok) {
        // 標記剛剛保存完成，防止 useEffect 覆蓋當前順序
        // 使用延遲確保在 router.refresh() 完成後才清除標記
        justSavedRef.current = true
        setTimeout(() => {
          justSavedRef.current = false
        }, 2000) // 增加延遲時間，確保 router.refresh() 完成
        
        // 清理狀態
        if (type === 'exclusive') {
          setIsReorderingExclusive(false)
        } else {
          setIsReorderingSubject(false)
        }
        setDraggedRuleId(null)
        setDraggedIndex(null)
        setDropTargetIndex(null)
        // 不刷新頁面，直接使用當前排序狀態
        if (onSuccess) onSuccess()
      } else {
        setError(t('reorderFailed'))
        // 恢復原順序
        if (type === 'exclusive') {
          setSortedExclusiveRules(sortRules(exclusiveRules))
          setIsReorderingExclusive(false)
        } else {
          setSortedSubjectOnlyRules(sortRules(subjectOnlyRules))
          setIsReorderingSubject(false)
        }
      }
    } catch (err) {
      setError(t('errorOccurred') + (err as Error).message)
      // 恢復原順序
      if (type === 'exclusive') {
        setSortedExclusiveRules(sortRules(exclusiveRules))
        setIsReorderingExclusive(false)
      } else {
        setSortedSubjectOnlyRules(sortRules(subjectOnlyRules))
        setIsReorderingSubject(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancelReorder = (type: 'exclusive' | 'subject') => {
    if (type === 'exclusive') {
      setIsReorderingExclusive(false)
    } else {
      setIsReorderingSubject(false)
    }
    setDraggedRuleId(null)
    setDraggedIndex(null)
    setDropTargetIndex(null)
    // 恢復原順序
    if (type === 'exclusive') {
      setSortedExclusiveRules(sortRules(exclusiveRules))
    } else {
      setSortedSubjectOnlyRules(sortRules(subjectOnlyRules))
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* 添加/編輯規則按鈕 */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 font-semibold transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          ➕ {t('addRuleFor', { subjectIcon, subjectName })}
        </button>
      )}

      {/* 添加/編輯表單 - 帶展開動畫 */}
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          showAddForm 
            ? 'max-h-[5000px] opacity-100 mt-4' 
            : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        {showAddForm && (
          <>
            {/* 編輯模式時顯示對照的規則卡片 */}
            {editingRule && (
              <div ref={referenceCardRef} className="mb-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">📋 {t('currentRule')}</p>
                <RuleCard 
                  rule={editingRule} 
                  canEdit={false}
                  isReadOnly={true}
                />
              </div>
            )}
            
            <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 transform transition-all duration-500">
              <h3 className="text-xl font-bold text-purple-800 mb-4">
                {editingRule ? `✏️ ${t('editRule')}` : `➕ ${t('addRuleFor', { subjectIcon, subjectName })}`}
              </h3>

              <div className="space-y-4">
            {/* 規則類型選擇 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('ruleScope')} *
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                  <input
                    type="radio"
                    checked={formData.is_student_specific}
                    onChange={() => {
                      setFormData({ ...formData, is_student_specific: true })
                    }}
                    className="w-5 h-5 mt-0.5 flex-shrink-0 text-purple-600 accent-purple-600"
                  />
                  <span className="text-sm leading-relaxed">
                    🟣 {t('exclusiveRule', { studentName, subjectIcon, subjectName })}
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                  <input
                    type="radio"
                    checked={!formData.is_student_specific}
                    onChange={() => {
                      setFormData({ ...formData, is_student_specific: false })
                    }}
                    className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600 accent-blue-600"
                  />
                  <span className="text-sm leading-relaxed">
                    🔵 {t('subjectOnlyRule', { subjectIcon, subjectName })}
                  </span>
                </label>
              </div>
            </div>

            {/* 規則名稱 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span>{t('ruleName')}</span>
                <span className="text-xs text-gray-500 font-normal">
                  ({t('optional')})
                </span>
              </label>
              <input
                type="text"
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder={t('autoGenerateRuleName')}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 {t('autoGenerateRuleNameHint')}
              </p>
            </div>

            {/* 評量類型 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('assessmentTypeOptional')}
              </label>
              <select
                value={formData.assessment_type}
                onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">{t('allTypesGeneral')}</option>
                <option value="exam">📝 {tAssessment('types.exam')} - {t('higherReward')}</option>
                <option value="quiz">📋 {tAssessment('types.quiz')}</option>
                <option value="homework">📓 {tAssessment('types.homework')}</option>
                <option value="project">🎨 {tAssessment('types.project')}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                💡 {t('assessmentTypeHint')}
              </p>
            </div>

            {/* 條件類型 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('scoreCondition')} *
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="perfect_score">{t('conditionTypes.perfect_score')}</option>
                <option value="score_equals">{t('conditionTypes.score_equals')}</option>
                <option value="score_range">{t('conditionTypes.score_range')}</option>
              </select>
            </div>

            {/* 分數設置 */}
            {formData.condition !== 'perfect_score' && (
              <div className="grid grid-cols-2 gap-4">
                {formData.condition === 'score_equals' ? (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('score')} *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.min_score}
                      onChange={(e) => setFormData({ ...formData, min_score: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min="0"
                      max="150"
                      step="0.5"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('minScore')}
                      </label>
                      <input
                        type="number"
                        value={formData.min_score}
                        onChange={(e) => setFormData({ ...formData, min_score: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        max="150"
                        step="0.5"
                        placeholder={t('leaveBlankForNoLimit')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('maxScore')}
                      </label>
                      <input
                        type="number"
                        value={formData.max_score}
                        onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        max="150"
                        step="0.5"
                        placeholder={t('leaveBlankForNoLimit')}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 奖励配置 - 使用基础版组件 */}
            <RewardConfigFormBasic
              rewardConfig={formData.reward_config}
              onChange={(config) => {
                setFormData({ ...formData, reward_config: config })
              }}
            />
            
            {/* 向后兼容：如果 reward_config 为空，显示旧的 reward_amount 输入 */}
            {formData.reward_config.length === 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('rewardAmount')} * ({t('legacyMode') || '传统模式'})
                </label>
                <input
                  type="text"
                  value={formData.reward_amount}
                  onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder={t('rewardAmountPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 {t('rewardFormulaHint')} {t('orUseRewardConfig') || '或使用上方的奖励配置'}
                </p>
              </div>
            )}

            {/* 按鈕 */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 cursor-pointer"
              >
                {loading ? t('processing') : editingRule ? `💾 ${t('saveChanges')}` : `✅ ${t('addRule')}`}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="px-6 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
              >
                {tCommon('cancel')}
              </button>
            </div>
            </div>
        </form>
          </>
        )}
      </div>

      {/* 專屬規則（特定學生 + 特定科目） */}
      <div>
        <div className="mb-3">
          <h3 className="text-xl font-bold text-purple-800 flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0">🟣</span>
            <span className="truncate min-w-0">{t('exclusiveRulesFor', { subjectIcon, subjectName })}</span>
            <span className="text-sm font-normal text-gray-600 whitespace-nowrap flex-shrink-0">({sortedExclusiveRules.length} {t('rulesCount', { count: sortedExclusiveRules.length })})</span>
          </h3>
        </div>
        {sortedExclusiveRules.length > 0 ? (
          <>
            <div className="space-y-2">
              {sortedExclusiveRules.map((rule, index) => {
                const isDragging = draggedIndex === index && dropTargetIndex !== null && draggedRuleId === rule.id
                const showIndicator = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index
                
                return (
                  <div key={rule.id}>
                    {/* 拖拽指示器 - 在目標位置顯示 */}
                    {showIndicator && (
                      <div className="h-1.5 mb-2 bg-blue-500 rounded-full shadow-lg animate-pulse"></div>
                    )}
                    
                    <div
                      className={`transition-all duration-200 ${
                        isDragging
                          ? 'opacity-50 scale-95' 
                          : ''
                      }`}
                    >
                      <RuleCard 
                        rule={rule} 
                        canEdit={!isReorderingExclusive}
                        onToggleActive={toggleActive}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        loading={loading}
                        showDragHandle={true}
                        isEditing={editingRule?.id === rule.id}
                        isJustSaved={justSavedRuleId === rule.id}
                        isDraggable={true}
                        onDragStart={() => handleDragStart(rule.id, index, 'exclusive')}
                        onDragOver={(e) => handleDragOver(e, index, 'exclusive')}
                        onDrop={handleDrop}
                        onDragEnd={() => handleDragEnd()}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {/* 完成排序按鈕 - 使用 hidden 來隱藏，不佔空間 */}
            {isReorderingExclusive && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSaveOrder('exclusive')}
                  disabled={loading}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <span>✓</span>
                  <span>{tCommon('done')}</span>
                </button>
                <button
                  onClick={() => handleCancelReorder('exclusive')}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <span>✕</span>
                  <span>{tCommon('cancel')}</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600">{t('noExclusiveRules')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('clickAboveToAdd')}</p>
          </div>
        )}
      </div>

      {/* 科目規則（特定科目的所有學生） */}
      <div>
        <div className="mb-3">
          <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0">🔵</span>
            <span className="truncate min-w-0">{t('subjectOnlyRulesFor', { subjectIcon, subjectName })}</span>
            <span className="text-sm font-normal text-gray-600 whitespace-nowrap flex-shrink-0">({sortedSubjectOnlyRules.length} {t('rulesCount', { count: sortedSubjectOnlyRules.length })})</span>
          </h3>
        </div>
        {sortedSubjectOnlyRules.length > 0 ? (
          <>
            <div className="space-y-2">
              {sortedSubjectOnlyRules.map((rule, index) => {
                const isDragging = draggedIndex === index && dropTargetIndex !== null && draggedRuleId === rule.id && isReorderingSubject
                const showIndicator = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index && isReorderingSubject
                
                return (
                  <div key={rule.id}>
                    {/* 拖拽指示器 - 在目標位置顯示 */}
                    {showIndicator && (
                      <div className="h-1.5 mb-2 bg-blue-500 rounded-full shadow-lg animate-pulse"></div>
                    )}
                    
                    <div
                      className={`transition-all duration-200 ${
                        isDragging
                          ? 'opacity-50 scale-95' 
                          : ''
                      }`}
                    >
                      <RuleCard 
                        rule={rule} 
                        canEdit={!isReorderingSubject}
                        onToggleActive={toggleActive}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        loading={loading}
                        showDragHandle={true}
                        isEditing={editingRule?.id === rule.id}
                        isJustSaved={justSavedRuleId === rule.id}
                        isDraggable={true}
                        onDragStart={() => handleDragStart(rule.id, index, 'subject')}
                        onDragOver={(e) => handleDragOver(e, index, 'subject')}
                        onDrop={handleDrop}
                        onDragEnd={() => handleDragEnd()}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {/* 完成排序按鈕 - 使用 hidden 來隱藏，不佔空間 */}
            {isReorderingSubject && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSaveOrder('subject')}
                  disabled={loading}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <span>✓</span>
                  <span>{tCommon('done')}</span>
                </button>
                <button
                  onClick={() => handleCancelReorder('subject')}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <span>✕</span>
                  <span>{tCommon('cancel')}</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600">{t('noSubjectOnlyRules')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('clickAboveToAdd')}</p>
          </div>
        )}
      </div>

      {/* 學生規則（特定學生的所有科目） */}
      {sortedStudentRules.length > 0 && (
        <div className="w-full min-w-0">
          <h3 className="text-xl font-bold text-green-800 mb-3 flex items-center gap-2 w-full min-w-0">
            <span>🟢</span>
            <span className="truncate flex-1 min-w-0">{t('studentGeneralRules', { studentName })}</span>
            <span className="text-sm font-normal text-gray-600 whitespace-nowrap flex-shrink-0">({sortedStudentRules.length} {t('rulesCount', { count: sortedStudentRules.length })})</span>
          </h3>
          <div className="space-y-2">
            {sortedStudentRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} canEdit={false} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ℹ️ {t('studentRulesNote', { studentName })}
          </p>
        </div>
      )}

      {/* 全局規則（所有學生的所有科目） */}
      {sortedGlobalRules.length > 0 && (
        <div className="w-full min-w-0">
          <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2 w-full min-w-0">
            <span>⚪</span>
            <span className="truncate flex-1 min-w-0">{t('globalRulesReference')}</span>
            <span className="text-sm font-normal text-gray-600 whitespace-nowrap flex-shrink-0">({sortedGlobalRules.length} {t('rulesCount', { count: sortedGlobalRules.length })})</span>
          </h3>
          <div className="space-y-2">
            {sortedGlobalRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} canEdit={false} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ℹ️ {t('globalRulesNote')}
          </p>
        </div>
      )}

      {/* 優先級說明 */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <h4 className="font-bold text-blue-800 mb-2">💡 {t('priorityExplanation')}</h4>
        <p className="text-sm text-blue-700 mb-2">
          {t('priorityIntro')}
        </p>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>{t('priorityExplanation1')}</li>
          <li>{t('priorityExplanation2')}</li>
          <li>{t('priorityExplanation3')}</li>
          <li>{t('priorityExplanation4')}</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          {t('priorityExplanation5')}
        </p>
      </div>
    </div>
  )
}

