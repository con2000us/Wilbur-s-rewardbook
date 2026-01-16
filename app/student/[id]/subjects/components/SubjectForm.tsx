'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { MATERIAL_ICON_CATEGORIES, findMaterialIconCategory } from '@/app/lib/constants/materialIconCategories'
import { GRADE_OPTIONS, DEFAULT_GRADE_TO_SCORE, parseSubjectGradeMapping, type Grade, type GradeScoreRange } from '@/lib/gradeConverter'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  order_index: number
  grade_mapping?: any
}

interface ExistingSubject {
  id: string
  name: string
  icon: string
  order_index: number
}

interface Props {
  studentId: string
  subject?: Subject  // 如果有值就是編輯模式
  existingSubjects: ExistingSubject[]
  onSuccess?: () => void  // 成功後的回調
  onCancel?: () => void  // 取消的回調
}

export default function SubjectForm({ studentId, subject, existingSubjects, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const t = useTranslations('subject')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const locale = useLocale()
  
  // 判斷是編輯還是新增模式
  const isEditMode = !!subject
  
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedIcon, setSelectedIcon] = useState(subject?.icon || 'auto_stories')
  const [customIconInput, setCustomIconInput] = useState('')
  const [isPickerVisible, setIsPickerVisible] = useState(true)
  const [subjectName, setSubjectName] = useState(subject?.name || '')
  const [subjectColor, setSubjectColor] = useState(subject?.color || '#4a9eff')
  
  // 等級對應相關狀態
  const [useCustomGradeMapping, setUseCustomGradeMapping] = useState(false)
  const [gradeMapping, setGradeMapping] = useState<Record<Grade, GradeScoreRange>>(DEFAULT_GRADE_TO_SCORE)
  
  // 初始化等級對應
  useEffect(() => {
    if (subject?.grade_mapping) {
      const parsed = parseSubjectGradeMapping(subject.grade_mapping)
      if (parsed) {
        setGradeMapping(parsed)
        setUseCustomGradeMapping(true)
      }
    }
  }, [subject?.grade_mapping])
  
  // 初始化時，根據選擇的 Icon 找到對應的分類
  const initialCategory = findMaterialIconCategory(subject?.icon || 'auto_stories') || '教育'
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  
  // 當選擇的 Icon 改變時，自動切換到正確的分類
  useEffect(() => {
    const category = findMaterialIconCategory(selectedIcon)
    if (category && category !== selectedCategory) {
      setSelectedCategory(category)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIcon])
  
  // 獲取當前分類的 Icons
  const getCategoryIcons = () => {
    return MATERIAL_ICON_CATEGORIES[selectedCategory] || []
  }

  // 預設科目選擇（根據語言動態生成，僅新增模式）
  const PRESET_SUBJECTS = locale === 'zh-TW' ? [
    { name: '國語', icon: 'auto_stories', color: '#4a9eff' },
    { name: '數學', icon: 'calculate', color: '#ff4a6a' },
    { name: '英文', icon: 'public', color: '#4accff' },
    { name: '自然', icon: 'science', color: '#4ade80' },
    { name: '社會', icon: 'school', color: '#fb923c' },
    { name: '音樂', icon: 'music_note', color: '#c084fc' },
    { name: '美術', icon: 'palette', color: '#f472b6' },
    { name: '體育', icon: 'sports_soccer', color: '#10b981' },
  ] : [
    { name: 'Language Arts', icon: 'auto_stories', color: '#4a9eff' },
    { name: 'Math', icon: 'calculate', color: '#ff4a6a' },
    { name: 'English', icon: 'public', color: '#4accff' },
    { name: 'Science', icon: 'science', color: '#4ade80' },
    { name: 'Social Studies', icon: 'school', color: '#fb923c' },
    { name: 'Music', icon: 'music_note', color: '#c084fc' },
    { name: 'Art', icon: 'palette', color: '#f472b6' },
    { name: 'PE', icon: 'sports_soccer', color: '#10b981' },
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const icon = customIconInput.trim() || selectedIcon
    
    try {
      const apiUrl = isEditMode ? '/api/subjects/update' : '/api/subjects/create'
      const payload: any = {
        student_id: studentId,
        name: formData.get('name'),
        icon: icon,
        color: formData.get('color'),
        order_index: isEditMode ? subject.order_index : existingSubjects.length,
        grade_mapping: useCustomGradeMapping ? gradeMapping : null,
      }

      if (isEditMode) {
        payload.subject_id = subject.id
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        if (onSuccess) {
          // Modal 模式：調用回調並刷新
          router.refresh()
          setTimeout(() => {
            onSuccess()
          }, 1000)
        } else {
          // 獨立頁面模式：跳轉回科目頁面
          setTimeout(() => {
            router.push(`/student/${studentId}/subjects`)
            router.refresh()
          }, 1000)
        }
      } else {
        setError(result.error || (isEditMode ? tMessages('updateFailed') : tMessages('createFailed')))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!isEditMode || !subject) return

    if (!confirm(t('deleteConfirmFull', { name: subject.name }))) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/subjects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subject.id,
        })
      })

      const result = await response.json()

      if (response.ok) {
        if (onSuccess) {
          // Modal 模式：調用回調並刷新
          router.refresh()
          setTimeout(() => {
            onSuccess()
          }, 500)
        } else {
          // 獨立頁面模式：跳轉回科目頁面
          router.push(`/student/${studentId}/subjects`)
          router.refresh()
        }
      } else {
        setError(result.error || tMessages('deleteFailed'))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  function handlePresetClick(index: number) {
    setSelectedPreset(index)
    const preset = PRESET_SUBJECTS[index]
    setSubjectName(preset.name)
    setSelectedIcon(preset.icon)
    setCustomIconInput('')
    setSubjectColor(preset.color)
    const form = document.querySelector('form') as HTMLFormElement
    if (form) {
      (form.elements.namedItem('name') as HTMLInputElement).value = preset.name;
      (form.elements.namedItem('color') as HTMLInputElement).value = preset.color
    }
  }

  function handleIconSelect(icon: string) {
    setSelectedIcon(icon)
    setCustomIconInput('')
    setSelectedPreset(null)
  }

  function handleCustomIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.trim()
    setCustomIconInput(e.target.value)
    if (value) {
      setSelectedIcon(value)
      setSelectedPreset(null)
    }
  }

  const currentIcon = customIconInput.trim() || selectedIcon

  return (
    <>
      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl">
          <p className="text-red-700 dark:text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl">
          <p className="text-green-700 dark:text-green-400 text-sm">
            ✅ {isEditMode ? tMessages('updateSuccess') : tMessages('createSuccess')}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col" style={{ minHeight: 0 }}>
        <div className="p-8 space-y-8 flex-1 overflow-y-auto min-h-0">
          {/* 預設科目選擇（僅新增模式） */}
          {!isEditMode && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t('quickSelect')}</label>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_SUBJECTS.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePresetClick(index)}
                    className={`p-3 rounded-xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                      selectedPreset === index
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    style={{ backgroundColor: selectedPreset === index ? `${preset.color}20` : undefined }}
                  >
                    <div className="text-2xl mb-1 flex items-center justify-center">
                      <span className="material-icons-outlined" style={{ color: preset.color }}>
                        {preset.icon}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Top Controls: Name and Color Picker beside Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  {t('name')} <span className="text-red-500">*</span>
                </label>
                <input 
                  name="name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white" 
                  placeholder={t('namePlaceholder')} 
                  type="text" 
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value)
                    setSelectedPreset(null)
                  }}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t('colorTag')}</label>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <input 
                      name="color"
                      className="h-12 w-20 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer overflow-hidden" 
                      type="color" 
                      value={subjectColor}
                      onChange={(e) => setSubjectColor(e.target.value)}
                      required
                    />
                  </div>
                  <div 
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                    style={{ backgroundColor: `${subjectColor}20`, color: subjectColor }}
                  >
                    {t('preview')}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Icon Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-6 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 transition-all">
              <div 
                className="w-32 h-32 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '4.8rem' }}>{currentIcon}</span>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">{t('currentIcon')}</p>
              <button 
                type="button"
                onClick={() => setIsPickerVisible(!isPickerVisible)}
                className="px-6 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-sm font-semibold shadow-sm hover:shadow-md active:scale-95 transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
              >
                {isPickerVisible ? t('hideEmojiPicker') : t('selectEmoji')}
              </button>
            </div>
          </div>

          {/* Icon Selection Panel */}
          <div 
            className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
              isPickerVisible 
                ? 'max-h-[1000px] opacity-100' 
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t('icon')}</label>
            </div>
            
            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(203 213 225) transparent' }}>
              {Object.keys(MATERIAL_ICON_CATEGORIES).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                    selectedCategory === category 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Icon Grid */}
            <div className="p-4 bg-white/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(203 213 225) transparent' }}>
              <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-3">
                {getCategoryIcons().map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => handleIconSelect(icon)}
                    className={`aspect-square flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                      selectedIcon === icon && !customIconInput.trim()
                        ? 'bg-primary/10 text-primary border-2 border-primary scale-110' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="material-icons-outlined text-2xl">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Icon Search Input */}
            <div className="relative group">
              <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white text-sm" 
                placeholder="自訂圖標名稱 (例如: auto_stories, calculate, public...)" 
                type="text"
                value={customIconInput}
                onChange={handleCustomIconChange}
              />
            </div>
          </div>

          {/* 等級對應設定 */}
          <div className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'zh-TW' ? '等級制成績對應' : 'Letter Grade Mapping'}
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'zh-TW' 
                    ? '設定此科目的等級（A+ ~ F）對應的數字分數範圍，用於計算獎金（使用最高分數）'
                    : 'Set the numeric score range for each letter grade (A+ ~ F) for this subject, used for reward calculation (using max score)'}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomGradeMapping}
                  onChange={(e) => {
                    setUseCustomGradeMapping(e.target.checked)
                    if (!e.target.checked) {
                      setGradeMapping(DEFAULT_GRADE_TO_SCORE)
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {locale === 'zh-TW' ? '使用自訂對應' : 'Use Custom Mapping'}
                </span>
              </label>
            </div>

            {useCustomGradeMapping && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {GRADE_OPTIONS.map((grade) => (
                  <div key={grade} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                    <div className="w-16 text-center">
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{grade}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                          {locale === 'zh-TW' ? '最低' : 'Min'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={gradeMapping[grade].min}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            setGradeMapping({
                              ...gradeMapping,
                              [grade]: { ...gradeMapping[grade], min: value }
                            })
                          }}
                          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                          {locale === 'zh-TW' ? '平均' : 'Average'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={gradeMapping[grade].average}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            setGradeMapping({
                              ...gradeMapping,
                              [grade]: { ...gradeMapping[grade], average: value }
                            })
                          }}
                          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                          {locale === 'zh-TW' ? '最高' : 'Max'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={gradeMapping[grade].max}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 100
                            setGradeMapping({
                              ...gradeMapping,
                              [grade]: { ...gradeMapping[grade], max: value }
                            })
                          }}
                          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                  <span className="material-icons-outlined text-sm align-middle mr-1">info</span>
                  {locale === 'zh-TW' 
                    ? '提示：系統會使用「最高」值來計算獎金。如果未設定自訂對應，將使用系統預設值。'
                    : 'Tip: The system uses the "Max" value to calculate rewards. If no custom mapping is set, the system default will be used.'}
                </div>
              </div>
            )}

            {!useCustomGradeMapping && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded text-sm text-slate-600 dark:text-slate-400">
                {locale === 'zh-TW' 
                  ? '目前使用系統預設等級對應。勾選「使用自訂對應」可為此科目設定專屬的等級對應。'
                  : 'Currently using system default grade mapping. Check "Use Custom Mapping" to set a subject-specific grade mapping.'}
              </div>
            )}
          </div>

          {/* Warning Section (僅編輯模式) */}
          {isEditMode && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-5 border border-red-100 dark:border-red-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="material-icons-outlined text-red-500 mt-0.5">warning</span>
                <div>
                  <h4 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-tight">{t('dangerZone')}</h4>
                  <p className="text-xs text-red-600/80 dark:text-red-400/60 leading-relaxed">{t('deleteWarningIntro')}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleDelete}
                disabled={loading || deleting || success}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-icons-outlined text-lg">delete_forever</span>
                {deleting ? `${tCommon('delete')}...` : t('deleteSubject')}
              </button>
            </div>
          )}
        </div>

        {/* 自定義滾動條樣式 */}
        <style jsx>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgb(148 163 184) rgb(241 245 249);
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgb(241 245 249);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgb(148 163 184);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgb(100 116 139);
          }
          .dark .custom-scrollbar {
            scrollbar-color: rgb(71 85 105) rgb(15 23 42);
          }
          .dark .custom-scrollbar::-webkit-scrollbar-track {
            background: rgb(15 23 42);
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgb(71 85 105);
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgb(51 65 85);
          }
        `}</style>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col-reverse sm:flex-row gap-4 justify-end flex-shrink-0">
          <button 
            type="button"
            onClick={() => onCancel ? onCancel() : router.back()}
            disabled={loading || deleting}
            className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
          <button 
            type="submit"
            disabled={loading || success || deleting}
            className="px-12 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="material-icons-outlined text-lg">save</span>
            {loading 
              ? tCommon('loading')
              : success 
              ? (isEditMode ? tMessages('updateSuccess') : tMessages('createSuccess'))
              : (isEditMode ? tCommon('save') : t('createSubject'))
            }
          </button>
        </div>
      </form>
    </>
  )
}
