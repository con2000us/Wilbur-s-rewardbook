'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'

interface CustomRewardType {
  id: string
  type_key: string
  display_name?: string
  icon: string
  color: string
  default_unit: string | null
  is_accumulable: boolean
  extra_input_schema: unknown
  description?: string
  is_system?: boolean
  created_at: string
  updated_at: string
  display_order?: number
}

export default function CustomRewardTypesManager() {
  const t = useTranslations('customRewardTypes')

  const [customTypes, setCustomTypes] = useState<CustomRewardType[]>([])
  const [sortedTypes, setSortedTypes] = useState<CustomRewardType[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEditPopup, setShowEditPopup] = useState(false)
  const [editingType, setEditingType] = useState<CustomRewardType | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  // 載入現有自訂義類型
  const loadCustomTypes = async () => {
    try {
      const response = await fetch('/api/custom-reward-types/list', {
        method: 'GET',
      })
      if (response.ok) {
        const data = await response.json()
        setCustomTypes(data.types || [])
      }
    } catch (err) {
      console.error('Failed to load custom types:', err)
      setError('載入失敗，請稍後再試')
    }
  }

  useEffect(() => {
    setMounted(true)
    loadCustomTypes()
  }, [])

  useEffect(() => {
    setSortedTypes([...customTypes])
  }, [customTypes])

  // 新增自訂義類型
  async function handleAddCustomType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/custom-reward-types/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: formData.get('display_name') as string || 'Unnamed Reward Type',
          icon: formData.get('icon') || '🎁',
          color: formData.get('color') || '#4a9eff',
          default_unit: formData.get('default_unit') || '',
          is_accumulable: formData.get('is_accumulable') === 'true',
          description: formData.get('description') || ''
        })
      })

      if (response.ok) {
        setShowAddForm(false)
        await loadCustomTypes()
        // 重置表單
        ;(e.target as HTMLFormElement).reset()
      } else {
        setError('創建失敗，請稍後再試')
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 打開編輯彈窗
  const handleEdit = (type: CustomRewardType) => {
    setEditingType(type)
    setShowEditPopup(true)
  }

  // 保存獎勵類型（新增或更新）
  const handleSaveRewardType = async (type: CustomRewardType) => {
    try {
      if (type.id) {
        // 更新 - 確保使用 display_name
        const updateData = {
          display_name: type.display_name || '',
          icon: type.icon,
          color: type.color,
          default_unit: type.default_unit,
          is_accumulable: type.is_accumulable,
          description: type.description,
          is_system: type.is_system,
          display_order: type.display_order,
        }
        const response = await fetch('/api/custom-reward-types/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: type.id, ...updateData })
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '更新失敗')
        }
      } else {
        // 新增
        const createData = {
          ...type,
          display_name: type.display_name || ''
        }
        const response = await fetch('/api/custom-reward-types/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '創建失敗')
        }
      }
      await loadCustomTypes()
      setShowEditPopup(false)
      setEditingType(null)
    } catch (err) {
      throw err
    }
  }

  // 刪除自訂義類型
  async function handleDeleteCustomType(typeId: string, isSystem?: boolean) {
    // 如果是系统预设类型，禁止删除
    if (isSystem) {
      setError('系统预设类型不可删除')
      return
    }

    if (!confirm('確定要刪除這個自訂義類型嗎？')) return

    try {
      const response = await fetch('/api/custom-reward-types/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_id: typeId })
      })

      if (response.ok) {
        await loadCustomTypes()
        setError('')
        setShowEditPopup(false)
        setEditingType(null)
      } else {
        const data = await response.json()
        setError(data.error || '刪除失敗，請稍後再試')
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
    }
  }

  // 拖拽排序相關函數
  const handleDragStart = (index: number) => {
    if (!isReordering) return
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (!isReordering || draggedIndex === null) return

    if (draggedIndex === targetIndex) {
      setDropTargetIndex(targetIndex)
      return
    }

    setDropTargetIndex(targetIndex)
    const newTypes = [...sortedTypes]
    const draggedItem = newTypes[draggedIndex]
    newTypes.splice(draggedIndex, 1)
    newTypes.splice(targetIndex, 0, draggedItem)
    setSortedTypes(newTypes)
    setDraggedIndex(targetIndex)
  }

  const handleDragEnd = () => {
    setDropTargetIndex(null)
    setDraggedIndex(null)
  }

  const handleSaveOrder = async () => {
    const updates = sortedTypes.map((type, index) => ({
      id: type.id,
      display_order: index
    }))

    setLoading(true)
    try {
      const response = await fetch('/api/custom-reward-types/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardTypeOrders: updates }),
      })

      if (response.ok) {
        setIsReordering(false)
        setDraggedIndex(null)
        setDropTargetIndex(null)
        await loadCustomTypes()
      } else {
        alert('排序失敗，請稍後再試')
        setSortedTypes([...customTypes])
        setIsReordering(false)
        setDraggedIndex(null)
        setDropTargetIndex(null)
      }
    } catch (err) {
      alert('發生錯誤：' + (err as Error).message)
      setSortedTypes([...customTypes])
      setIsReordering(false)
      setDraggedIndex(null)
      setDropTargetIndex(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelReorder = () => {
    setIsReordering(false)
    setDraggedIndex(null)
    setDropTargetIndex(null)
    setSortedTypes([...customTypes])
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* 新增表單卡片 */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-4">{t('addNewType')}</h2>

            <form onSubmit={handleAddCustomType} className="space-y-4">
              {/* 基本資訊 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('displayName')}
                  </label>
                  <input
                    type="text"
                    name="display_name"
                    required
                    placeholder="例如：讀書獎勵"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 圖標設定 */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('icon')}
                </label>
                {/* 常用 Emoji 快捷選擇 */}
                <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl">
                  {['⭐', '💰', '❤️', '🎁', '🏆', '🎯', '📚', '🎮', '🎨', '🎵', '🏃', '🧠', '💎', '🌟', '🔥', '✨', '🎪', '🎭', '🏅', '🎤'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('input[name="icon"]') as HTMLInputElement
                        if (input) input.value = emoji
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110 bg-white hover:bg-gray-100 border border-gray-200"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {/* 自訂圖標輸入 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="icon"
                    defaultValue="🎁"
                    placeholder="🎁"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-center text-xl"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-gray-500">💡 點擊上方常用圖標快速選擇，或手動輸入 emoji</p>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('color')}
                </label>
                <input
                  type="color"
                  name="color"
                  defaultValue="#4a9eff"
                  className="w-full h-12 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 獎勵設定 */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('defaultUnit')}
                </label>
                <input
                  type="text"
                  name="default_unit"
                  placeholder="例如：代幣、次、顆、小時"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('description')} <span className="text-xs font-normal text-gray-500">（{t('optionalDesc') || '選填'}）</span>
                </label>
                <textarea
                  name="description"
                  placeholder="例如：用於記錄閱讀進度與獎勵"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 按鈕 */}
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                >
                  {loading ? t('creating') : t('create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  {showAddForm ? t('cancel') : t('addNewType')}
                </button>
              </div>
            </form>
          </div>

          {/* 現有類型列表 */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t('existingTypes')}</h2>
              {customTypes.length > 0 && (
                <div className="flex gap-2">
                  {isReordering ? (
                    <>
                      <button
                        onClick={handleSaveOrder}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold text-sm"
                      >
                        {loading ? '儲存中...' : '完成排序'}
                      </button>
                      <button
                        onClick={handleCancelReorder}
                        disabled={loading}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-sm"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsReordering(true)}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-sm"
                    >
                      📋 排序
                    </button>
                  )}
                </div>
              )}
            </div>

            {customTypes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">{t('noCustomTypes')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTypes.map((type, index) => (
                  <div
                    key={type.id}
                    draggable={isReordering}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:shadow-lg transition-all ${
                      isReordering ? 'cursor-move' : ''
                    } ${draggedIndex === index ? 'opacity-50' : ''} ${
                      dropTargetIndex === index ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {/* 排序icon - 左上角 */}
                    {isReordering && (
                      <div className="absolute top-2 left-2 flex flex-col gap-0.5">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        </div>
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        </div>
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{type.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {type.display_name || ''}
                            </h3>
                            {type.is_system && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                                系統預設
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!isReordering && (
                        <button
                          onClick={() => handleEdit(type)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="編輯"
                        >
                          ✏️
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {/* 顯示配置資訊 */}
                      <div className="flex flex-wrap gap-4">
                        <div className="text-xs text-gray-500">
                          {t('defaultUnit')}：
                        </div>
                        <div className="text-sm font-semibold text-gray-700">
                          {type.default_unit || '-'}
                        </div>
                      </div>

                      {type.description && (
                        <div className="flex flex-wrap gap-4">
                          <div className="text-xs text-gray-500">
                            {t('description')}：
                          </div>
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {type.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 編輯彈窗 */}
      {mounted && showEditPopup && editingType && (
        <EditRewardTypePopup
          isOpen={showEditPopup}
          onClose={() => {
            setShowEditPopup(false)
            setEditingType(null)
          }}
          onSave={handleSaveRewardType}
          onDelete={handleDeleteCustomType}
          editingType={editingType}
        />
      )}
    </div>
  )
}

// 編輯獎勵類型彈窗組件
interface EditRewardTypePopupProps {
  isOpen: boolean
  onClose: () => void
  onSave: (type: CustomRewardType) => Promise<void>
  onDelete: (typeId: string, isSystem?: boolean) => Promise<void>
  editingType: CustomRewardType
}

function EditRewardTypePopup({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingType
}: EditRewardTypePopupProps) {
  const t = useTranslations('customRewardTypes')
  const [formData, setFormData] = useState<CustomRewardType>(editingType)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setFormData(editingType)
    setError('')
  }, [editingType, isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave({ ...formData, id: editingType.id })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定要刪除這個自訂義類型嗎？')) return
    setDeleting(true)
    try {
      await onDelete(editingType.id, editingType.is_system)
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setDeleting(false)
    }
  }

  const popupContent = (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-icons-outlined">close</span>
          </button>

          <header className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">編輯獎勵類型</h2>
            <p className="text-slate-500 mt-1">修改獎勵類型的設定</p>
          </header>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('displayName') || '顯示名稱'}
              </label>
              <input
                type="text"
                required
                value={formData.display_name || ''}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('icon')}
              </label>
              {/* 常用 Emoji 快捷選擇 */}
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl mb-3">
                {['⭐', '💰', '❤️', '🎁', '🏆', '🎯', '📚', '🎮', '🎨', '🎵', '🏃', '🧠', '💎', '🌟', '🔥', '✨', '🎪', '🎭', '🏅', '🎤'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110 ${
                      formData.icon === emoji
                        ? 'bg-blue-100 ring-2 ring-blue-400'
                        : 'bg-white hover:bg-slate-100'
                    }`}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 text-center text-2xl"
                maxLength={10}
              />
              <p className="text-xs text-slate-500 mt-1">💡 點擊上方常用圖標快速選擇，或手動輸入 emoji</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('color')}
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-12 px-4 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('defaultUnit')}
              </label>
              <input
                type="text"
                value={formData.default_unit || ''}
                onChange={(e) => setFormData({ ...formData, default_unit: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('description')} <span className="text-xs text-slate-500 font-normal">({t('optional') || '選填'})</span>
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：用於記錄閱讀進度與獎勵"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="pt-6 flex gap-3 justify-between border-t border-slate-100 mt-8">
              <div>
                {!editingType.is_system && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || loading}
                    className="px-6 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? '刪除中...' : '🗑️ 刪除'}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 rounded-xl font-semibold bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '儲存中...' : '儲存變更'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}
