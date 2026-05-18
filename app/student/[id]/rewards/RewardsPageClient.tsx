'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import GoalPopup from './GoalPopup'
import CompleteGoalPopup from './CompleteGoalPopup'
import ExchangeRulePopup from './ExchangeRulePopup'
import RewardDetailModal from './RewardDetailModal'
import UseRewardPopup from './UseRewardPopup'
import AddRewardPopup from './AddRewardPopup'
import { isParent } from '@/lib/utils/userRole'
import StudentHomeNavButton from '@/app/components/StudentHomeNavButton'
import { formatRewardAmountWithUnit } from './rewardUnit'
import type { GoalTemplateImage } from '@/app/components/ImageUploader'
import { toDateInputValue } from '@/lib/utils/goalTracking'

interface Student {
  id: string
  name: string
  avatar_url: string | null
}

interface CustomRewardType {
  id?: string
  type_key?: string
  display_name: string
  icon: string
  color: string
  default_unit: string | null
  is_accumulable: boolean
  description?: string
  extra_input_schema: unknown
  is_system?: boolean
}

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

interface StudentGoal {
  id?: string
  student_id?: string
  template_id?: string | null
  name: string
  description: string | null
  tracking_mode: 'cumulative_amount' | 'completion_count'
  target_amount: number | null
  target_count: number | null
  tracking_reward_type_id: string | null  // 要追蹤累積的獎勵類型
  reward_type_id: string | null            // 完成時給予的獎勵類型（可為空）
  reward_on_complete: number
  consume_on_complete: boolean
  icon: string
  color: string
  is_active: boolean
  display_order: number
  image_urls: GoalTemplateImage[]
  current_progress?: number
  status?: 'active' | 'completed'
  completed_at?: string | null
  completion_notes?: string | null
  completion_images?: GoalTemplateImage[]
  tracking_started_at?: string | null
  linked_event_ids?: string[]
}

interface Props {
  studentId: string
  student: unknown
  avatar: { emoji: string; gradientStyle: string }
  allStudents: Student[]
}

function formatTrackingStartDate(value: string | null | undefined, locale: string) {
  const dateValue = value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || toDateInputValue(value)
  if (!dateValue) return ''

  const [year, month, day] = dateValue.split('-')
  if (locale === 'zh-TW') {
    return `${year}/${month}/${day}`
  }
  return `${month}/${day}/${year}`
}

type RewardDashboardTab = 'goals' | 'shop' | 'records'


function getStudentName(student: unknown) {
  if (!student || typeof student !== 'object' || !('name' in student)) return ''
  const name = (student as { name?: unknown }).name
  return typeof name === 'string' ? name : ''
}

function getGoalCoverImage(goal: StudentGoal): string | null {
  const firstImage = goal.image_urls?.[0]
  if (!firstImage?.url) return null

  const path = firstImage.path || (() => {
    try {
      const url = new URL(firstImage.url)
      const marker = '/object/public/goal-images/'
      const markerIndex = url.pathname.indexOf(marker)
      return markerIndex === -1 ? '' : decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    } catch {
      return ''
    }
  })()

  if (
    path.startsWith('pending/') ||
    path.startsWith('goal-templates/pending/') ||
    path.startsWith('student-goals/temp/')
  ) {
    return null
  }

  return firstImage.url
}

function withAlphaColor(color: string, alpha: number) {
  const normalized = color.trim()
  const hex = normalized.replace('#', '')

  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const [r, g, b] = hex.split('').map((value) => parseInt(`${value}${value}`, 16))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return `color-mix(in srgb, ${normalized} ${Math.round(alpha * 100)}%, transparent)`
}

