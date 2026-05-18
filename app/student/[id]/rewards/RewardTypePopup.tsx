'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'

interface CustomRewardType {
  id?: string
  type_key?: string
  display_name: string
  icon: string
  color: string
  default_unit: string | null
  is_accumulable: boolean
  description?: string
  extra_input_schema: any
  is_system?: boolean
}

interface RewardTypePopupProps {
  isOpen: boolean
  onClose: () => void
  onSave: (type: CustomRewardType) => Promise<void>
  onDelete?: (typeId: string, isSystem?: boolean) => Promise<void>
  editingType?: CustomRewardType | null
}

// 移除 Material Icons 常量，现在使用文本输入框直接输入 emoji 或 Material Icon 名称

const COLOR_OPTIONS = [
  { name: 'blue', value: '#3b82f6' },
  { name: 'purple', value: '#8b5cf6' },
  { name: 'pink', value: '#ec4899' },
  { name: 'orange', value: '#f97316' },
  { name: 'green', value: '#10b981' },
  { name: 'yellow', value: '#fbbf24' }
]

export default function RewardTypePopup({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingType
}: RewardTypePopupProps) {
  const locale = useLocale()
  const t = useTranslations('customRewardTypes')
  const tCommon = useTranslations('common')
  const isEditing = !!editingType

  const [formData, setFormData] = useState<CustomRewardType>({
    display_name: '',
    icon: '🎁',
    color: '#3b82f6',
    default_unit: null,
    is_accumulable: true,
    description: '',
    extra_input_schema: null
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 確保只在客戶端渲染
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editingType) {
      // 确保所有字段都有默认值，避免 undefined 导致受控组件错误
      setFormData({
        display_name: editingType.display_name || '',
        icon: editingType.icon || '🎁',
        color: editingType.color || '#3b82f6',
        default_unit: editingType.default_unit ?? null,
        is_accumulable: editingType.is_accumulable ?? true,
        description: editingType.description || '',
        extra_input_schema: editingType.extra_input_schema ?? null
      })
    } else {
      setFormData({
        display_name: '',
        icon: '🎁',
        color: '#3b82f6',
        default_unit: null,
        is_accumulable: true,
        description: '',
        extra_input_schema: null
      })
    }
    setError('')
  }, [editingType, isOpen])

  // 處理 ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // 防止背景滾動
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  // 確保 formData 的所有字段始終有值，避免受控組件錯誤
  const safeFormData = {
    display_name: formData.display_name || '',
    icon: formData.icon || '🎁',
    color: formData.color || '#3b82f6',
    default_unit: formData.default_unit ?? null,
    is_accumulable: formData.is_accumulable ?? true,
    description: formData.description || '',
    extra_input_schema: formData.extra_input_schema ?? null
  }

  // 點擊背景關閉
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
      let dataToSave: any
      if (isEditing && editingType?.id) {
        dataToSave = { ...safeFormData, id: editingType.id }
      } else {
        dataToSave = safeFormData
      }
      await onSave(dataToSave)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'))
    } finally {
      setLoading(false)
    }
  }

  const popupContent = (
    <div 
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧视觉自定义区域 */}
        <div className="w-full md:w-1/3 bg-slate-50 p-8 border-r border-slate-100">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
              {t('visualCustomization')}
            </h3>

            {/* 图标预览 */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border-4 border-white shadow-xl"
              style={{ backgroundColor: `${safeFormData.color}20` }}
            >
              {(() => {
                // 判断是否为 emoji（简单判断：长度 <= 2 或包含 emoji 字符）
                const isEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(safeFormData.icon) || 
                               safeFormData.icon.length <= 2 || 
                               !/^[a-z_]+$/i.test(safeFormData.icon)
                return isEmoji ? (
                  <span className="text-4xl" style={{ color: safeFormData.color }}>
                    {safeFormData.icon}
                  </span>
                ) : (
                  <span 
                    className="material-icons-outlined text-4xl"
                    style={{ color: safeFormData.color }}
                  >
                    {safeFormData.icon}
                  </span>
                )
              })()}
            </div>

            {/* 图标输入 */}
            <div className="mb-8 w-full">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
                {t('selectIcon')}
              </p>

              {/* 常用 Emoji 选择 */}
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2">
                  {t('commonEmojis') || '常用表情符号：'}
                </p>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl">
                  {['⭐', '💰', '❤️', '🎁', '🏆', '🎯', '📚', '🎮', '🎨', '🎵', '🏃', '🧠', '💎', '🌟', '🔥', '✨', '🎪', '🎭', '🎬', '🎤'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-all hover:scale-110 ${
                        safeFormData.icon === emoji
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-white hover:bg-slate-100'
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              
              <input
                type="text"
                value={safeFormData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value || '🎁' })}
                placeholder={t('iconPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center text-2xl"
                maxLength={10}
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                💡 {t('iconHint')}
              </p>
            </div>

            {/* 颜色选择 */}
            <div className="w-full">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
                {t('selectThemeColor')}
              </p>
              <div className="flex justify-center gap-4">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                      safeFormData.color === color.value
                        ? 'ring-4 ring-offset-2'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: color.value
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧表单区域 */}
        <div className="flex-1 p-8 md:p-10 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-icons-outlined">close</span>
          </button>

          <header className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              {isEditing ? t('editRewardType') : t('addNewType')}
            </h2>
            <p className="text-slate-500 mt-1">
              {t('configureDescription')}
            </p>
          </header>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('displayName')}
              </label>
              <input
                type="text"
                required
                value={safeFormData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder={t('namePlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                💡 {t('nameHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('defaultUnit')} <span className="text-xs text-slate-500 font-normal">({t('optional')})</span>
              </label>
              <input
                type="text"
                value={safeFormData.default_unit || ''}
                onChange={(e) => setFormData({ ...formData, default_unit: e.target.value || null })}
                placeholder={t('unitPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                💡 {t('unitHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('accumulationRule')}
              </label>
              <input
                type="text"
                value={safeFormData.extra_input_schema?.description || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    extra_input_schema: { ...(formData.extra_input_schema || {}), description: e.target.value }
                  })
                }
                placeholder={t('rulePlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('detailedDescription')}
              </label>
              <textarea
                rows={4}
                value={safeFormData.extra_input_schema?.detailed_description || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    extra_input_schema: { ...(formData.extra_input_schema || {}), detailed_description: e.target.value }
                  })
                }
                placeholder={t('descriptionPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('initialValue')}
                </label>
                <input
                  type="number"
                  value={safeFormData.extra_input_schema?.initial_value || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      extra_input_schema: { ...(formData.extra_input_schema || {}), initial_value: parseInt(e.target.value) || 0 }
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="flex items-end mb-1">
              </div>
            </div>

            <div className="pt-6 flex gap-3 justify-between border-t border-slate-100 mt-8">
              <div>
                {isEditing && editingType && !editingType.is_system && editingType.id && onDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                      const editingTypeId = editingType?.id
                      if (!editingTypeId) return
                      if (!confirm(locale === 'zh-TW' ? '確定要刪除這個獎勵類型嗎？' : 'Are you sure you want to delete this reward type?')) {
                        return
                      }
                      setDeleting(true)
                      try {
                        await onDelete(editingTypeId, editingType?.is_system)
                        onClose()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '刪除失敗' : 'Delete failed'))
                      } finally {
                        setDeleting(false)
                      }
                    }}
                    disabled={deleting || loading}
                    className="px-6 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? (locale === 'zh-TW' ? '刪除中...' : 'Deleting...') : '🗑️ ' + (locale === 'zh-TW' ? '刪除' : 'Delete')}
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
                  disabled={loading || deleting}
                  className="px-8 py-2.5 rounded-xl font-semibold bg-primary text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('saving') : t('saveChanges')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  // 使用 Portal 渲染到 document.body
  return createPortal(popupContent, document.body)
}
