'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import RuleCard from './RuleCard'

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
  priority: number
  is_active: boolean
  assessment_type: string | null
  display_order?: number | null
}

interface Props {
  studentId: string
  studentName: string
  globalRules: RewardRule[]  // 全局规则（所有学生、所有科目）
  studentRules: RewardRule[]  // 学生规则（此学生的所有科目）
  onSuccess?: () => void
  onCancel?: () => void
}

export default function GlobalRewardRulesManager({
  studentId,
  studentName,
  globalRules,
  studentRules,
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
  const [ruleScope, setRuleScope] = useState<'student' | 'global'>('student') // 規則範圍：學生規則或全局規則
  // 排序相關狀態 - 使用與科目列表相同的邏輯
  const [isReorderingStudent, setIsReorderingStudent] = useState(false)
  const [isReorderingGlobal, setIsReorderingGlobal] = useState(false)
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
    reward_amount: '',
    priority: '20', // 學生規則預設優先級（全局規則為10）
    is_active: true,
    assessment_type: '' as '' | 'exam' | 'quiz' | 'homework' | 'project',
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
      priority: ruleScope === 'student' ? '20' : '10',
      is_active: true,
      assessment_type: '',
    })
    setEditingRule(null)
    setShowAddForm(false)
  }

  const handleEdit = (rule: RewardRule) => {
    setEditingRule(rule)
    // 根據規則類型設置範圍
    if (rule.student_id !== null) {
      setRuleScope('student')
    } else {
      setRuleScope('global')
    }
    setFormData({
      rule_name: rule.rule_name || '',
      condition: rule.condition as any,
      min_score: rule.min_score?.toString() || '',
      max_score: rule.max_score?.toString() || '',
      // 若有公式，編輯時優先顯示公式
      reward_amount: (rule.reward_formula?.toString() || rule.reward_amount?.toString() || ''),
      priority: rule.priority?.toString() || (rule.student_id !== null ? '20' : '10'),
      is_active: rule.is_active ?? true,
      assessment_type: (rule.assessment_type as any) || '',
    })
    setShowAddForm(true)
  }

  // 當表單展開且正在編輯時，等待展開動畫結束後滾動到對照規則卡片
  useEffect(() => {
    if (showAddForm && editingRule && referenceCardRef.current) {
      const timer = setTimeout(() => {
        referenceCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }, 550)
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
        ruleName = `${t('conditionTypes.perfect_score')}${rewardText}`
      } else if (minScore !== null) {
        ruleName = `${minScore}${pointsText}${rewardText}`
      } else {
        ruleName = rewardText
      }
    }

    try {
      // 計算新規則的 display_order（放在列表最後）
      let displayOrder = null
      if (!editingRule) {
        const targetRules = ruleScope === 'student' ? sortedStudentRules : sortedGlobalRules
        if (targetRules.length > 0) {
          const maxOrder = Math.max(...targetRules.map(r => (r as any).display_order ?? 0))
          displayOrder = maxOrder + 1
        } else {
          displayOrder = 1
        }
      }
      
      const payload = {
        ...(editingRule ? { rule_id: editingRule.id } : {}),
        student_id: ruleScope === 'student' ? studentId : null, // 學生規則或全局規則
        subject_id: null, // 通用規則不綁定科目
        rule_name: ruleName,
        condition: formData.condition,
        min_score: formData.min_score ? parseFloat(formData.min_score) : null,
        max_score: formData.max_score ? parseFloat(formData.max_score) : null,
        // reward_amount 欄位支援「數字或公式」，若為公式則寫入 reward_formula
        reward_amount: isNumericReward(formData.reward_amount) ? parseFloat(formData.reward_amount) : 0,
        reward_formula: isNumericReward(formData.reward_amount) ? null : (formData.reward_amount.trim() || null),
        priority: formData.priority ? parseInt(formData.priority) : (ruleScope === 'student' ? 20 : 10),
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
          
          // 更新學生規則列表
          setSortedStudentRules(prevRules => 
            prevRules.map(r => r.id === editingRule.id ? updatedRule : r)
          )
          
          // 更新全局規則列表
          setSortedGlobalRules(prevRules => 
            prevRules.map(r => r.id === editingRule.id ? updatedRule : r)
          )
          
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
        setError(result.error || '操作失敗，請稍後再試')
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
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

      if (response.ok && result.data) {
        // 使用後端返回的更新後數據，確保數據一致性
        const updatedRule = result.data
        
        // 驗證更新是否成功
        console.log('Rule updated successfully:', {
          id: updatedRule.id,
          rule_name: updatedRule.rule_name,
          is_active: updatedRule.is_active,
          student_id: updatedRule.student_id,
          subject_id: updatedRule.subject_id
        })
        
        // 更新學生規則列表
        setSortedStudentRules(prevRules => 
          prevRules.map(r => r.id === rule.id ? updatedRule : r)
        )
        
        // 更新全局規則列表
        setSortedGlobalRules(prevRules => 
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
        }, 2000) // 增加延遲時間，確保 router.refresh() 完成
        
        // 調用 onSuccess，但合併邏輯會保留本地已更新的規則狀態
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(result.error || '更新失敗，請稍後再試')
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
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
        setSortedStudentRules(prevRules => 
          prevRules.filter(r => r.id !== ruleId)
        )
        
        setSortedGlobalRules(prevRules => 
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
      setError('發生錯誤：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 排序規則（按 display_order，如果沒有則按 priority）
  const sortRules = (rules: RewardRule[]) => {
    return [...rules].sort((a, b) => {
      const orderA = (a as any).display_order ?? a.priority ?? 0
      const orderB = (b as any).display_order ?? b.priority ?? 0
      return orderA - orderB
    })
  }

  const [sortedStudentRules, setSortedStudentRules] = useState(() => sortRules(studentRules))
  const [sortedGlobalRules, setSortedGlobalRules] = useState(() => sortRules(globalRules))

  // 當 props 變化時更新排序後的規則
  useEffect(() => {
    // 如果剛剛保存完成，不覆蓋當前狀態
    if (justSavedRef.current) {
      return
    }
    if (!isReorderingStudent) {
      // 合併更新：保留本地已更新的規則狀態，即使新數據中沒有也要保留
      setSortedStudentRules(prevRules => {
        const newRules = sortRules(studentRules)
        // 創建一個映射，保留本地已更新的規則狀態
        const localUpdates = new Map(prevRules.map(r => [r.id, r]))
        // 創建新數據的映射
        const newRulesMap = new Map(newRules.map(r => [r.id, r]))
        
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
    if (!isReorderingGlobal) {
      // 合併更新：保留本地已更新的規則狀態，即使新數據中沒有也要保留
      setSortedGlobalRules(prevRules => {
        const newRules = sortRules(globalRules)
        // 創建一個映射，保留本地已更新的規則狀態
        const localUpdates = new Map(prevRules.map(r => [r.id, r]))
        // 創建新數據的映射
        const newRulesMap = new Map(newRules.map(r => [r.id, r]))
        
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
  }, [studentRules, globalRules, isReorderingStudent, isReorderingGlobal])

  // 拖拽排序處理 - 使用與科目列表相同的邏輯
  const handleDragStart = (ruleId: string, index: number, type: 'student' | 'global') => {
    if (type === 'student') {
      setIsReorderingStudent(true)
    } else {
      setIsReorderingGlobal(true)
    }
    setDraggedRuleId(ruleId)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, targetIndex: number, type: 'student' | 'global') => {
    e.preventDefault()
    
    // 檢查是否在正確的排序模式
    if (type === 'student' && !isReorderingStudent) {
      return
    }
    if (type === 'global' && !isReorderingGlobal) {
      return
    }
    
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

    const rules = type === 'student' ? sortedStudentRules : sortedGlobalRules
    const draggedRuleItem = rules[draggedIndex]
    
    // 移除被拖曳的項目
    const newRules = [...rules]
    newRules.splice(draggedIndex, 1)
    // 插入到新位置
    newRules.splice(targetIndex, 0, draggedRuleItem)
    
    if (type === 'student') {
      setSortedStudentRules(newRules)
    } else {
      setSortedGlobalRules(newRules)
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

  const handleSaveOrder = async (type: 'student' | 'global') => {
    const rules = type === 'student' ? sortedStudentRules : sortedGlobalRules
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
        if (type === 'student') {
          setIsReorderingStudent(false)
        } else {
          setIsReorderingGlobal(false)
        }
        setDraggedRuleId(null)
        setDraggedIndex(null)
        setDropTargetIndex(null)
        // 不刷新頁面，直接使用當前排序狀態
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError('排序失敗，請稍後再試')
        // 恢復原順序
        if (type === 'student') {
          setSortedStudentRules(sortRules(studentRules))
          setIsReorderingStudent(false)
        } else {
          setSortedGlobalRules(sortRules(globalRules))
          setIsReorderingGlobal(false)
        }
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
      // 恢復原順序
      if (type === 'student') {
        setSortedStudentRules(sortRules(studentRules))
        setIsReorderingStudent(false)
      } else {
        setSortedGlobalRules(sortRules(globalRules))
        setIsReorderingGlobal(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancelReorder = (type: 'student' | 'global') => {
    if (type === 'student') {
      setIsReorderingStudent(false)
    } else {
      setIsReorderingGlobal(false)
    }
    setDraggedRuleId(null)
    setDraggedIndex(null)
    setDropTargetIndex(null)
    // 恢復原順序
    if (type === 'student') {
      setSortedStudentRules(sortRules(studentRules))
    } else {
      setSortedGlobalRules(sortRules(globalRules))
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* 添加規則按鈕 */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-semibold transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          ➕ {t('addGlobalRule') || '添加通用獎金規則'}
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
                <p className="text-sm font-semibold text-gray-600 mb-2">📋 {t('currentRule') || '當前規則（對照）'}</p>
                <RuleCard 
                  rule={editingRule} 
                  canEdit={false}
                  isReadOnly={true}
                />
              </div>
            )}
            
            <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border-2 border-gray-200 transform transition-all duration-500">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {editingRule ? `✏️ ${t('editRule')}` : `➕ ${t('addGlobalRule') || '添加通用獎金規則'}`}
              </h3>

            <div className="space-y-4">
              {/* 規則範圍（編輯時顯示） */}
              {editingRule && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>{t('currentRuleScope') || '當前規則範圍'}：</strong>
                    {editingRule.student_id !== null 
                      ? `🟢 ${t('studentRuleScope', { studentName }) || `${studentName} 的所有科目`}`
                      : `⚪ ${t('globalRuleScope') || '所有學生的所有科目'}`
                    }
                  </p>
                </div>
              )}
              
              {/* 規則範圍選擇（僅新增模式） */}
              {!editingRule && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('ruleScope') || '規則範圍'} *
                  </label>
                  <div className="space-y-3">
                    <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                      ruleScope === 'student'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                    }`}>
                      <input
                        type="radio"
                        checked={ruleScope === 'student'}
                        onChange={() => {
                          setRuleScope('student')
                          setFormData({ ...formData, priority: '20' })
                        }}
                        className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600 accent-green-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-gray-800 block mb-1">
                          🟢 {t('studentRuleScope', { studentName }) || `${studentName} 的所有科目`}
                        </span>
                        <span className="text-xs text-gray-600">
                          {t('studentRuleScopeDesc') || '僅適用於此學生的所有科目'}
                        </span>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                      ruleScope === 'global'
                        ? 'border-gray-500 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        checked={ruleScope === 'global'}
                        onChange={() => {
                          setRuleScope('global')
                          setFormData({ ...formData, priority: '10' })
                        }}
                        className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-600 accent-gray-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-gray-800 block mb-1">
                          ⚪ {t('globalRuleScope') || '所有學生的所有科目'}
                        </span>
                        <span className="text-xs text-gray-600">
                          {t('globalRuleScopeDesc') || '適用於所有學生的所有科目'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              {/* 規則名稱 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span>{t('ruleName')}</span>
                  <span className="text-xs text-gray-500 font-normal">
                    ({t('optional') || '選填'})
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder={t('autoGenerateRuleName') || '留空則自動生成：科目 分數 獎勵'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 {t('autoGenerateRuleNameHint') || '留空將自動產生名稱，例如：90分獎勵'}
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

              {/* 獎金金額 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('rewardAmount')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.reward_amount}
                  onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder={t('rewardAmountPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 {t('rewardFormulaHint')}
                </p>
              </div>

              {/* 優先級 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('priorityHint')}
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('prioritySuggestion')}
                </p>
              </div>

              {/* 按鈕 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-700 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 cursor-pointer"
                >
                  {loading ? t('processing') : editingRule ? `💾 ${t('saveChanges')}` : `✅ ${t('addRule')}`}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="px-6 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
                >
                  {tCommon('cancel')}
                </button>
              </div>
            </div>
          </form>
          </>
        )}
      </div>

      {/* 學生規則列表 */}
      <div>
        <div className="flex items-center justify-between mb-3 min-h-[48px]">
          <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
            <span>🟢</span>
            <span>{t('studentGeneralRules', { studentName }) || `${studentName} 的通用規則`}</span>
            <span className="text-sm font-normal text-gray-600">({sortedStudentRules.length} {t('rulesCount', { count: sortedStudentRules.length })})</span>
          </h3>
          {/* 完成排序按鈕 - 始終渲染但在非排序模式時隱藏，避免佈局跳動 */}
          <div className={`flex gap-2 transition-opacity duration-200 ${isReorderingStudent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              onClick={() => handleSaveOrder('student')}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <span>✓</span>
              <span>{tCommon('done') || '完成排序'}</span>
            </button>
            <button
              onClick={() => handleCancelReorder('student')}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <span>✕</span>
              <span>{tCommon('cancel')}</span>
            </button>
          </div>
        </div>
        {sortedStudentRules.length > 0 ? (
          <div 
            className="space-y-2"
            onDragOver={(e) => {
              e.preventDefault()
            }}
          >
            {sortedStudentRules.map((rule, index) => {
              const isDragging = draggedIndex === index && dropTargetIndex !== null && draggedRuleId === rule.id && isReorderingStudent
              const showIndicator = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index && isReorderingStudent
              
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
                      canEdit={!isReorderingStudent}
                      onToggleActive={toggleActive}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      loading={loading}
                      showDragHandle={true}
                      isEditing={editingRule?.id === rule.id}
                      isJustSaved={justSavedRuleId === rule.id}
                      isDraggable={true}
                      onDragStart={() => handleDragStart(rule.id, index, 'student')}
                      onDragOver={(e) => handleDragOver(e, index, 'student')}
                      onDrop={handleDrop}
                      onDragEnd={() => handleDragEnd()}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600">{t('noStudentRules')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('clickAboveToAdd')}</p>
          </div>
        )}
      </div>

      {/* 全局規則列表 */}
      <div>
        <div className="flex items-center justify-between mb-3 min-h-[48px]">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>⚪</span>
            <span>{t('globalRulesReference')}</span>
            <span className="text-sm font-normal text-gray-600">({sortedGlobalRules.length} {t('rulesCount', { count: sortedGlobalRules.length })})</span>
          </h3>
          {/* 完成排序按鈕 - 始終渲染但在非排序模式時隱藏，避免佈局跳動 */}
          <div className={`flex gap-2 transition-opacity duration-200 ${isReorderingGlobal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              onClick={() => handleSaveOrder('global')}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <span>✓</span>
              <span>{tCommon('done') || '完成排序'}</span>
            </button>
            <button
              onClick={() => handleCancelReorder('global')}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <span>✕</span>
              <span>{tCommon('cancel')}</span>
            </button>
          </div>
        </div>
        {sortedGlobalRules.length > 0 ? (
          <div className="space-y-2">
            {sortedGlobalRules.map((rule, index) => {
              const isDragging = draggedIndex === index && dropTargetIndex !== null && draggedRuleId === rule.id && isReorderingGlobal
              const showIndicator = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index && isReorderingGlobal
              
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
                      canEdit={!isReorderingGlobal}
                      onToggleActive={toggleActive}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      loading={loading}
                      showDragHandle={true}
                      isEditing={editingRule?.id === rule.id}
                      isJustSaved={justSavedRuleId === rule.id}
                      isDraggable={true}
                      onDragStart={() => handleDragStart(rule.id, index, 'global')}
                      onDragOver={(e) => handleDragOver(e, index, 'global')}
                      onDrop={handleDrop}
                      onDragEnd={() => handleDragEnd()}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-600">{t('noGlobalRules')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('clickAboveToAdd')}</p>
          </div>
        )}
      </div>

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