function getProgressPercent(current: number, target: number) {
  if (target <= 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

export default function RewardsPageClient({ studentId, student }: Props) {
  const locale = useLocale()

  const [customTypes, setCustomTypes] = useState<CustomRewardType[]>([])
  const [goals, setGoals] = useState<StudentGoal[]>([])
  const [sortedGoals, setSortedGoals] = useState<StudentGoal[]>([])
  const [exchangeRules, setExchangeRules] = useState<ExchangeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showGoalPopup, setShowGoalPopup] = useState(false)
  const [editingGoal, setEditingGoal] = useState<StudentGoal | null>(null)
  const [showCompletePopup, setShowCompletePopup] = useState(false)
  const [completingGoal, setCompletingGoal] = useState<StudentGoal | null>(null)
  const [showExchangeRulePopup, setShowExchangeRulePopup] = useState(false)
  const [editingExchangeRule, setEditingExchangeRule] = useState<ExchangeRule | null>(null)
  const [showRewardDetailModal, setShowRewardDetailModal] = useState(false)
  const [selectedRewardType, setSelectedRewardType] = useState<CustomRewardType | null>(null)
  const [showUseRewardPopup, setShowUseRewardPopup] = useState(false)
  const [useRewardType, setUseRewardType] = useState<CustomRewardType | null>(null)
  const [showAddRewardPopup, setShowAddRewardPopup] = useState(false)
  const [activeDashboardTab, setActiveDashboardTab] = useState<RewardDashboardTab>('goals')
  const [activeGoalIndex, setActiveGoalIndex] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hasReordered, setHasReordered] = useState(false)
  const [rewardStats, setRewardStats] = useState<Record<string, { totalEarned: number; currentBalance: number }>>({})
  const [achievementEvents, setAchievementEvents] = useState<Array<{ id: string; name: string; icon?: string }>>([])
  const [undoGoalId, setUndoGoalId] = useState<string | null>(null)
  const [undoGoalName, setUndoGoalName] = useState<string>('')
  const [undoing, setUndoing] = useState(false)
  const [canManage, setCanManage] = useState(true)

  // 最近活動記錄
  const [recentActivities, setRecentActivities] = useState<Record<string, { description: string; created_at: string; amount: number } | null>>({})

  const studentName = getStudentName(student)
  const activeGoals = sortedGoals.filter((goal) => goal.status !== 'completed')
  const completedGoals = sortedGoals.filter((goal) => goal.status === 'completed')
  const activeExchangeRules = exchangeRules.filter((rule) => rule.is_active)
  const recentRecordItems = sortedGoals
    .map((goal) => {
      const activity = goal.id ? recentActivities[goal.id] : null
      return activity ? { goal, activity } : null
    })
    .filter((item): item is { goal: StudentGoal; activity: { description: string; created_at: string; amount: number } } => Boolean(item))
    .sort((a, b) => b.activity.created_at.localeCompare(a.activity.created_at))

  // 載入自訂義獎勵類型
  const loadCustomTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/custom-reward-types/list', {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API Response:', data)
      
      if (data.success && data.types) {
        console.log('Loaded custom types:', data.types)
        setCustomTypes(data.types || [])
      } else {
        console.warn('API returned success=false or no types:', data)
        setCustomTypes([])
        if (data.error) {
          setError(data.error)
        }
      }
    } catch (err) {
      console.error('Failed to load custom types:', err)
      setError(locale === 'zh-TW' ? '載入獎勵類型時發生錯誤：' + (err instanceof Error ? err.message : 'Unknown error') : 'Error loading reward types: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setCustomTypes([])
    } finally {
      setLoading(false)
    }
  }, [locale])

  // 載入獎勵統計
  const loadRewardStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/students/${studentId}/reward-stats`, {
        method: 'GET',
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.stats) {
          setRewardStats(data.stats)
        }
      }
    } catch (err) {
      console.error('Failed to load reward stats:', err)
    }
  }, [studentId])

  // 載入兌換規則
  const loadExchangeRules = useCallback(async () => {
    try {
      const response = await fetch('/api/exchange-rules/list', {
        method: 'GET',
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.rules) {
          setExchangeRules(data.rules)
        } else {
          setExchangeRules([])
        }
      } else {
        console.error('Failed to load exchange rules')
        setExchangeRules([])
      }
    } catch (err) {
      console.error('Failed to load exchange rules:', err)
      setExchangeRules([])
    }
  }, [])

  // 載入學生的大型目標
  const loadGoals = useCallback(async () => {
    try {
      const response = await fetch(`/api/student-goals/list?student_id=${studentId}`, {
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.goals) {
          setGoals(data.goals)
          setSortedGoals(data.goals)
        } else {
          setGoals([])
          setSortedGoals([])
        }
      } else {
        console.error('Failed to load student goals')
        setGoals([])
        setSortedGoals([])
      }
    } catch (err) {
      console.error('Failed to load student goals:', err)
      setGoals([])
      setSortedGoals([])
    }
  }, [studentId])

  // 載入成就事件
  const loadAchievementEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/achievement-events/list')
      if (response.ok) {
        const data = await response.json()
        if (data.events) {
          setAchievementEvents(data.events.map((e: { id: string; name?: string; icon?: string }) => ({
            id: e.id,
            name: e.name || '',
            icon: e.icon,
          })))
        }
      }
    } catch (err) {
      console.error('Failed to load achievement events:', err)
    }
  }, [])

  // 載入最近活動記錄
  const loadRecentActivities = useCallback(async () => {
    try {
      const response = await fetch(`/api/student-goals/recent-activity?student_id=${studentId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.activities) {
          setRecentActivities(data.activities)
        }
      }
    } catch (err) {
      console.error('Failed to load recent activities:', err)
    }
  }, [studentId])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      await Promise.all([loadCustomTypes(), loadExchangeRules(), loadGoals(), loadAchievementEvents()])
      setLoading(false)
    }
    loadData()
  }, [loadAchievementEvents, loadCustomTypes, loadExchangeRules, loadGoals])

  useEffect(() => {
    setCanManage(isParent())
  }, [])

  useEffect(() => {
    if (customTypes.length > 0) {
      loadRewardStats()
    }
  }, [customTypes.length, loadRewardStats])

  // 當目標載入完成後，載入最近活動
  useEffect(() => {
    if (goals.length > 0) {
      loadRecentActivities()
    }
  }, [goals.length, loadRecentActivities])

  useEffect(() => {
    setActiveGoalIndex((currentIndex) => {
      if (activeGoals.length === 0) return 0
      return Math.min(currentIndex, activeGoals.length - 1)
    })
  }, [activeGoals.length])

  // 保存大型目標（新增或更新）
  const handleSaveGoal = async (goal: StudentGoal) => {
    try {
      if (goal.id) {
        // 更新
        const response = await fetch('/api/student-goals/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goal)
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || (locale === 'zh-TW' ? '更新失敗' : 'Update failed'))
        }
      } else {
        // 新增
        const response = await fetch('/api/student-goals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...goal, student_id: studentId })
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || (locale === 'zh-TW' ? '創建失敗' : 'Create failed'))
        }
      }
      await loadGoals()
      setShowGoalPopup(false)
      setEditingGoal(null)
    } catch (err) {
      throw err
    }
  }

  // 刪除大型目標
  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch('/api/student-goals/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId })
      })

      if (response.ok) {
        await loadGoals()
        setError('')
      } else {
        const data = await response.json()
        setError(data.error || (locale === 'zh-TW' ? '刪除失敗' : 'Delete failed'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '發生錯誤' : 'An error occurred'))
    }
  }

  // 打開完成目標彈窗
  const handleEditLegacyGoal = (goal: StudentGoal) => {
    setEditingGoal(goal)
    setShowGoalPopup(true)
  }

  const handleOpenCompleteGoal = (goal: StudentGoal) => {
    setCompletingGoal(goal)
    setShowCompletePopup(true)
  }

  // 標記目標完成
  const handleCompleteGoal = async (data: {
    completed_at: string
    completion_notes: string
    completion_images: GoalTemplateImage[]
  }) => {
    if (!completingGoal?.id) return
    try {
      const response = await fetch(`/api/student-goals/${completingGoal.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || (locale === 'zh-TW' ? '標記完成失敗' : 'Complete failed'))
      }
      await loadGoals()
      setShowCompletePopup(false)
      // 顯示還原 toast
      setUndoGoalId(completingGoal.id)
      setUndoGoalName(completingGoal.name)
      setCompletingGoal(null)
      // 10 秒後自動清除 undo 選項
      setTimeout(() => {
        setUndoGoalId(null)
        setUndoGoalName('')
      }, 10000)
    } catch (err) {
      throw err
    }
  }

  // 還原目標完成
  const handleUndoComplete = async () => {
    if (!undoGoalId) return
    setUndoing(true)
    try {
      const response = await fetch(`/api/student-goals/${undoGoalId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || (locale === 'zh-TW' ? '還原失敗' : 'Undo failed'))
      }
      await loadGoals()
      setUndoGoalId(null)
      setUndoGoalName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '發生錯誤' : 'An error occurred'))
    } finally {
      setUndoing(false)
    }
  }

  // 重新啟用目標
  const handleReactivateGoal = async (goal: StudentGoal) => {
    if (!goal.id) return
    if (!confirm(locale === 'zh-TW'
      ? '確定要重新啟用這個目標嗎？將會清除完成狀態並重新計算進度。'
      : 'Are you sure you want to reactivate this goal? This will clear the completion status and reset progress.'
    )) return

    try {
      const response = await fetch(`/api/student-goals/${goal.id}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || (locale === 'zh-TW' ? '重新啟用失敗' : 'Reactivate failed'))
      }
      await loadGoals()
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '發生錯誤' : 'An error occurred'))
    }
  }

  // 打開新增兌換規則彈窗
  const handleAddExchangeRule = () => {
    setEditingExchangeRule(null)
    setShowExchangeRulePopup(true)
  }

  // 打開編輯兌換規則彈窗
  const handleEditExchangeRule = (rule: ExchangeRule) => {
    setEditingExchangeRule(rule)
    setShowExchangeRulePopup(true)
  }

  // 保存兌換規則
  const handleSaveExchangeRule = async (rule: ExchangeRule) => {
    try {
      const url = rule.id ? '/api/exchange-rules/update' : '/api/exchange-rules/create'
      const method = 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      })

      if (response.ok) {
        await loadExchangeRules()
        setError('')
      } else {
        const data = await response.json()
        throw new Error(data.error || (locale === 'zh-TW' ? '儲存失敗' : 'Save failed'))
      }
    } catch (err) {
      throw err
    }
  }

  // 刪除兌換規則
  const handleDeleteExchangeRule = async (ruleId: string) => {
    if (!confirm(locale === 'zh-TW' 
      ? '確定要刪除此兌換規則嗎？' 
      : 'Are you sure you want to delete this exchange rule?'
    )) {
      return
    }

    try {
      const response = await fetch('/api/exchange-rules/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId })
      })

      if (response.ok) {
        await loadExchangeRules()
        setError('')
      } else {
        const data = await response.json()
        setError(data.error || (locale === 'zh-TW' ? '刪除失敗' : 'Delete failed'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '發生錯誤' : 'An error occurred'))
    }
  }

  // 打開獎勵詳情彈窗
  const handleOpenRewardDetail = (type: CustomRewardType) => {
    setSelectedRewardType(type)
    setShowRewardDetailModal(true)
  }

  // 打開使用獎勵彈窗
  const handleOpenUseReward = (type: CustomRewardType) => {
    setUseRewardType(type)
    setShowUseRewardPopup(true)
  }

  // 處理獎勵使用
  const handleUseReward = async (title: string, amount: number, notes: string) => {
    if (!useRewardType || !useRewardType.id) return

    try {
      const response = await fetch('/api/rewards/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          rewardTypeId: useRewardType.id,
          amount,
          title,
          notes
        })
      })

      if (response.ok) {
        await loadRewardStats()
        alert(locale === 'zh-TW' ? '使用成功！' : 'Used successfully!')
      } else {
        const data = await response.json()
        setError(data.error || (locale === 'zh-TW' ? '使用失敗' : 'Use failed'))
        throw new Error(data.error || 'Use failed')
      }
    } catch (err) {
      throw err
    }
  }

  // 打開添加獎勵彈窗（不再需要預選獎勵類型）
  const handleOpenAddReward = () => {
    setShowAddRewardPopup(true)
  }

  // 處理添加獎勵
  const handleAddReward = async (rewardTypeId: string, title: string, amount: number, notes: string) => {
    try {
      const response = await fetch('/api/rewards/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          rewardTypeId,
          amount,
          title,
          notes
        })
      })

      if (response.ok) {
        await loadRewardStats()
        alert(locale === 'zh-TW' ? '添加成功！' : 'Added successfully!')
      } else {
        const data = await response.json()
        setError(data.error || (locale === 'zh-TW' ? '添加失敗' : 'Add failed'))
        throw new Error(data.error || 'Add failed')
      }
    } catch (err) {
      throw err
    }
  }

  // 處理從詳情彈窗的兌換
  const handleExchangeFromDetail = async (ruleId: string) => {
    try {
      const response = await fetch('/api/rewards/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          exchangeRuleId: ruleId
        })
      })

      if (response.ok) {
        await loadRewardStats()
        alert(locale === 'zh-TW' ? '兌換成功！' : 'Exchange successful!')
      } else {
        const data = await response.json()
        setError(data.error || (locale === 'zh-TW' ? '兌換失敗' : 'Exchange failed'))
        throw new Error(data.error || 'Exchange failed')
      }
    } catch (err) {
      throw err
    }
  }

  // 處理兌換操作
  const handleExchange = async (rule: ExchangeRule) => {
    // 檢查學生是否有足夠的獎勵
    const requiredType = customTypes.find(t => t.id === rule.required_reward_type_id)
    if (!requiredType || !requiredType.id) {
      setError(locale === 'zh-TW' ? '找不到對應的獎勵類型' : 'Reward type not found')
      return
    }

    const currentBalance = rewardStats[requiredType.id]?.currentBalance || 0
    if (currentBalance < rule.required_amount) {
      setError(locale === 'zh-TW' 
        ? `餘額不足，需要 ${formatRewardAmountWithUnit(rule.required_amount, requiredType, locale)}，目前只有 ${formatRewardAmountWithUnit(currentBalance, requiredType, locale)}` 
        : `Insufficient balance. Need ${formatRewardAmountWithUnit(rule.required_amount, requiredType, locale)}, but only have ${formatRewardAmountWithUnit(currentBalance, requiredType, locale)}`
      )
      return
    }

    // 確認兌換
    const ruleName = rule.name || ''
    
    if (!confirm(locale === 'zh-TW' 
      ? `確定要用 ${formatRewardAmountWithUnit(rule.required_amount, requiredType, locale)} 兌換「${ruleName}」嗎？` 
      : `Are you sure you want to exchange ${formatRewardAmountWithUnit(rule.required_amount, requiredType, locale)} for "${ruleName}"?`
    )) {
      return
    }

    try {
      // 調用兌換 API
      const response = await fetch('/api/rewards/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          exchangeRuleId: rule.id
        })
      })

      if (response.ok) {
        // 刷新統計數據
        await loadRewardStats()
        alert(locale === 'zh-TW' ? '兌換成功！' : 'Exchange successful!')
      } else {
        const data = await response.json()
        setError(data.error || (locale === 'zh-TW' ? '兌換失敗' : 'Exchange failed'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '發生錯誤' : 'An error occurred'))
    }
  }

  // 拖拽排序相關函數（僅家長可用）
  const handleDragStart = (index: number) => {
    if (!canManage) return
    setDraggedIndex(index)
    setHasReordered(true)
    document.body.style.cursor = 'grabbing'
    
    // 添加動畫類到所有卡片
    const cards = document.querySelectorAll('[data-goal-card]')
    cards.forEach(card => {
      card.classList.add('dragging')
    })
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canManage) return
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newGoals = [...sortedGoals]
    const draggedItem = newGoals[draggedIndex]
    newGoals.splice(draggedIndex, 1)
    newGoals.splice(index, 0, draggedItem)
    setSortedGoals(newGoals)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (!canManage) return
    setDraggedIndex(null)
    document.body.style.cursor = 'default'

    // 移除動畫類
    const cards = document.querySelectorAll('[data-goal-card]')
    cards.forEach(card => {
      card.classList.remove('dragging')
    })

    // 如果順序有改變，自動保存
    if (hasReordered) {
      try {
        const goalOrders = sortedGoals
          .filter(goal => goal.id)
          .map((goal, index) => ({
            id: goal.id!,
            display_order: index
          }))

        const response = await fetch('/api/student-goals/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalOrders })
        })

        if (response.ok) {
          setHasReordered(false)
          await loadGoals()
        } else {
          console.error('Failed to save order')
          setSortedGoals([...goals])
          setHasReordered(false)
        }
      } catch (error) {
        console.error('Failed to save order:', error)
        setSortedGoals([...goals])
        setHasReordered(false)
      }
    }
  }

  const getRewardType = (rewardTypeId: string | null | undefined) =>
    customTypes.find((type) => type.id === rewardTypeId)

  const getGoalSummary = (goal: StudentGoal) => {
    const current = goal.current_progress || 0
    const target = goal.tracking_mode === 'cumulative_amount'
      ? (goal.target_amount || 0)
      : (goal.target_count || 0)
    const safeTarget = target > 0 ? target : 1
    const percent = getProgressPercent(current, safeTarget)
    const trackingType = getRewardType(goal.tracking_reward_type_id || goal.reward_type_id)
    const rewardType = getRewardType(goal.reward_type_id)
    const trackingLabel = goal.tracking_mode === 'cumulative_amount'
      ? (trackingType?.display_name || (locale === 'zh-TW' ? '未設定獎勵類型' : 'No reward type'))
      : (goal.linked_event_ids?.length
        ? achievementEvents
          .filter((event) => goal.linked_event_ids?.includes(event.id))
          .map((event) => event.name)
          .join(', ')
        : (locale === 'zh-TW' ? '全部成就事件' : 'All events'))
    const unit = goal.tracking_mode === 'cumulative_amount'
      ? (trackingType?.default_unit || trackingType?.display_name || '')
      : (locale === 'zh-TW' ? '次' : 'times')
    const rewardLabel = rewardType && goal.reward_on_complete > 0
      ? `+${goal.reward_on_complete.toLocaleString()} ${rewardType.display_name}`
      : (goal.consume_on_complete
        ? (locale === 'zh-TW' ? '完成後消耗進度獎勵' : 'Consume tracked rewards')
        : (locale === 'zh-TW' ? '完成目標' : 'Complete goal'))

    return {
      current,
      target: safeTarget,
      percent,
      trackingType,
      rewardType,
      trackingLabel,
      unit,
      rewardLabel,
      startDate: goal.tracking_started_at
        ? formatTrackingStartDate(goal.tracking_started_at, locale)
        : (locale === 'zh-TW' ? '不限起算日' : 'No start limit'),
      canComplete: percent >= 100,
    }
  }

  const previousGoal = () => {
    if (activeGoals.length <= 1) return
    setActiveGoalIndex((currentIndex) =>
      currentIndex === 0 ? activeGoals.length - 1 : currentIndex - 1
    )
  }

  const nextGoal = () => {
    if (activeGoals.length <= 1) return
    setActiveGoalIndex((currentIndex) =>
      currentIndex === activeGoals.length - 1 ? 0 : currentIndex + 1
    )
  }

  const activeGoal = activeGoals[activeGoalIndex] || null
  const activeGoalSummary = activeGoal ? getGoalSummary(activeGoal) : null
  const renderLegacyRewardsLayout = false
  const dashboardTabs: Array<{ id: RewardDashboardTab; label: string; icon: string; count: number }> = [
    { id: 'goals', label: locale === 'zh-TW' ? '大型目標' : 'Goals', icon: 'flag', count: activeGoals.length },
    { id: 'shop', label: locale === 'zh-TW' ? '兌換商店' : 'Store', icon: 'storefront', count: activeExchangeRules.length },
    { id: 'records', label: locale === 'zh-TW' ? '最近紀錄' : 'Recent', icon: 'history', count: recentRecordItems.length },
  ]

  return (
    <>
      <div className="space-y-5">
        <section>
          <div className="flex flex-col gap-4 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
            <div className="flex items-start gap-3">
              <span className="material-icons-outlined flex-shrink-0 text-3xl text-blue-600 drop-shadow-sm">
                stars
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">
                  {locale === 'zh-TW' ? '獎勵管理' : 'Reward Management'}
                </h1>
                <p className="text-sm text-slate-500">
                  {studentName
                    ? (locale === 'zh-TW'
                      ? `查看${studentName}的獎勵餘額與目標進度`
                      : `View ${studentName}'s rewards and goal progress`)
                    : (locale === 'zh-TW' ? '查看獎勵餘額與目標進度' : 'View rewards and goal progress')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenAddReward}
                  className="student-toolbar-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-base font-bold transition-all hover:scale-105 active:scale-95"
                >
                  <span className="material-icons-outlined text-lg">add_circle</span>
                  {locale === 'zh-TW' ? '添加獎勵' : 'Add Reward'}
                </button>
              )}
              <a
                href={`/student/${studentId}/transactions`}
                className="student-toolbar-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-base font-bold transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-icons-outlined text-lg">receipt_long</span>
                {locale === 'zh-TW' ? '完整存摺' : 'Passbook'}
              </a>
              <StudentHomeNavButton className="hidden lg:inline-flex" />
            </div>
          </div>
        </section>

        <section>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-36 animate-pulse rounded-2xl bg-white/45 ring-1 ring-white/60"
                />
              ))}
            </div>
          ) : customTypes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {customTypes.map((type) => {
                const stats = rewardStats[type.id || ''] || { totalEarned: 0, currentBalance: 0 }
                const typeColor = type.color || '#5f94e8'

                return (
                  <button
                    key={type.id || type.type_key || type.display_name}
                    type="button"
                    onClick={() => type.id && handleOpenRewardDetail(type)}
                    disabled={!type.id}
                    className="reward-card-shadow min-h-36 rounded-2xl bg-white/68 p-4 text-left ring-1 ring-white/70 transition disabled:cursor-default disabled:opacity-70"
                  >
                    <div className="flex h-full flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 text-sm font-semibold text-slate-500">
                          <span className="mb-1 block text-lg" style={{ color: typeColor }}>
                            {type.icon || '⭐'}
                          </span>
                          <span className="block truncate">{type.display_name || type.type_key}</span>
                        </div>
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg"
                          style={{ backgroundColor: `${typeColor}18`, color: typeColor }}
                        >
                          {type.icon || '⭐'}
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-black leading-tight text-slate-900">
                          {stats.currentBalance.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-400">
                          {type.default_unit || (locale === 'zh-TW' ? '可用餘額' : 'Balance')}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/55 px-5 py-6 text-sm font-medium text-slate-500 ring-1 ring-white/65">
              {locale === 'zh-TW' ? '尚未設定獎勵類型。' : 'No reward types configured yet.'}
            </div>
          )}
        </section>

        <section>
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex min-w-max flex-nowrap items-center gap-1 rounded-full border border-white/40 bg-white/60 p-1.5 shadow-sm backdrop-blur-sm">
              {dashboardTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDashboardTab(tab.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-all duration-200 ${
                    activeDashboardTab === tab.id
                      ? 'bg-white font-bold text-slate-800 shadow-sm'
                      : 'font-medium text-slate-500 hover:bg-white/50'
                  }`}
                >
                  <span className="material-icons-outlined text-lg">{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {activeDashboardTab === 'goals' && (
              <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <span className="material-icons-outlined text-primary">flag</span>
                    {locale === 'zh-TW' ? '大型目標' : 'Major Goals'}
                  </h2>
                  {canManage && (
                    <a
                      href="/settings/rewards?tab=goalTemplates"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white/70 px-4 text-sm font-semibold text-primary shadow-sm ring-1 ring-white/80 transition hover:bg-white"
                    >
                      <span className="material-icons-outlined text-lg">person_add</span>
                      {locale === 'zh-TW' ? '指派目標' : 'Assign Goal'}
                    </a>
                  )}
                </div>

                {loading ? (
                  <div className="min-h-[520px] animate-pulse rounded-3xl bg-white/45 ring-1 ring-white/60" />
                ) : activeGoal && activeGoalSummary ? (
                  <>
                    {(() => {
                      const goalColor = activeGoal.color || '#5f94e8'
                      const coverImageUrl = getGoalCoverImage(activeGoal)
                      const hasCover = Boolean(coverImageUrl)
                      const goalBackgroundColor = withAlphaColor(goalColor, 0.3)
                      const cardTextClass = hasCover ? 'text-white' : 'text-slate-900'
                      const subtleTextClass = hasCover ? 'text-white/70' : 'text-slate-600'
                      const softTextClass = hasCover ? 'text-white/65' : 'text-slate-500'
                      const panelClass = hasCover
                        ? 'bg-white/18 text-white ring-white/25'
                        : 'bg-white/55 text-slate-900 ring-white/65'
                      const iconTextClass = hasCover ? 'text-white/60' : 'text-slate-500'
                      const ghostButtonClass = hasCover
                        ? 'bg-white/20 text-white ring-white/25 hover:bg-white/28'
                        : 'bg-white/60 text-slate-700 ring-white/70 hover:bg-white'

                      return (
                    <article
                      className="relative min-h-[520px] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5"
                      style={{
                        backgroundColor: hasCover ? '#0f172a' : goalBackgroundColor,
                        backgroundImage: hasCover
                          ? `linear-gradient(rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.5)), url("${coverImageUrl}")`
                          : undefined,
                        backgroundPosition: hasCover ? 'center' : undefined,
                        backgroundSize: hasCover ? 'cover' : undefined,
                        boxShadow: `0 20px 40px -12px ${goalColor}40`,
                      }}
                    >
                      <div className={`relative flex min-h-[520px] flex-col justify-between p-5 md:p-8 ${cardTextClass}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-lg ring-1 ring-white/30"
                              style={{ backgroundColor: hasCover ? 'rgba(255,255,255,0.25)' : withAlphaColor(goalColor, 0.2) }}
                            >
                              {activeGoal.icon || '🎯'}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${subtleTextClass}`}>
                                {locale === 'zh-TW' ? '大型目標' : 'Goal'} {activeGoalIndex + 1} / {activeGoals.length}
                              </p>
                              <h3 className="mt-1 truncate text-3xl font-black md:text-5xl">
                                {activeGoal.name}
                              </h3>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black backdrop-blur-sm ${
                            hasCover
                              ? (activeGoalSummary.canComplete
                                ? 'border-emerald-300/60 bg-emerald-400/20 text-emerald-100'
                                : 'border-blue-300/60 bg-blue-400/20 text-blue-100')
                              : 'border-white/60 bg-white/55 text-slate-700'
                          }`}>
                            {activeGoalSummary.canComplete
                              ? (locale === 'zh-TW' ? '可完成' : 'Ready')
                              : (locale === 'zh-TW' ? '進行中' : 'Active')}
                          </span>
                        </div>

                        <div className="max-w-2xl">
                          {activeGoal.description && (
                            <p className={`mb-5 text-base font-medium md:text-lg ${hasCover ? 'text-white/80' : 'text-slate-700'}`}>
                              {activeGoal.description}
                            </p>
                          )}
                          <div className={`rounded-3xl p-4 backdrop-blur-md ring-1 md:p-5 ${panelClass}`}>
                            <div className="mb-3 flex items-end justify-between gap-3">
                              <div>
                                <p className={`text-sm font-semibold ${softTextClass}`}>
                                  {locale === 'zh-TW' ? '目前進度' : 'Progress'}
                                </p>
                                <p className="mt-1 text-3xl font-black md:text-4xl">
                                  {activeGoalSummary.current.toLocaleString()}
                                  <span className={`mx-2 text-xl ${hasCover ? 'text-white/55' : 'text-slate-400'}`}>/</span>
                                  {activeGoalSummary.target.toLocaleString()}
                                  <span className={`ml-2 text-base font-bold ${subtleTextClass}`}>
                                    {activeGoalSummary.unit}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${softTextClass}`}>
                                  {locale === 'zh-TW' ? '達成率' : 'Rate'}
                                </p>
                                <p className="text-3xl font-black">{activeGoalSummary.percent}%</p>
                              </div>
                            </div>
                            <div className={`h-3 overflow-hidden rounded-full ${hasCover ? 'bg-white/24' : 'bg-white/65'}`}>
                              <div
                                className="progress-bar-fill h-full rounded-full"
                                style={{
                                  width: `${activeGoalSummary.percent}%`,
                                  backgroundColor: hasCover ? 'rgba(255,255,255,0.7)' : goalColor,
                                }}
                              />
                            </div>
                            <div className={`mt-4 grid gap-3 text-sm font-medium sm:grid-cols-3 ${hasCover ? 'text-white/78' : 'text-slate-600'}`}>
                              <span className="flex items-center gap-1.5">
                                <span className={`material-icons-outlined text-base ${iconTextClass}`}>category</span>
                                {activeGoalSummary.trackingLabel}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className={`material-icons-outlined text-base ${iconTextClass}`}>calendar_today</span>
                                {activeGoalSummary.startDate}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className={`material-icons-outlined text-base ${iconTextClass}`}>card_giftcard</span>
                                {activeGoalSummary.rewardLabel}
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleOpenCompleteGoal(activeGoal)}
                                disabled={!activeGoalSummary.canComplete}
                                className={`min-h-11 rounded-full px-5 text-sm font-black transition sm:min-w-40 ${
                                  activeGoalSummary.canComplete
                                    ? 'bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-300'
                                    : (hasCover
                                      ? 'cursor-not-allowed bg-white/24 text-white/58 ring-1 ring-white/25'
                                      : 'cursor-not-allowed bg-white/45 text-slate-500 ring-1 ring-white/60')
                                }`}
                              >
                                {activeGoalSummary.canComplete
                                  ? (locale === 'zh-TW' ? '完成目標' : 'Complete Goal')
                                  : (locale === 'zh-TW' ? '尚未達成' : 'Not Ready')}
                              </button>
                            )}
                            {activeGoalSummary.trackingType && (
                              <button
                                type="button"
                                onClick={() => activeGoalSummary.trackingType && handleOpenRewardDetail(activeGoalSummary.trackingType)}
                                className={`min-h-11 rounded-full px-5 text-sm font-bold backdrop-blur-md ring-1 transition ${ghostButtonClass}`}
                              >
                                {locale === 'zh-TW' ? '查看明細' : 'View Details'}
                              </button>
                            )}
                            {canManage && (
                              activeGoal.template_id ? (
                                <a
                                  href="/settings/rewards?tab=goalTemplates"
                                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold backdrop-blur-md ring-1 transition ${ghostButtonClass}`}
                                >
                                  {locale === 'zh-TW' ? '查看設定' : 'Settings'}
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEditLegacyGoal(activeGoal)}
                                  className={`min-h-11 rounded-full px-5 text-sm font-bold backdrop-blur-md ring-1 transition ${ghostButtonClass}`}
                                >
                                  {locale === 'zh-TW' ? '編輯/刪除' : 'Edit/Delete'}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                      )
                    })()}

                    <div className="mt-4 flex items-center gap-2">
                      {(() => {
                        const paginationColor = activeGoal.color || '#5f94e8'
                        return (
                      <>
                      <button
                        type="button"
                        onClick={previousGoal}
                        className="hidden shrink-0 md:flex"
                        style={{ color: paginationColor }}
                        aria-label={locale === 'zh-TW' ? '上一個大型目標' : 'Previous goal'}
                      >
                        <span className="material-icons-outlined text-xl">chevron_left</span>
                      </button>
                      <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto p-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {activeGoals.map((goal, index) => {
                          const summary = getGoalSummary(goal)

                          return (
                            <button
                              key={goal.id || goal.name}
                              type="button"
                              onClick={() => setActiveGoalIndex(index)}
                              className={`flex min-h-16 min-w-[190px] items-center gap-3 rounded-2xl px-4 text-left transition sm:min-w-[220px] ${
                                activeGoalIndex === index
                                  ? 'text-white shadow-sm ring-2 ring-white'
                                  : 'bg-white/55 text-slate-600 ring-1 ring-white/70 hover:bg-white/75'
                              }`}
                              style={activeGoalIndex === index ? { backgroundColor: goal.color || '#5f94e8' } : undefined}
                            >
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                                style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                              >
                                {goal.icon || '🎯'}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black">{goal.name}</span>
                                <span className="mt-0.5 block text-xs font-semibold opacity-70">
                                  {summary.percent}% {locale === 'zh-TW' ? '達成' : 'done'}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={nextGoal}
                        className="hidden shrink-0 md:flex"
                        style={{ color: paginationColor }}
                        aria-label={locale === 'zh-TW' ? '下一個大型目標' : 'Next goal'}
                      >
                        <span className="material-icons-outlined text-xl">chevron_right</span>
                      </button>
                      </>
                      )
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl bg-white/55 px-5 py-12 text-center ring-1 ring-white/65">
                    <span className="mb-3 block text-4xl">🎯</span>
                    <p className="text-sm font-medium text-slate-500">
                      {locale === 'zh-TW' ? '目前沒有指派中的大型目標。' : 'No active assigned goals yet.'}
                    </p>
                    {canManage && (
                      <a
                        href="/settings/rewards?tab=goalTemplates"
                        className="student-toolbar-primary mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition hover:scale-105 active:scale-95"
                      >
                        <span className="material-icons-outlined text-lg">person_add</span>
                        {locale === 'zh-TW' ? '前往指派' : 'Assign Now'}
                      </a>
                    )}
                  </div>
                )}

                {completedGoals.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                      <span className="material-icons-outlined text-base text-emerald-600">check_circle</span>
                      {locale === 'zh-TW' ? '已完成目標' : 'Completed Goals'}
                    </div>
                    <div className="space-y-2">
                      {completedGoals.map((goal) => {
                        const summary = getGoalSummary(goal)
                        const completedDate = goal.completed_at
                          ? formatTrackingStartDate(goal.completed_at, locale)
                          : ''

                        return (
                          <div
                            key={goal.id || goal.name}
                            className="flex flex-col gap-3 rounded-2xl bg-white/60 p-4 ring-1 ring-white/70 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg text-white"
                                style={{ backgroundColor: goal.color || '#5f94e8' }}
                              >
                                {goal.icon || '🎯'}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{goal.name}</p>
                                <p className="text-xs font-medium text-slate-500">
                                  {completedDate || (locale === 'zh-TW' ? '已完成' : 'Completed')} · {summary.rewardLabel}
                                </p>
                              </div>
                            </div>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleReactivateGoal(goal)}
                                className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/75 px-4 text-sm font-bold text-slate-600 ring-1 ring-white/80 transition hover:bg-white"
                              >
                                {locale === 'zh-TW' ? '重新啟用' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeDashboardTab === 'shop' && (
              <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <span className="material-icons-outlined text-primary">storefront</span>
                    {locale === 'zh-TW' ? '兌換商店' : 'Exchange Store'}
                  </h2>
                  {canManage && (
                    <button
                      type="button"
                      onClick={handleAddExchangeRule}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white/70 px-4 text-sm font-semibold text-primary shadow-sm ring-1 ring-white/80 transition hover:bg-white"
                    >
                      <span className="material-icons-outlined text-lg">add</span>
                      {locale === 'zh-TW' ? '新增兌換項' : 'Add Item'}
                    </button>
                  )}
                </div>

                {activeExchangeRules.length === 0 ? (
                  <div className="rounded-3xl bg-white/55 px-5 py-12 text-center ring-1 ring-white/65">
                    <span className="mb-3 block text-4xl">🎁</span>
                    <p className="text-sm font-medium text-slate-500">
                      {locale === 'zh-TW' ? '目前沒有可兌換項目。' : 'No active exchange items yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {activeExchangeRules.map((rule) => {
                      const requiredType = getRewardType(rule.required_reward_type_id)
                      if (!requiredType?.id) return null

                      const currentBalance = rewardStats[requiredType.id]?.currentBalance || 0
                      const canExchange = currentBalance >= rule.required_amount && Boolean(rule.id)
                      const rewardType = getRewardType(rule.reward_type_id)
                      const ruleName = rule.name || rule.reward_item || (locale === 'zh-TW' ? '兌換項目' : 'Exchange Item')
                      const typeColor = requiredType.color || '#5f94e8'

                      return (
                        <article
                          key={rule.id || ruleName}
                          className={`store-card flex min-h-48 flex-col rounded-2xl bg-white/66 p-4 ring-1 ring-white/70 ${
                            canExchange ? '' : 'opacity-75'
                          }`}
                        >
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg"
                              style={{ backgroundColor: `${typeColor}18`, color: typeColor }}
                            >
                              {requiredType.icon || '⭐'}
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                canExchange
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {canExchange
                                ? (locale === 'zh-TW' ? '可兌換' : 'Ready')
                                : (locale === 'zh-TW' ? '餘額不足' : 'Not Enough')}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900">{ruleName}</h3>
                          {rule.description && (
                            <p className="mt-2 text-sm text-slate-500">{rule.description}</p>
                          )}
                          <p className="mt-3 text-sm font-semibold text-primary">
                            {locale === 'zh-TW' ? '需要' : 'Cost'}: {formatRewardAmountWithUnit(rule.required_amount, requiredType, locale)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {locale === 'zh-TW' ? '目前' : 'Balance'}: {formatRewardAmountWithUnit(currentBalance, requiredType, locale)}
                          </p>
                          {rewardType && rule.reward_amount ? (
                            <p className="mt-1 text-xs font-semibold text-emerald-600">
                              {locale === 'zh-TW' ? '可獲得' : 'Receive'}: {formatRewardAmountWithUnit(rule.reward_amount, rewardType, locale)}
                            </p>
                          ) : null}
                          <div className="mt-auto flex gap-2 pt-4">
                            <button
                              type="button"
                              onClick={() => handleExchange(rule)}
                              disabled={!canExchange}
                              className={`min-h-10 flex-1 rounded-full px-4 text-sm font-bold transition ${
                                canExchange
                                  ? 'bg-white/75 text-primary ring-1 ring-white/90 hover:bg-white'
                                  : 'cursor-not-allowed bg-white/45 text-slate-400 ring-1 ring-white/70'
                              }`}
                            >
                              {locale === 'zh-TW' ? '兌換' : 'Exchange'}
                            </button>
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditExchangeRule(rule)}
                                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/75 text-slate-500 ring-1 ring-white/80 transition hover:bg-white hover:text-primary"
                                  aria-label={locale === 'zh-TW' ? '編輯兌換項' : 'Edit exchange item'}
                                >
                                  <span className="material-icons-outlined text-lg">edit</span>
                                </button>
                                {rule.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExchangeRule(rule.id!)}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/75 text-slate-500 ring-1 ring-white/80 transition hover:bg-white hover:text-red-500"
                                    aria-label={locale === 'zh-TW' ? '刪除兌換項' : 'Delete exchange item'}
                                  >
                                    <span className="material-icons-outlined text-lg">delete</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {activeDashboardTab === 'records' && (
              <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                    <span className="material-icons-outlined text-primary">history</span>
                    {locale === 'zh-TW' ? '最近獎勵紀錄' : 'Recent Records'}
                  </h2>
                  <a
                    href={`/student/${studentId}/transactions`}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white/70 px-4 text-sm font-semibold text-primary shadow-sm ring-1 ring-white/80 transition hover:bg-white"
                  >
                    {locale === 'zh-TW' ? '完整存摺' : 'Full Passbook'}
                    <span className="material-icons-outlined text-lg">arrow_forward</span>
                  </a>
                </div>

                {recentRecordItems.length === 0 ? (
                  <div className="rounded-3xl bg-white/55 px-5 py-12 text-center ring-1 ring-white/65">
                    <span className="mb-3 block text-4xl">🧾</span>
                    <p className="text-sm font-medium text-slate-500">
                      {locale === 'zh-TW' ? '目前沒有可顯示的最近紀錄。' : 'No recent records to show yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentRecordItems.map(({ goal, activity }) => {
                      const summary = getGoalSummary(goal)
                      const amountPrefix = activity.amount >= 0 ? '+' : ''
                      const dateLabel = formatTrackingStartDate(activity.created_at, locale)

                      return (
                        <div
                          key={`${goal.id || goal.name}-${activity.created_at}`}
                          className="flex gap-3 rounded-2xl bg-white/60 p-3 ring-1 ring-white/60"
                        >
                          <div
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: goal.color || '#5f94e8' }}
                          >
                            {goal.icon || '🎯'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <h3 className="truncate text-sm font-bold text-slate-800">
                                {activity.description || goal.name}
                              </h3>
                              <span className="shrink-0 text-sm font-black text-slate-800">
                                {amountPrefix}{activity.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                              <span>{dateLabel}</span>
                              <span className="rounded-full bg-white/70 px-2 py-0.5 font-semibold">
                                {summary.trackingLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </section>
      </div>

      {renderLegacyRewardsLayout && (
        <>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === 'zh-TW' ? '獎勵目標' : 'Reward Goals'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {locale === 'zh-TW'
              ? (canManage ? '管理學生的大型目標與兌換獎勵' : '查看大型目標與兌換獎勵')
              : (canManage ? 'Manage major goals and exchange rewards' : 'View major goals and exchange rewards')
            }
          </p>
        </div>
        <StudentHomeNavButton className="hidden lg:inline-flex" />
      </div>

      {/* 統計摘要列 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-label-md text-on-surface-variant mb-1">
            {locale === 'zh-TW' ? '進行中目標' : 'Active Goals'}
          </p>
          <p className="text-3xl font-black text-primary">
            {sortedGoals.filter(g => g.status !== 'completed').length}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-label-md text-on-surface-variant mb-1">
            {locale === 'zh-TW' ? '已完成' : 'Completed'}
          </p>
          <p className="text-3xl font-black text-emerald-600">
            {sortedGoals.filter(g => g.status === 'completed').length}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-label-md text-on-surface-variant mb-1">
            {locale === 'zh-TW' ? '總獎勵' : 'Total Rewards'}
          </p>
          <p className="text-3xl font-black text-amber-500">
            {(() => {
              const total = Object.values(rewardStats).reduce((sum, s) => sum + (s.currentBalance || 0), 0)
              return total.toLocaleString()
            })()}
          </p>
        </div>
      </div>

      {/* Section ①：獎勵餘額總覽 */}
      {customTypes.length > 0 && (
        <section className="mb-10">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="material-icons-outlined text-gray-400">account_balance_wallet</span>
                {locale === 'zh-TW' ? '獎勵總覽' : 'Reward Overview'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {locale === 'zh-TW' ? '目前累積的獎勵餘額' : 'Current accumulated reward balances'}
              </p>
            </div>
            <div className="flex gap-3">
              {canManage && (
                <>
                  <button
                    onClick={() => {
                      if (customTypes.length > 0) handleOpenUseReward(customTypes[0])
                    }}
                    className="bg-white border-2 border-gray-300 text-gray-600 px-5 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform text-sm shadow-sm"
                  >
                    <span className="material-icons-outlined text-[20px]">remove_circle</span>
                    {locale === 'zh-TW' ? '使用/扣除' : 'Use/Deduct'}
                  </button>
                  <button
                    onClick={handleOpenAddReward}
                    className="text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform text-sm shadow-md"
                    style={{ backgroundColor: '#5f94e8', boxShadow: '0 4px 12px rgba(95,148,232,0.3)' }}
                  >
                    <span className="material-icons-outlined text-[20px]">add_circle</span>
                    {locale === 'zh-TW' ? '快速增加' : 'Quick Add'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 5 欄獎勵餘額卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {customTypes.map((type) => {
              const stats = rewardStats[type.id || ''] || { totalEarned: 0, currentBalance: 0 }
              return (
                <div
                  key={type.id}
                  className="bg-white rounded-2xl shadow-sm border-t-4 flex flex-col items-center text-center p-5 cursor-pointer hover:shadow-md transition-shadow"
                  style={{
                    borderTopColor: type.color || '#6a99e0',
                    boxShadow: '0 8px 20px -6px rgba(106,153,224,0.08)'
                  }}
                  onClick={() => handleOpenRewardDetail(type)}
                >
                  <span className="text-[40px] mb-2">{type.icon || '🎁'}</span>
                  <span className="text-xs font-semibold text-gray-500 mb-1">
                    {type.display_name || type.type_key}
                  </span>
                  <div
                    className="text-3xl font-bold"
                    style={{ color: type.color || '#6a99e0' }}
                  >
                    {stats.currentBalance.toLocaleString()}
                  </div>
                  <span className="text-xs text-gray-400">{type.default_unit || ''}</span>
                </div>
              )
            })}
          </div>

        </section>
      )}

      {/* Section ②：進行中的目標（大型目標） */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-icons-outlined text-gray-400">flag</span>
            {locale === 'zh-TW' ? '進行中的目標' : 'Active Goals'}
          </h2>
          {canManage ? (
            <a
              href="/settings/rewards?tab=goalTemplates"
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <span className="material-icons-outlined text-sm">settings</span>
              {locale === 'zh-TW' ? '到設定頁指派' : 'Assign in Settings'}
            </a>
          ) : (
            <span className="text-xs font-medium text-gray-400">
              {sortedGoals.filter(g => g.status !== 'completed').length} {locale === 'zh-TW' ? '個目標' : 'Goals'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{locale === 'zh-TW' ? '載入中...' : 'Loading...'}</p>
          </div>
        ) : (() => {
          const activeGoals = sortedGoals.filter(g => g.status !== 'completed')
          if (activeGoals.length === 0) {
            return (
              <div className="text-center py-12 glass-card rounded-2xl">
                <span className="text-4xl mb-3 block">🎯</span>
                <p className="text-gray-500">
                  {locale === 'zh-TW' ? '尚無已指派的大型目標，請到設定頁指派學生' : 'No assigned goals yet. Assign goals from Settings.'}
                </p>
              </div>
            )
          }
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeGoals.map((goal, index) => {
                const progressValue = goal.current_progress || 0
                const targetValue = goal.tracking_mode === 'cumulative_amount'
                  ? (goal.target_amount || 1)
                  : (goal.target_count || 1)
                const progressPercent = Math.min(Math.round((progressValue / targetValue) * 100), 100)
                const canComplete = progressPercent >= 100
                const rt = customTypes.find(t => t.id === goal.reward_type_id)

                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow"
                    style={{ boxShadow: '0 8px 20px -6px rgba(106,153,224,0.08)' }}
                    data-goal-card
                    draggable={canManage}
                    onDragStart={canManage ? (e) => { handleDragStart(index); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', '') } : undefined}
                    onDragOver={canManage ? (e) => handleDragOver(e, index) : undefined}
                    onDragEnd={canManage ? handleDragEnd : undefined}
                  >
                    {/* 彩色頂邊 */}
                    <div className="h-2" style={{ backgroundColor: goal.color || '#6a99e0' }}></div>

                    <div className="p-5 flex-grow space-y-4">
                      {/* 標籤 + 更多選單 */}
                      <div className="flex justify-between items-start">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                          {locale === 'zh-TW' ? '大型目標' : 'Major Goal'}
                        </span>
                        {goal.template_id && (
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                            {locale === 'zh-TW' ? '設定指派' : 'Assigned'}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {canManage && (
                            goal.template_id ? (
                              <a
                                href="/settings/rewards?tab=goalTemplates"
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-400 hover:text-primary transition-colors"
                                title={locale === 'zh-TW' ? '到設定頁管理' : 'Manage in settings'}
                              >
                                <span className="material-icons-outlined text-lg">settings</span>
                              </a>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditLegacyGoal(goal) }}
                                className="text-gray-400 hover:text-primary transition-colors"
                                title={locale === 'zh-TW' ? '編輯或刪除舊目標' : 'Edit or delete legacy goal'}
                              >
                                <span className="material-icons-outlined text-lg">more_vert</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* 目標名稱 */}
                      <h3 className="text-lg font-bold text-gray-900">{goal.name}</h3>

                      {/* 進度顯示 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-gray-500">
                            {locale === 'zh-TW' ? '進度' : 'Progress'}：{progressValue.toLocaleString()} / {targetValue.toLocaleString()}
                            {goal.tracking_mode === 'completion_count' ? (locale === 'zh-TW' ? ' 次' : ' times') : ''}
                          </span>
                          <span style={{ color: goal.color || '#6a99e0' }}>{progressPercent}%</span>
                        </div>

                        {goal.tracking_mode === 'cumulative_amount' ? (
                          /* 進度條模式 */
                          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(progressPercent, 100)}%`,
                                background: `linear-gradient(90deg, ${goal.color || '#6a99e0'}, ${goal.color || '#6a99e0'}88)`
                              }}
                            ></div>
                          </div>
                        ) : (
                          /* 圓點模式 */
                          <div className="flex gap-1.5 flex-wrap">
                            {Array.from({ length: Math.min(targetValue, 10) }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  i < progressValue
                                    ? 'text-white'
                                    : 'bg-gray-200 text-gray-400'
                                }`}
                                style={i < progressValue ? { backgroundColor: goal.color || '#6a99e0' } : {}}
                              >
                                {i < progressValue ? '✓' : '○'}
                              </div>
                            ))}
                            {targetValue > 10 && (
                              <span className="text-xs text-gray-400 self-center ml-1">
                                +{targetValue - 10}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 追蹤條件 + 達成獎勵 */}
                      <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                        {goal.tracking_mode === 'cumulative_amount' ? (
                          (() => {
                            const trackingType = customTypes.find(t =>
                              t.id === (goal.tracking_reward_type_id || goal.reward_type_id)
                            )
                            return trackingType ? (
                              <div className="flex items-center gap-1">
                                <span>{trackingType.icon || '🎁'}</span>
                                <span>{locale === 'zh-TW' ? '追蹤累積' : 'Tracking'} {trackingType.display_name}</span>
                              </div>
                            ) : null
                          })()
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>✅</span>
                            <span>
                              {goal.linked_event_ids?.length
                                ? achievementEvents.filter(e => goal.linked_event_ids?.includes(e.id)).map(e => e.name).join(', ')
                                : (locale === 'zh-TW' ? '所有優良事件' : 'All events')}
                            </span>
                          </div>
                        )}
                        {goal.tracking_started_at && (
                          <div className="flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">calendar_today</span>
                            <span>
                              {locale === 'zh-TW' ? '起算' : 'Since'} {formatTrackingStartDate(goal.tracking_started_at, locale)}
                            </span>
                          </div>
                        )}
                        {rt && (
                          <div className="flex items-center gap-1" style={{ color: goal.color }}>
                            <span>🎁</span>
                            <span className="font-semibold">
                              {locale === 'zh-TW' ? '達成獎勵' : 'Reward'}：+{goal.reward_on_complete} {rt.display_name || rt.type_key}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 最近活動記錄 */}
                      {goal.id && recentActivities[goal.id] && (
                        <div className="p-2 bg-gray-50 rounded-lg italic text-xs text-gray-500">
                          {`"${recentActivities[goal.id]?.description} +${recentActivities[goal.id]?.amount}"`}
                          {' · '}
                          {(() => {
                            const date = new Date(recentActivities[goal.id]?.created_at || '')
                            const now = new Date()
                            const diffMs = now.getTime() - date.getTime()
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                            if (diffDays === 0) return locale === 'zh-TW' ? '今天' : 'Today'
                            if (diffDays === 1) return locale === 'zh-TW' ? '昨天' : 'Yesterday'
                            if (diffDays < 7) return `${diffDays}${locale === 'zh-TW' ? '天前' : 'd ago'}`
                            return date.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US')
                          })()}
                        </div>
                      )}
                    </div>

                    {/* 底部操作按鈕 */}
                    <div className="p-4 bg-gray-50/50 grid grid-cols-2 gap-2 border-t border-gray-100">
                      {canManage && canComplete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenCompleteGoal(goal) }}
                          className="col-span-2 py-2.5 rounded-lg font-bold text-sm text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: goal.color || '#6a99e0' }}
                        >
                          {locale === 'zh-TW' ? '標記完成' : 'Mark Complete'}
                        </button>
                      )}
                      {canManage && !canComplete && (
                        <>
                          {goal.template_id ? (
                            <a
                              href="/settings/rewards?tab=goalTemplates"
                              onClick={(e) => e.stopPropagation()}
                              className="bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity text-center"
                            >
                              {locale === 'zh-TW' ? '設定' : 'Settings'}
                            </a>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditLegacyGoal(goal) }}
                              className="bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                            >
                              {locale === 'zh-TW' ? '編輯/刪除' : 'Edit/Delete'}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (customTypes[0]) handleOpenRewardDetail(customTypes[0])
                            }}
                            disabled={!customTypes[0]}
                            className="bg-white border border-gray-200 py-2 rounded-lg font-bold text-sm text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {locale === 'zh-TW' ? '詳情' : 'Details'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </section>

      {/* Section ③：獎勵商店（可兌換獎勵） */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-icons-outlined text-gray-400">storefront</span>
            {locale === 'zh-TW' ? '獎勵商店' : 'Reward Store'}
          </h2>
          {canManage && (
            <button
              onClick={handleAddExchangeRule}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <span className="material-icons-outlined text-sm">add</span>
              {locale === 'zh-TW' ? '新增兌換規則' : 'Add Exchange Rule'}
            </button>
          )}
        </div>

        {exchangeRules.filter(r => r.is_active).length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl">
            <span className="text-4xl mb-3 block">🎁</span>
            <p className="text-gray-500">
              {locale === 'zh-TW' ? '尚無可兌換的獎勵' : 'No exchangeable rewards yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exchangeRules.filter(r => r.is_active).map((rule) => {
              const requiredType = customTypes.find(t => t.id === rule.required_reward_type_id)
              if (!requiredType || !requiredType.id) return null

              const currentBalance = rewardStats[requiredType.id]?.currentBalance || 0
              const canExchange = currentBalance >= rule.required_amount
              const ruleName = rule.name || ''
              const ruleDescription = rule.description || ''

              return (
                <div
                  key={rule.id}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col ${
                    !canExchange ? 'opacity-85' : ''
                  }`}
                  style={{ boxShadow: '0 8px 20px -6px rgba(106,153,224,0.08)' }}
                >
                  {/* 商品圖示區 */}
                  <div className="relative h-40 flex items-center justify-center"
                       style={{ backgroundColor: `${requiredType.color || '#6a99e0'}15` }}>
                    <span className="text-[56px]">{requiredType.icon || '🎁'}</span>
                    {/* 價格標籤 */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 font-bold shadow-sm"
                         style={{ color: requiredType.color || '#6a99e0' }}>
                      <span>{requiredType.icon || '⭐'}</span>
                      {rule.required_amount.toLocaleString()}
                    </div>
                  </div>

                  {/* 商品資訊 */}
                  <div className="p-5 space-y-4 flex-grow">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{ruleName}</h3>
                      {ruleDescription && (
                        <p className="text-sm text-gray-500">{ruleDescription}</p>
                      )}
                    </div>

                    {/* 狀態標籤 */}
                    <div className="flex items-center gap-2">
                      {canExchange ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                          ✅ {locale === 'zh-TW' ? '可兌換' : 'Redeemable'}
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                          ⚠️ {locale === 'zh-TW'
                            ? `還差 ${(rule.required_amount - currentBalance).toLocaleString()} ${requiredType.icon || ''}`
                            : `Need ${(rule.required_amount - currentBalance).toLocaleString()} more`}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400">
                      {locale === 'zh-TW' ? '目前持有：' : 'Current: '}
                      <span className="font-semibold" style={{ color: requiredType.color }}>
                        {currentBalance.toLocaleString()} {requiredType.icon || ''}
                      </span>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleExchange(rule)}
                        disabled={!canExchange}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-opacity ${
                          canExchange
                            ? 'text-white hover:opacity-90'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        style={canExchange ? { backgroundColor: requiredType.color || '#6a99e0' } : {}}
                      >
                        {locale === 'zh-TW' ? '現在兌換' : 'Redeem Now'}
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleEditExchangeRule(rule)}
                            className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-colors"
                          >
                            <span className="material-icons-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => rule.id && handleDeleteExchangeRule(rule.id)}
                            className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <span className="material-icons-outlined text-lg">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section ④：已完成的目標（可折疊） */}
      {(() => {
        const completedGoals = sortedGoals.filter(g => g.status === 'completed')
        if (completedGoals.length === 0) return null
        return (
          <section className="mb-10 bg-gray-50/80 rounded-3xl p-6">
            <details className="group" open>
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <div className="flex items-center gap-3">
                  <span className="material-icons-outlined text-green-600 bg-green-100 p-2 rounded-full">check_circle</span>
                  <h2 className="text-xl font-bold text-gray-900">
                    {locale === 'zh-TW' ? '已完成的目標' : 'Completed Goals'}
                  </h2>
                </div>
                <span className="material-icons-outlined group-open:rotate-180 transition-transform text-gray-400">expand_more</span>
              </summary>
              <div className="mt-5 space-y-3">
                {completedGoals.map((goal) => {
                  const completedDate = goal.completed_at
                    ? new Date(goal.completed_at).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US')
                    : ''
                  const rt = customTypes.find(t => t.id === goal.reward_type_id)
                  return (
                    <div key={goal.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full" style={{ backgroundColor: `${goal.color || '#6a99e0'}20` }}>
                          <span className="text-2xl">{goal.icon || '🎯'}</span>
                        </div>
                        <div>
                          <p className="font-bold text-lg text-gray-900">{goal.name}</p>
                          {completedDate && (
                            <p className="text-sm text-gray-400">
                              {locale === 'zh-TW' ? '達成日期：' : 'Completed: '}{completedDate}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {rt && (
                            <p className="font-bold text-lg" style={{ color: goal.color || '#6a99e0' }}>
                              +{goal.reward_on_complete} {rt.icon}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {locale === 'zh-TW' ? '已發放' : 'Awarded'}
                          </p>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleReactivateGoal(goal)}
                            className="px-3 py-1.5 text-sm font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            {locale === 'zh-TW' ? '重新啟用' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </details>
          </section>
        )
      })()}

      {/* 错误提示 */}
        </>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-xl shadow-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError('')}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
          >
            <span className="material-icons-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* 還原 Toast */}
      {undoGoalId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-4 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-green-400 text-lg">check_circle</span>
              <span className="text-sm font-medium">
                {locale === 'zh-TW'
                  ? `「${undoGoalName}」已標記完成`
                  : `"${undoGoalName}" marked complete`}
              </span>
            </div>
            <button
              onClick={handleUndoComplete}
              disabled={undoing}
              className="px-4 py-1.5 text-sm font-bold rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {undoing
                ? (locale === 'zh-TW' ? '還原中...' : 'Undoing...')
                : (locale === 'zh-TW' ? '還原' : 'Undo')}
            </button>
            <button
              onClick={() => { setUndoGoalId(null); setUndoGoalName('') }}
              className="text-white/60 hover:text-white/90 transition-colors"
            >
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      {/* 大型目標管理彈窗 */}
      <GoalPopup
        isOpen={showGoalPopup}
        onClose={() => {
          setShowGoalPopup(false)
          setEditingGoal(null)
        }}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        editingGoal={editingGoal}
        rewardTypes={customTypes.filter((type): type is CustomRewardType & { id: string } => Boolean(type.id)).map(t => ({
          id: t.id!,
          type_key: t.type_key || '',
          display_name: t.display_name,
          icon: t.icon,
          color: t.color,
          default_unit: t.default_unit
        }))}
      />
      {/* 標記完成彈窗 */}
      {completingGoal && (
        <CompleteGoalPopup
          isOpen={showCompletePopup}
          onClose={() => {
            setShowCompletePopup(false)
            setCompletingGoal(null)
          }}
          onComplete={handleCompleteGoal}
          goal={{
            name: completingGoal.name,
            icon: completingGoal.icon,
            color: completingGoal.color,
            progress_percent: Math.round(
              ((completingGoal.current_progress || 0) /
                (completingGoal.tracking_mode === 'cumulative_amount'
                  ? (completingGoal.target_amount || 1)
                  : (completingGoal.target_count || 1))) * 100
            ),
          }}
          goalId={completingGoal.id || ''}
        />
      )}
      {/* 兌換規則管理彈窗 */}
      <ExchangeRulePopup
        isOpen={showExchangeRulePopup}
        onClose={() => {
          setShowExchangeRulePopup(false)
          setEditingExchangeRule(null)
        }}
        onSave={handleSaveExchangeRule}
        onDelete={handleDeleteExchangeRule}
        editingRule={editingExchangeRule}
        rewardTypes={customTypes.filter((type): type is CustomRewardType & { id: string } => Boolean(type.id))}
      />
      {/* 獎勵詳情彈窗 */}
      {selectedRewardType && selectedRewardType.id && (
        <RewardDetailModal
          isOpen={showRewardDetailModal}
          onClose={() => {
            setShowRewardDetailModal(false)
            setSelectedRewardType(null)
          }}
          rewardType={selectedRewardType}
          studentId={studentId}
          currentBalance={rewardStats[selectedRewardType.id]?.currentBalance || 0}
          totalEarned={rewardStats[selectedRewardType.id]?.totalEarned || 0}
          rewardTypes={customTypes}
          exchangeRules={exchangeRules.filter((rule): rule is ExchangeRule & { id: string } => Boolean(rule.id) && rule.is_active)}
          onExchange={handleExchangeFromDetail}
          onUse={() => {
            // 從詳情彈窗使用時，打開使用彈窗
            handleOpenUseReward(selectedRewardType)
          }}
          onAdd={canManage ? handleOpenAddReward : undefined}
        />
      )}
      {/* 使用獎勵彈窗 */}
      {useRewardType && useRewardType.id && (
        <UseRewardPopup
          isOpen={showUseRewardPopup}
          onClose={() => {
            setShowUseRewardPopup(false)
            setUseRewardType(null)
          }}
          rewardType={useRewardType}
          currentBalance={rewardStats[useRewardType.id]?.currentBalance || 0}
          exchangeRules={exchangeRules.filter(r => r.is_active)}
          rewardTypes={customTypes}
          onUse={handleUseReward}
          onExchange={handleExchangeFromDetail}
        />
      )}
      {/* 添加獎勵彈窗 */}
      <AddRewardPopup
        isOpen={showAddRewardPopup}
        onClose={() => {
          setShowAddRewardPopup(false)
        }}
        studentId={studentId}
        rewardTypes={customTypes}
        achievementEvents={achievementEvents}
        onAdd={handleAddReward}
      />

      {/* 桌面端 FAB */}
      <div className="fixed bottom-8 right-8 hidden md:block z-40">
        <button
          onClick={handleOpenAddReward}
          className="text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          style={{ backgroundColor: '#5f94e8', boxShadow: '0 6px 20px rgba(95,148,232,0.35)' }}
          title={locale === 'zh-TW' ? '快速增加獎勵' : 'Quick Add Reward'}
        >
          <span className="material-icons-outlined text-[32px]">add</span>
        </button>
      </div>

      {/* 行動端底部導覽列 */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-white/90 backdrop-blur-md md:hidden rounded-t-xl shadow-lg border-t border-white/50">
        <a href={`/student/${studentId}`} className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full transition-all">
          <span className="material-icons-outlined">home</span>
          <span className="text-label-md">{locale === 'zh-TW' ? '首頁' : 'Home'}</span>
        </a>
        <a href={`/student/${studentId}/transactions`} className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full transition-all">
          <span className="material-icons-outlined">account_balance_wallet</span>
          <span className="text-label-md">{locale === 'zh-TW' ? '存摺' : 'Wallet'}</span>
        </a>
        <div className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-2 scale-105">
          <span className="material-icons-outlined fill">emoji_events</span>
          <span className="text-label-md font-bold">{locale === 'zh-TW' ? '獎勵' : 'Rewards'}</span>
        </div>
        <a href={`/student/${studentId}/subjects`} className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full transition-all">
          <span className="material-icons-outlined">storefront</span>
          <span className="text-label-md">{locale === 'zh-TW' ? '商店' : 'Store'}</span>
        </a>
        <a href={`/student/${studentId}/settings`} className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:bg-surface-container-high rounded-full transition-all">
          <span className="material-icons-outlined">settings</span>
          <span className="text-label-md">{locale === 'zh-TW' ? '設定' : 'Settings'}</span>
        </a>
      </nav>
    </>
  )
}
