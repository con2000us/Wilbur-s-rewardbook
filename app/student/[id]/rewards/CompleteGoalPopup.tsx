'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'
import ImageUploader, { GoalTemplateImage } from '@/app/components/ImageUploader'

interface StudentGoal {
  id?: string
  name: string
  icon: string
  color: string
  progress_percent?: number
}

interface CompleteGoalPopupProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: {
    completed_at: string
    completion_notes: string
    completion_images: GoalTemplateImage[]
  }) => Promise<void>
  goal: StudentGoal
  goalId: string
}

export default function CompleteGoalPopup({
  isOpen,
  onClose,
  onComplete,
  goal,
  goalId
}: CompleteGoalPopupProps) {
  const locale = useLocale()

  const [completedAt, setCompletedAt] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [completionNotes, setCompletionNotes] = useState('')
  const [completionImages, setCompletionImages] = useState<GoalTemplateImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setCompletedAt(new Date().toISOString().split('T')[0])
      setCompletionNotes('')
      setCompletionImages([])
      setError('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
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

  if (!isOpen || !mounted) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const completedAtISO = new Date(completedAt).toISOString()
      await onComplete({
        completed_at: completedAtISO,
        completion_notes: completionNotes.trim() || '',
        completion_images: completionImages,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'zh-TW' ? '儲存失敗' : 'Save failed'))
    } finally {
      setLoading(false)
    }
  }

  // 判断是否为 emoji
  const isEmojiIcon = (icon: string): boolean => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) ||
           icon.length <= 2 ||
           !/^[a-z_]+$/i.test(icon)
  }

  const popupContent = (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左側預覽區域 */}
        <div className="w-full md:w-1/3 bg-slate-50 p-8 border-r border-slate-100 overflow-y-auto">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
              {locale === 'zh-TW' ? '目標完成' : 'Goal Completed'}
            </h3>

            {/* 圖標預覽 */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border-4 border-white shadow-xl"
              style={{ backgroundColor: `${goal.color}20` }}
            >
              {isEmojiIcon(goal.icon) ? (
                <span className="text-4xl" style={{ color: goal.color }}>{goal.icon}</span>
              ) : (
                <span className="material-icons-outlined text-4xl" style={{ color: goal.color }}>{goal.icon}</span>
              )}
            </div>

            <h4 className="font-bold text-xl text-slate-800 mb-2">{goal.name}</h4>

            {/* 進度顯示 */}
            <div className="w-full mt-4">
              <div
                className="rounded-2xl py-4 px-6 text-center border"
                style={{
                  backgroundColor: `${goal.color}08`,
                  borderColor: `${goal.color}20`
                }}
              >
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  {locale === 'zh-TW' ? '進度' : 'Progress'}
                </p>
                <span className="font-bold text-3xl" style={{ color: goal.color }}>
                  {goal.progress_percent ?? 0}%
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-6">
              {locale === 'zh-TW'
                ? '恭喜達成目標！填寫完成紀錄以便日後回顧。'
                : 'Congratulations! Fill in the completion record for future reference.'}
            </p>
          </div>
        </div>

        {/* 右側表單區域 */}
        <div className="flex-1 p-8 md:p-10 relative overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-icons-outlined">close</span>
          </button>

          <header className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              {locale === 'zh-TW' ? '標記完成' : 'Mark as Complete'}
            </h2>
            <p className="text-slate-500 mt-1">
              {locale === 'zh-TW' ? '記錄目標完成的時間與備註' : 'Record the completion time and notes'}
            </p>
          </header>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 完成日期 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '完成日期' : 'Completion Date'}
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '完成備註' : 'Completion Notes'}
              </label>
              <textarea
                rows={4}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={locale === 'zh-TW' ? '記錄完成時的心情或感言...' : 'Record your thoughts or reflections...'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              />
            </div>

            {/* 紀念圖片 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {locale === 'zh-TW' ? '紀念圖片' : 'Memorial Images'}
              </label>
              <ImageUploader
                images={completionImages}
                onChange={setCompletionImages}
                maxCount={10}
                disabled={loading}
                uploadEndpoint="/api/student-goals/upload-image"
                deleteEndpoint="/api/student-goals/delete-image"
                idFieldName="goalId"
                entityId={goalId}
              />
            </div>

            {/* 按鈕 */}
            <div className="pt-6 flex gap-3 justify-end border-t border-slate-100 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {locale === 'zh-TW' ? '取消' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 rounded-xl font-semibold bg-green-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (locale === 'zh-TW' ? '儲存中...' : 'Saving...')
                  : (locale === 'zh-TW' ? '標記完成' : 'Mark Complete')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(popupContent, document.body)
}
