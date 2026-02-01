'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import RewardTypePopup from './RewardTypePopup'
import ExchangeRulePopup from './ExchangeRulePopup'
import RewardDetailModal from './RewardDetailModal'
import UseRewardPopup from './UseRewardPopup'
import AddRewardPopup from './AddRewardPopup'
import { isParent } from '@/lib/utils/userRole'

interface Student {
  id: string
  name: string
  avatar_url: string | null
}

interface CustomRewardType {
  id?: string
  type_key: string
  display_name: string
  display_name_zh?: string
  display_name_en?: string
  icon: string
  color: string
  default_unit: string | null
  is_accumulable: boolean
  has_extra_input: boolean
  extra_input_schema: any
  is_system?: boolean
}

interface ExchangeRule {
  id?: string
  name_zh: string
  name_en?: string
  description_zh?: string
  description_en?: string
  required_reward_type_id: string
  required_amount: number
  reward_type_id?: string
  reward_amount?: number
  reward_item?: string
  is_active: boolean
  display_order: number
}

interface Props {
  studentId: string
  student: any
  avatar: { emoji: string; gradientStyle: string }
  allStudents: Student[]
}

export default function RewardsPageClient({ 
  studentId, 
  student, 
  avatar, 
  allStudents 
}: Props) {
  const t = useTranslations('studentRewardManager')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const [customTypes, setCustomTypes] = useState<CustomRewardType[]>([])
  const [sortedTypes, setSortedTypes] = useState<CustomRewardType[]>([])
  const [exchangeRules, setExchangeRules] = useState<ExchangeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [editingType, setEditingType] = useState<CustomRewardType | null>(null)
  const [showExchangeRulePopup, setShowExchangeRulePopup] = useState(false)
  const [editingExchangeRule, setEditingExchangeRule] = useState<ExchangeRule | null>(null)
  const [showRewardDetailModal, setShowRewardDetailModal] = useState(false)
  const [selectedRewardType, setSelectedRewardType] = useState<CustomRewardType | null>(null)
  const [showUseRewardPopup, setShowUseRewardPopup] = useState(false)
  const [useRewardType, setUseRewardType] = useState<CustomRewardType | null>(null)
  const [showAddRewardPopup, setShowAddRewardPopup] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hasReordered, setHasReordered] = useState(false)
  const [rewardStats, setRewardStats] = useState<Record<string, { totalEarned: number; currentBalance: number }>>({})
  
  // 判斷是否為家長（可以管理）
  const canManage = isParent()

  // 載入自訂義獎勵類型
  const loadCustomTypes = async () => {
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
        setSortedTypes(data.types || [])
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
  }

  // 載入獎勵統計
  const loadRewardStats = async () => {
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
  }

  // 載入兌換規則
  const loadExchangeRules = async () => {
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
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      await Promise.all([loadCustomTypes(), loadExchangeRules()])
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (customTypes.length > 0) {
      loadRewardStats()
    }
  }, [customTypes])

  const getIconByType = (typeKey: string): string => {
    const iconMap: Record<string, string> = {
      points: '⭐',
      money: '💰',
      hearts: '❤️',
      diamonds: '💎',
      gametime: '🎮'
    }
    return iconMap[typeKey] || '🎁'
  }
  
  // 判断是否为 emoji
  const isEmojiIcon = (icon: string): boolean => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) || 
           icon.length <= 2 || 
           !/^[a-z_]+$/i.test(icon)
  }

  const getColorByType = (typeKey: string, customColor?: string) => {
    // 如果有自定义颜色，使用自定义颜色
    if (customColor) {
      const colorMap: Record<string, { bg: string; text: string; border: string }> = {
        '#3b82f6': { bg: 'bg-blue-100', text: 'text-blue-500', border: 'border-l-blue-400' },
        '#8b5cf6': { bg: 'bg-purple-100', text: 'text-purple-500', border: 'border-l-purple-400' },
        '#ec4899': { bg: 'bg-pink-100', text: 'text-pink-500', border: 'border-l-pink-400' },
        '#f97316': { bg: 'bg-orange-100', text: 'text-orange-500', border: 'border-l-orange-400' },
        '#10b981': { bg: 'bg-green-100', text: 'text-green-500', border: 'border-l-green-400' },
        '#fbbf24': { bg: 'bg-yellow-100', text: 'text-yellow-500', border: 'border-l-yellow-400' }
      }
      return colorMap[customColor] || colorMap['#3b82f6']
    }

    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      points: {
        bg: 'bg-blue-100',
        text: 'text-blue-500',
        border: 'border-l-blue-400'
      },
      diamonds: {
        bg: 'bg-purple-100',
        text: 'text-purple-500',
        border: 'border-l-purple-400'
      },
      hearts: {
        bg: 'bg-pink-100',
        text: 'text-pink-500',
        border: 'border-l-pink-400'
      },
      gametime: {
        bg: 'bg-green-100',
        text: 'text-green-500',
        border: 'border-l-green-400'
      }
    }
    return colorMap[typeKey] || colorMap.points
  }

  // 保存奖励类型（新增或更新）
  const handleSaveRewardType = async (type: CustomRewardType) => {
    try {
      if (type.id) {
        // 更新 - 排除 id 和 type_key（编辑时 type_key 不可修改）
        const { id, type_key, ...updateData } = type
        const response = await fetch('/api/custom-reward-types/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updateData })
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || (locale === 'zh-TW' ? '更新失敗' : 'Update failed'))
        }
      } else {
        // 新增
        const response = await fetch('/api/custom-reward-types/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(type)
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || (locale === 'zh-TW' ? '創建失敗' : 'Create failed'))
        }
      }
      await loadCustomTypes()
      await loadRewardStats()
      setShowPopup(false)
      setEditingType(null)
    } catch (err) {
      throw err
    }
  }

  // 删除奖励类型
  const handleDeleteRewardType = async (typeId: string, isSystem?: boolean) => {
    if (isSystem) {
      setError(locale === 'zh-TW' ? '系统预设类型不可删除' : 'System preset types cannot be deleted')
      return
    }

    if (!confirm(locale === 'zh-TW' ? '確定要刪除這個獎勵類型嗎？' : 'Are you sure you want to delete this reward type?')) {
      return
    }

    try {
      const response = await fetch('/api/custom-reward-types/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_id: typeId })
      })

      if (response.ok) {
        await loadCustomTypes()
        await loadRewardStats()
        setError('')
      } else {
        const data = await response.json()
        setError(data.error || (locale === 'zh-TW' ? '刪除失敗' : 'Delete failed'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '發生錯誤' : 'An error occurred'))
    }
  }

  // 打开新增弹窗
  const handleAddNew = () => {
    setEditingType(null)
    setShowPopup(true)
  }

  // 打开编辑弹窗
  const handleEdit = (type: CustomRewardType) => {
    setEditingType(type)
    setShowPopup(true)
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
      const typeName = locale === 'zh-TW' 
        ? (requiredType.display_name_zh || requiredType.display_name || requiredType.type_key)
        : (requiredType.display_name_en || requiredType.display_name || requiredType.type_key)
      setError(locale === 'zh-TW' 
        ? `餘額不足，需要 ${rule.required_amount} ${typeName}，目前只有 ${currentBalance}` 
        : `Insufficient balance. Need ${rule.required_amount} ${typeName}, but only have ${currentBalance}`
      )
      return
    }

    // 確認兌換
    const ruleName = locale === 'zh-TW' 
      ? (rule.name_zh || rule.name_en || '')
      : (rule.name_en || rule.name_zh || '')
    const typeName = locale === 'zh-TW' 
      ? (requiredType.display_name_zh || requiredType.display_name || requiredType.type_key)
      : (requiredType.display_name_en || requiredType.display_name || requiredType.type_key)
    
    if (!confirm(locale === 'zh-TW' 
      ? `確定要用 ${rule.required_amount} ${typeName} 兌換「${ruleName}」嗎？` 
      : `Are you sure you want to exchange ${rule.required_amount} ${typeName} for "${ruleName}"?`
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
    const cards = document.querySelectorAll('[data-reward-type-card]')
    cards.forEach(card => {
      card.classList.add('dragging')
    })
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canManage) return
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newTypes = [...sortedTypes]
    const draggedItem = newTypes[draggedIndex]
    newTypes.splice(draggedIndex, 1)
    newTypes.splice(index, 0, draggedItem)
    setSortedTypes(newTypes)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (!canManage) return
    setDraggedIndex(null)
    document.body.style.cursor = 'default'

    // 移除動畫類
    const cards = document.querySelectorAll('[data-reward-type-card]')
    cards.forEach(card => {
      card.classList.remove('dragging')
    })

    // 如果順序有改變，自動保存
    if (hasReordered) {
      try {
        const rewardTypeOrders = sortedTypes
          .filter(type => type.id) // 只包含有 id 的類型
          .map((type, index) => ({
            id: type.id!,
            display_order: index
          }))

        const response = await fetch('/api/custom-reward-types/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rewardTypeOrders })
        })

        if (response.ok) {
          setHasReordered(false)
          await loadCustomTypes()
          await loadRewardStats()
        } else {
          console.error('Failed to save order')
          // 恢復原順序
          setSortedTypes([...customTypes])
          setHasReordered(false)
        }
      } catch (error) {
        console.error('Failed to save order:', error)
        // 恢復原順序
        setSortedTypes([...customTypes])
        setHasReordered(false)
      }
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="material-icons-outlined text-3xl text-primary">card_giftcard</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {locale === 'zh-TW' ? '獎勵統計與兌換' : 'Reward Statistics & Exchange'}
            </h1>
            <p className="text-sm text-gray-600">
              {locale === 'zh-TW' 
                ? (canManage ? '管理獎勵類型、查看統計並設定兌換規則' : '查看獎勵統計並兌換獎勵')
                : (canManage ? 'Manage reward types, view statistics and set exchange rules' : 'View reward statistics and exchange rewards')
              }
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* 添加獎勵按鈕 - 僅家長可見，放在首頁按鈕左邊 */}
          {canManage && (
            <button
              onClick={handleOpenAddReward}
              className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-lg shadow-green-500/20 transition-all cursor-pointer items-center justify-center gap-2"
              title={locale === 'zh-TW' ? '添加獎勵' : 'Add Reward'}
            >
              <span className="material-icons-outlined text-lg">card_giftcard</span>
              <span className="text-sm font-medium whitespace-nowrap">
                {locale === 'zh-TW' ? '添加獎勵事件' : 'Add Reward Event'}
              </span>
            </button>
          )}
          <button
            onClick={() => window.location.href = '/'}
            className="hidden md:flex bg-primary hover:bg-opacity-90 text-white p-2 rounded-full shadow-lg shadow-indigo-500/20 transition-all cursor-pointer items-center justify-center w-10 h-10 hover:scale-105 active:scale-95"
          >
            <span className="material-icons-outlined text-lg">home</span>
          </button>
        </div>
      </div>

      {/* 現有獎勵類型 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400">category</span>
            {locale === 'zh-TW' ? '現有獎勵類型' : 'Existing Reward Types'}
          </h2>
          {/* 只有家長可以看到新增按鈕 */}
          {canManage ? (
            <button
              onClick={handleAddNew}
              className="text-primary text-sm font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-icons-outlined text-sm">add</span>
              {locale === 'zh-TW' ? '添加獎勵類型' : 'Add Reward Type'}
            </button>
          ) : (
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              {customTypes.length} {locale === 'zh-TW' ? '個已啟動' : 'Active'}
            </span>
          )}
        </div>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{locale === 'zh-TW' ? '載入中...' : 'Loading...'}</p>
          </div>
        ) : customTypes.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-xl">
            <p className="text-gray-500">{locale === 'zh-TW' ? '尚無獎勵類型，請新增' : 'No reward types yet, please add one'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTypes.map((type, index) => {
                const colors = getColorByType(type.type_key, type.color)
                const iconName = type.icon || getIconByType(type.type_key)
                const description = type.extra_input_schema?.description || (locale === 'zh-TW' ? '日常作業與小考獲得' : 'Earned from homework and quizzes')
                const currentBalance = type.id ? (rewardStats[type.id]?.currentBalance || 0) : 0
                return (
                  <div
                    key={type.id}
                    className="relative group"
                    data-reward-type-card
                    onDragOver={canManage ? (e) => {
                      handleDragOver(e, index)
                    } : undefined}
                  >
                    {/* 卡片 */}
                    <div
                      className={`bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group hover:shadow-xl transition-shadow relative p-5 pb-0 ${
                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                      }`}
                      onClick={() => handleOpenRewardDetail(type)}
                    >
                      {/* 頂部：拖曳和編輯按鈕 */}
                      <div className="flex justify-between items-center mb-3 px-1 text-slate-300">
                        {/* 拖曳按鈕 - 左邊（僅家長可見） */}
                        {canManage && (
                          <div 
                            data-drag-handle
                            draggable
                            onDragStart={(e) => {
                              handleDragStart(index)
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/html', '')
                            }}
                            onDragEnd={handleDragEnd}
                            className="cursor-move cursor-grab active:cursor-grabbing"
                          >
                            <span className="material-icons-outlined text-xl">drag_indicator</span>
                          </div>
                        )}
                        {!canManage && <div></div>}
                        {/* 編輯按鈕 - 右邊（僅家長可見） */}
                        {canManage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(type)
                            }}
                            className="w-9 h-9 rounded-2xl bg-slate-100/50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                          >
                            <span className="material-icons-outlined text-lg">edit</span>
                          </button>
                        )}
                      </div>
                      
                      {/* 內容區域 */}
                      <div className="flex flex-col items-center flex-grow mb-6">
                        {/* Icon */}
                        <div 
                          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                          style={{ 
                            backgroundColor: `${type.color}20`
                          }}
                        >
                          {isEmojiIcon(iconName) ? (
                            <span className="text-4xl">{iconName}</span>
                          ) : (
                            <span className="material-icons-outlined text-4xl" style={{ color: type.color }}>{iconName}</span>
                          )}
                        </div>
                        
                        {/* 標題 */}
                        <h4 className="font-bold text-lg mb-2 text-gray-900">
                          {type.display_name}
                        </h4>
                        
                        {/* 描述 */}
                        <p className="text-xs text-slate-400 text-center px-4 mb-4">
                          {description}
                        </p>
                        
                        {/* 現有量 */}
                        <div 
                          className="mt-4 rounded-2xl py-4 px-10 text-center border"
                          style={{
                            backgroundColor: `${type.color}08`,
                            borderColor: `${type.color}20`
                          }}
                        >
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                            {locale === 'zh-TW' ? '現有量' : 'Current'}
                          </p>
                          <span className="font-bold text-3xl" style={{ color: type.color }}>
                            {currentBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* 底部使用按鈕 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenUseReward(type)
                        }}
                        className="w-full py-4 font-bold text-sm hover:opacity-90 transition-colors rounded-full mb-5 shadow-sm cursor-pointer"
                        style={{
                          backgroundColor: type.color,
                          color: 'white'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${type.color}DD`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = type.color
                        }}
                      >
                        {locale === 'zh-TW' ? `使用 (${type.display_name})` : `Use (${type.display_name})`}
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>

          {/* 可兌換獎勵 */}
          <section className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">rule</span>
                {locale === 'zh-TW' ? '可兌換獎勵' : 'Available Rewards'}
              </h2>
              {/* 只有家長可以看到新增按鈕 */}
              {canManage && (
                <button 
                  onClick={handleAddExchangeRule}
                  className="text-primary text-sm font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-icons-outlined text-sm">add</span>
                  {locale === 'zh-TW' ? '新增兌換規則' : 'Add Exchange Rule'}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {exchangeRules.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-xl">
                  <p className="text-gray-500">{locale === 'zh-TW' ? '尚無可兌換的獎勵' : 'No exchangeable rewards yet'}</p>
                </div>
              ) : (
                exchangeRules.map((rule) => {
                  // 查找對應的獎勵類型
                  const requiredType = customTypes.find(t => t.id === rule.required_reward_type_id)
                  if (!requiredType || !requiredType.id) return null // 如果找不到對應的獎勵類型，不顯示
                  
                  const ruleColors = getColorByType(requiredType.type_key, requiredType.color)
                  // 檢查是否有足夠的餘額
                  const currentBalance = rewardStats[requiredType.id]?.currentBalance || 0
                  const canExchange = currentBalance >= rule.required_amount

                  // 獲取顯示名稱
                  const ruleName = locale === 'zh-TW' 
                    ? (rule.name_zh || rule.name_en || '')
                    : (rule.name_en || rule.name_zh || '')
                  const ruleDescription = locale === 'zh-TW'
                    ? (rule.description_zh || rule.description_en || '')
                    : (rule.description_en || rule.description_zh || '')
                  const typeDisplayName = locale === 'zh-TW'
                    ? (requiredType.display_name_zh || requiredType.display_name || requiredType.type_key)
                    : (requiredType.display_name_en || requiredType.display_name || requiredType.type_key)

                  return (
                    <div
                      key={rule.id}
                      className="glass-card rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-6 group hover:translate-x-1 transition-transform"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`${ruleColors.bg} p-3 rounded-2xl flex items-center justify-center ${ruleColors.text}`}>
                          {(() => {
                            const icon = requiredType.icon || getIconByType(requiredType.type_key)
                            return isEmojiIcon(icon) ? (
                              <span>{icon}</span>
                            ) : (
                              <span className="material-icons-outlined" style={{ color: requiredType.color }}>{icon}</span>
                            )
                          })()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{ruleName}</span>
                          </div>
                          <p className="text-sm text-gray-500">{ruleDescription}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-xs text-gray-400 mb-0.5">
                            {locale === 'zh-TW' ? '兌換條件' : 'Exchange Condition'}
                          </span>
                          <div className="flex items-center gap-1 justify-end font-bold text-gray-700">
                            <span className={ruleColors.text}>{rule.required_amount}</span>
                            <span className="text-sm">{typeDisplayName}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {locale === 'zh-TW' ? '現有：' : 'Current: '}
                            <span className={canExchange ? 'text-green-600' : 'text-red-600'}>
                              {currentBalance}
                            </span>
                          </div>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
                        <div className="flex gap-2">
                          {/* 兌換按鈕 - 學生和家長都可以看到 */}
                          <button
                            onClick={() => handleExchange(rule)}
                            disabled={!canExchange}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
                              canExchange 
                                ? 'cursor-pointer hover:opacity-80' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                            style={{
                              backgroundColor: canExchange ? requiredType.color + '20' : '#e5e7eb',
                              color: canExchange ? requiredType.color : '#9ca3af'
                            }}
                          >
                            {locale === 'zh-TW' ? '兌換' : 'Exchange'}
                          </button>
                          {/* 編輯/刪除按鈕 - 僅家長可見 */}
                          {canManage && (
                            <>
                              <button 
                                onClick={() => handleEditExchangeRule(rule)}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors shadow-sm cursor-pointer"
                              >
                                <span className="material-icons-outlined text-xl">edit</span>
                              </button>
                              <button 
                                onClick={() => rule.id && handleDeleteExchangeRule(rule.id)}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
                              >
                                <span className="material-icons-outlined text-xl">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between text-gray-400 text-sm px-4">
              <p>{locale === 'zh-TW' ? '最後更新時間：2024/01/14 15:30' : 'Last updated: 2024/01/14 15:30'}</p>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {locale === 'zh-TW' ? '系統運行中' : 'System Running'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {locale === 'zh-TW' ? '已備份雲端' : 'Cloud Backed Up'}
                </span>
              </div>
            </div>
          </section>

      {/* 错误提示 */}
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

      {/* 奖励类型管理弹窗 */}
      <RewardTypePopup
        isOpen={showPopup}
        onClose={() => {
          setShowPopup(false)
          setEditingType(null)
        }}
        onSave={handleSaveRewardType}
        onDelete={handleDeleteRewardType}
        editingType={editingType}
      />
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
        rewardTypes={customTypes}
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
          exchangeRules={exchangeRules}
          onExchange={handleExchangeFromDetail}
          onUse={(amount, description) => {
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
          exchangeRules={exchangeRules}
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
        onAdd={handleAddReward}
      />
    </>
  )
}
