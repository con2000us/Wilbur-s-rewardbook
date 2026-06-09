'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import {
  calculateRewardOutputsFromRule,
  parseRewardConfig,
  type CalculatedRewardItem,
  type RewardConfigItem,
} from '@/lib/rewardFormula'
import { gradeToScore, gradeToPercentage, GRADE_OPTIONS, type Grade } from '@/lib/gradeConverter'
import ImageUploader, { type UploadedImage } from '@/app/components/ImageUploader'
import AiAssessmentImport from './AiAssessmentImport'
import type { Json } from '@/lib/supabase/types'
import AssessmentTypeRadioGroup from '@/app/components/AssessmentTypeRadioGroup'
import {
  getAssessmentTypeLabel,
  normalizeAssessmentTypes,
  type AssessmentType,
} from '@/lib/assessmentTypes'

interface Subject {
  id: string
  name: string
  color: string
  icon: string
  grade_mapping?: Json | null
}

interface Assessment {
  id: string
  subject_id: string
  title: string
  assessment_type: string
  score: number | null
  max_score: number
  due_date: string | null
  status: string
  reward_amount: number | null
  grade: string | null
  score_type: string | null
  scoring_mode?: string | null
  counts_toward_average?: boolean | null
  counts_toward_reward?: boolean | null
  notes?: string | null
  image_urls?: UploadedImage[] | null
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
  display_order?: number | null
  is_active: boolean
  assessment_type: string | null
}

interface RewardType {
  id: string
  type_key: string
  display_name: string
  default_unit?: string | null
}

interface Props {
  studentId: string
  subjects: Subject[]
  rewardRules: RewardRule[]
  assessment?: Assessment
  initialSubjectId?: string
  defaultAssessmentType?: string
  assessmentTypes?: AssessmentType[]
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AssessmentForm({ 
  studentId, 
  subjects, 
  rewardRules, 
  assessment,
  initialSubjectId,
  defaultAssessmentType = 'quiz',
  assessmentTypes = [],
  onSuccess,
  onCancel
}: Props) {
  const router = useRouter()
  const t = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const locale = useLocale()
  
  // 判斷是編輯還是新增模式
  const isEditMode = !!assessment
  
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    assessment?.subject_id || initialSubjectId || subjects[0]?.id || ''
  )
  const [selectedAssessmentType, setSelectedAssessmentType] = useState(
    assessment?.assessment_type || defaultAssessmentType
  )
  const [scoreType, setScoreType] = useState<'numeric' | 'letter' | 'record_only'>(
    assessment?.scoring_mode === 'record_only'
      ? 'record_only'
      : (assessment?.score_type as 'numeric' | 'letter') || 'numeric'
  )
  const [score, setScore] = useState<number | null>(assessment?.score || null)
  const [grade, setGrade] = useState<Grade | null>(
    (assessment?.grade as Grade) || null
  )
  const [maxScore, setMaxScore] = useState(assessment?.max_score || 100)
  const [showRules, setShowRules] = useState(false)
  const [showDangerZone, setShowDangerZone] = useState(false)
  const [imageUrls, setImageUrls] = useState<UploadedImage[]>(
    Array.isArray(assessment?.image_urls) ? assessment.image_urls : []
  )
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([])
  const [selectedRewardTypeId, setSelectedRewardTypeId] = useState<string>('')
  const [activeMode, setActiveMode] = useState<'manual' | 'ai'>('manual')
  const [aiAvailable, setAiAvailable] = useState(false)
  const assessmentTypeOptions = normalizeAssessmentTypes(
    assessmentTypes,
    assessment?.assessment_type || defaultAssessmentType
  )
  const activeAssessmentTypeOptions = assessmentTypeOptions.filter((type) => type.is_active !== false)
  const hasActiveAssessmentTypes = activeAssessmentTypeOptions.length > 0
  const canSubmitAssessmentType = isEditMode || hasActiveAssessmentTypes
  const selectedAssessmentTypeLabel = getAssessmentTypeLabel(
    assessmentTypeOptions,
    selectedAssessmentType,
    locale === 'zh-TW' ? '評量' : 'Assessment'
  )

  const getRewardTypeDisplayName = (type: RewardType) => {
    return type.display_name || ''
  }

  const selectedRewardType = rewardTypes.find((type) => type.id === selectedRewardTypeId)
  const rewardUnit = selectedRewardType?.default_unit || (locale === 'zh-TW' ? '元' : 'units')
  const fallbackRewardName = locale === 'zh-TW' ? '獎勵' : 'Reward'

  const getRewardTypeByRef = (item: { type_id?: string | null; type_key?: string | null }) => {
    return rewardTypes.find((type) =>
      (item.type_id && type.id === item.type_id) ||
      (item.type_key && type.type_key === item.type_key)
    )
  }

  const getRewardItemName = (item: { type_id?: string | null; type_key?: string | null }) => {
    const type = getRewardTypeByRef(item)
    return type?.display_name || selectedRewardType?.display_name || fallbackRewardName
  }

  const formatRewardItemAmount = (item: CalculatedRewardItem) => {
    const type = getRewardTypeByRef(item)
    const unit = item.unit || type?.default_unit || (!item.type_id && !item.type_key ? rewardUnit : '')
    return `${item.amount}${unit ? ` ${unit}` : ''}`
  }

  useEffect(() => {
    async function loadRewardTypes() {
      try {
        const response = await fetch('/api/custom-reward-types/list')
        const data = await response.json()
        if (!response.ok || !data.success) return
        const list: RewardType[] = data.types || []
        setRewardTypes(list)

        const moneyType = list.find((type) => type.type_key === 'money')
        setSelectedRewardTypeId(moneyType?.id || list[0]?.id || '')
      } catch (err) {
        console.error('Failed to load reward types:', err)
      }
    }
    loadRewardTypes()
  }, [])

  useEffect(() => {
    if (isEditMode) return

    async function loadAiStatus() {
      try {
        const response = await fetch('/api/ai-assessment/status')
        const data = await response.json()
        setAiAvailable(Boolean(data.enabled && data.visionConfigured && data.textConfigured))
      } catch {
        setAiAvailable(false)
      }
    }

    loadAiStatus()
  }, [isEditMode])

  useEffect(() => {
    if (isEditMode) return
    const activeTypes = normalizeAssessmentTypes(assessmentTypes).filter((type) => type.is_active !== false)
    if (activeTypes.length > 0 && !activeTypes.some((type) => type.type_key === selectedAssessmentType)) {
      setSelectedAssessmentType(activeTypes[0].type_key)
    }
  }, [assessmentTypes, isEditMode, selectedAssessmentType])

  // 根據選中的科目和評量類型篩選適用的規則
  const getApplicableRules = () => {
    if (!selectedSubjectId) return []
    
    // 先過濾適用的規則
    const filteredRules = rewardRules.filter(rule => {
      // 先檢查評量類型是否匹配
      const typeMatches = !rule.assessment_type || rule.assessment_type === selectedAssessmentType
      if (!typeMatches) return false

      // 全局規則
      if (!rule.student_id && !rule.subject_id) return true
      // 學生規則
      if (rule.student_id === studentId && !rule.subject_id) return true
      // 科目規則
      if (!rule.student_id && rule.subject_id === selectedSubjectId) return true
      // 科目+學生規則
      if (rule.student_id === studentId && rule.subject_id === selectedSubjectId) return true
      return false
    })

    // 按規則類型分組（與管理頁面相同的優先級順序）
    const exclusiveRules = filteredRules.filter(r => r.student_id === studentId && r.subject_id === selectedSubjectId)
    const subjectOnlyRules = filteredRules.filter(r => !r.student_id && r.subject_id === selectedSubjectId)
    const studentRules = filteredRules.filter(r => r.student_id === studentId && !r.subject_id)
    const globalRules = filteredRules.filter(r => !r.student_id && !r.subject_id)

    // 排序函數：按 display_order（如果存在），否則按 priority（升序，因為 display_order 越小越優先）
    const sortRules = (rules: typeof filteredRules) => {
      return [...rules].sort((a, b) => {
        const orderA = a.display_order ?? a.priority ?? 0
        const orderB = b.display_order ?? b.priority ?? 0
        return orderA - orderB
      })
    }

    // 按優先級順序合併：專屬 > 科目 > 學生 > 全局
    return [
      ...sortRules(exclusiveRules),
      ...sortRules(subjectOnlyRules),
      ...sortRules(studentRules),
      ...sortRules(globalRules)
    ]
  }

  const applicableRules = getApplicableRules()
  const isRecordOnly = scoreType === 'record_only'

  // 獲取當前選中科目的等級對應
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const subjectGradeMapping = selectedSubject?.grade_mapping

  // 計算實際用於獎金計算的分數和百分比
  let actualScore: number | null = null
  let actualPercentage: number | null = null

  if (!isRecordOnly && scoreType === 'letter' && grade) {
    actualScore = gradeToScore(grade, subjectGradeMapping)
    actualPercentage = gradeToPercentage(grade, maxScore, subjectGradeMapping)
  } else if (!isRecordOnly && scoreType === 'numeric' && score !== null) {
    actualScore = score
    actualPercentage = maxScore > 0 ? (score / maxScore) * 100 : null
  }

  // 找到匹配的規則（使用實際分數）
  const matchingRule = actualScore !== null ? applicableRules.find(rule => {
    if (rule.condition === 'score_equals') {
      return actualScore === rule.min_score
    } else if (rule.condition === 'perfect_score') {
      return actualScore === maxScore
    } else if (rule.condition === 'score_range') {
      const minCheck = rule.min_score === null || actualScore >= rule.min_score
      const maxCheck = rule.max_score === null || actualScore <= rule.max_score
      return minCheck && maxCheck
    }
    return false
  }) : undefined

  // 用於顯示的百分比（根據評分方式）
  const displayPercentage = isRecordOnly
    ? null
    : scoreType === 'letter' && grade
    ? actualPercentage
    : score !== null && maxScore > 0
    ? (score / maxScore) * 100
    : null

  const formatFormulaForDisplay = (formula?: string | null) => {
    const f = (formula ?? '').trim()
    if (!f) return ''
    return f
      .replace(/G/g, t('formulaVars.score'))
      .replace(/M/g, t('formulaVars.maxScore'))
      .replace(/P/g, t('formulaVars.percentage'))
  }

  const getStaticRewardDisplays = (rule: RewardRule) => {
    const configItems = parseRewardConfig(rule.reward_config)

    if (configItems.length > 0) {
      return configItems.map((item, index) => {
        const type = getRewardTypeByRef(item)
        const formula = item.formula?.trim()
        const amount = Math.max(0, Math.round(Number(item.amount ?? 0)))
        const unit = item.unit || type?.default_unit || ''

        return {
          key: `config-${item.type_id || item.type_key || index}`,
          name: type?.display_name || fallbackRewardName,
          amountText: formula ? `(${formatFormulaForDisplay(formula)})` : `${amount}${unit ? ` ${unit}` : ''}`,
        }
      })
    }

    if (rule.reward_formula) {
      return [{
        key: 'legacy-formula',
        name: selectedRewardType?.display_name || fallbackRewardName,
        amountText: `(${formatFormulaForDisplay(rule.reward_formula)})`,
      }]
    }

    const amount = Math.max(0, Math.round(Number(rule.reward_amount ?? 0)))
    return [{
      key: 'legacy-amount',
      name: selectedRewardType?.display_name || fallbackRewardName,
      amountText: `${amount}${rewardUnit ? ` ${rewardUnit}` : ''}`,
    }]
  }

  const getRuleRewardDisplays = (rule: RewardRule) => {
    if (actualScore !== null && actualPercentage !== null) {
      try {
        const rewardOutput = calculateRewardOutputsFromRule({
          ruleRewardAmount: rule.reward_amount,
          ruleRewardFormula: rule.reward_formula,
          ruleRewardConfig: rule.reward_config,
          score: actualScore,
          percentage: actualPercentage,
          maxScore,
        })

        if (rewardOutput.rewards.length > 0) {
          return rewardOutput.rewards.map((item, index) => ({
            key: `calculated-${item.type_id || item.type_key || index}`,
            name: getRewardItemName(item),
            amountText: formatRewardItemAmount(item),
          }))
        }
      } catch {
        return getStaticRewardDisplays(rule)
      }
    }

    return getStaticRewardDisplays(rule)
  }

  const expectedRewardDisplays = matchingRule ? getRuleRewardDisplays(matchingRule) : []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    if (!canSubmitAssessmentType) {
      setError(locale === 'zh-TW' ? '請先在評量類別管理中啟用至少一個類別。' : 'Please enable at least one assessment type first.')
      setLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    
    try {
      const apiUrl = isEditMode ? '/api/assessments/update' : '/api/assessments/create'
      
      // 獲取標題，如果為空則自動生成
      let title = formData.get('title') as string
      if (!title || title.trim() === '') {
        const dueDate = formData.get('due_date') as string
        const assessmentType = formData.get('assessment_type') as string
        
        // 格式化日期
        const date = new Date(dueDate)
        const month = date.getMonth() + 1
        const day = date.getDate()
        const dateStr = locale === 'zh-TW' ? `${month}/${day}` : `${month}/${day}`
        
        // 獲取評量類型文字
        const typeText = getAssessmentTypeLabel(
          assessmentTypeOptions,
          assessmentType,
          locale === 'zh-TW' ? '評量' : 'Assessment'
        )
        
        // 生成標題：日期 + 評量類型
        title = `${dateStr} ${typeText}`
      }
      
      const payload: Record<string, unknown> = {
        student_id: studentId,
        subject_id: formData.get('subject_id'),
        title: title,
        assessment_type: formData.get('assessment_type'),
        score_type: isRecordOnly ? 'numeric' : scoreType,
        scoring_mode: isRecordOnly ? 'record_only' : 'scored',
        counts_toward_average: !isRecordOnly,
        counts_toward_reward: !isRecordOnly,
        max_score: isRecordOnly ? 100 : parseInt(formData.get('max_score') as string),
        due_date: formData.get('due_date'),
        notes: ((formData.get('notes') as string) || '').trim() || null,
        manual_reward: !isRecordOnly && formData.get('manual_reward') ? parseFloat(formData.get('manual_reward') as string) : null,
        reward_type_id: isRecordOnly ? null : formData.get('reward_type_id') || null,
        image_urls: imageUrls,
      }

      // 根據評分方式設定分數或等級
      // 獲取當前選中科目的等級對應（在提交時再次確認）
      const currentSubject = subjects.find(s => s.id === formData.get('subject_id') as string)
      const currentSubjectGradeMapping = currentSubject?.grade_mapping

      // 根據評分方式設定分數或等級，並確保清除另一個欄位
      if (isRecordOnly) {
        payload.grade = null
        payload.score = null
      } else if (scoreType === 'letter') {
        // 等級制：必須選擇等級
        if (!grade) {
          setError(locale === 'zh-TW' ? '請選擇等級' : 'Please select a grade')
          setLoading(false)
          return
        }
        payload.grade = grade
        // 等級制時，score 只作為內部計算用，不應該在顯示時使用
        // 但我們仍然需要計算 score 用於獎金計算
        payload.score = gradeToScore(grade, currentSubjectGradeMapping)
      } else {
        // 數字制：清除等級，使用數字分數
        payload.grade = null
        payload.score = formData.get('score') ? parseFloat(formData.get('score') as string) : null
      }

      if (isEditMode) {
        payload.assessment_id = assessment.id
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      let result
      try {
        result = await response.json()
      } catch (jsonErr) {
        throw new Error(`Failed to parse response: ${jsonErr}`)
      }

      if (response.ok) {
        setSuccess(true)
        if (onSuccess) {
          // Modal 模式：只調用回調，讓 Modal 處理關閉和刷新
          // 不在此處調用 router.refresh()，由 handleModalSuccess 處理
          setTimeout(() => {
            onSuccess()
          }, 500) // 縮短延遲，讓成功訊息顯示更快
        } else {
          // 獨立頁面模式：跳轉回學生頁面
          setTimeout(() => {
            router.push(`/student/${studentId}`)
            router.refresh()
          }, 1000)
        }
      } else {
        let errorMessage = result.error || (isEditMode ? tMessages('updateFailed') : tMessages('createFailed'))
        // 檢查是否為資料庫 schema 錯誤
        if (errorMessage && errorMessage.includes("Could not find the 'grade' column")) {
          errorMessage = locale === 'zh-TW' 
            ? '資料庫尚未更新：請執行 migration 檔案 add-grade-support.sql 來新增等級制支援欄位'
            : 'Database not updated: Please run migration file add-grade-support.sql to add grade support columns'
        }
        setError(errorMessage)
      }
    } catch (err) {
      setError(tMessages('errorOccurred') + ': ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!isEditMode || !assessment) return

    if (!confirm(`${tMessages('confirmDelete')} ${assessment.title}？\n\n${tMessages('cannotUndo')}`)) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/assessments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessment.id,
          student_id: studentId
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
          // 獨立頁面模式：跳轉回學生頁面
          router.push(`/student/${studentId}`)
          router.refresh()
        }
      } else {
        setError(result.error || tMessages('deleteFailed'))
      }
    } catch (err) {
      setError(tMessages('errorOccurred') + ': ' + (err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {!isEditMode && aiAvailable && (
        <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeMode === 'manual'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {locale === 'zh-TW' ? '手動新增' : 'Manual'}
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('ai')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeMode === 'ai'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {locale === 'zh-TW' ? 'AI 匯入' : 'AI Import'}
          </button>
        </div>
      )}

      {!isEditMode && activeMode === 'ai' ? (
        <AiAssessmentImport
          studentId={studentId}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          assessmentTypes={activeAssessmentTypeOptions
            .map((type) => ({ value: type.type_key, label: type.display_name }))}
          onConfirmed={() => {
            if (onSuccess) {
              onSuccess()
            } else {
              router.push(`/student/${studentId}`)
              router.refresh()
            }
          }}
        />
      ) : (
        <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 flex items-center gap-2">
            <span className="material-icons-outlined">error</span>
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 flex items-center gap-2">
            <span className="material-icons-outlined">check_circle</span>
            {isEditMode ? tMessages('updateSuccess') : tMessages('createSuccess')}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 科目選擇 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('subject')} *
          </label>
          <div className="grid grid-cols-5 gap-2">
            {subjects.map(subject => (
              <label 
                key={subject.id}
                className="relative flex flex-col items-center gap-1 p-2 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300"
              >
                <input
                  type="radio"
                  name="subject_id"
                  value={subject.id}
                  checked={selectedSubjectId === subject.id}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                  className="absolute top-1 right-1 w-4 h-4 text-blue-600 accent-blue-600"
                />
                {(() => {
                  // Emoji 到 Material Icons Outlined 的映射表
                  const emojiToMaterialIcon: Record<string, string> = {
                    '📖': 'auto_stories',
                    '📚': 'menu_book',
                    '🔢': 'calculate',
                    '🧮': 'calculate',
                    '🌍': 'public',
                    '🌏': 'school',
                    '🔬': 'science',
                    '🧪': 'science',
                    '🎵': 'music_note',
                    '🎹': 'piano',
                    '🎸': 'guitar',
                    '🎨': 'palette',
                    '🖌️': 'brush',
                    '⚽': 'sports_soccer',
                    '🏀': 'sports_basketball',
                    '🏐': 'sports_volleyball',
                    '🎾': 'sports_tennis',
                    '✏️': 'edit',
                    '📝': 'description',
                    '💻': 'computer',
                    '🖥️': 'desktop_windows',
                    '🌱': 'eco',
                    '🌿': 'nature',
                    '🌳': 'park',
                    '📜': 'article',
                    '📰': 'school',
                    '🎭': 'theater_comedy',
                    '🩰': 'ballet',
                    '🥁': 'drum_kit',
                    '📐': 'square_foot',
                    '⚗️': 'science',
                    '🔭': 'biotech',
                    '📄': 'description',
                    '📋': 'description',
                    '🎯': 'gps_fixed',
                    '🏫': 'school',
                    '📗': 'menu_book',
                    '📘': 'menu_book',
                    '📙': 'menu_book',
                    '📕': 'menu_book',
                  }
                  
                  // 將 emoji 轉換為 Material Icon
                  const convertEmojiToMaterialIcon = (icon: string): string => {
                    // 如果已經是 Material Icon 名稱，直接返回
                    if (/^[a-z_]+$/i.test(icon) && icon.length > 2) {
                      return icon
                    }
                    // 如果是 emoji，查找映射表
                    return emojiToMaterialIcon[icon] || 'description'
                  }
                  
                  const subjectIcon = convertEmojiToMaterialIcon(subject.icon)
                  return (
                    <span 
                      className="material-icons-outlined text-2xl" 
                      style={{ color: subject.color }}
                    >
                      {subjectIcon}
                    </span>
                  )
                })()}
                <span className="text-sm font-medium text-center text-gray-800">{subject.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 評量類型 */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-gray-700">
              {t('type')} *
            </label>
            <Link
              href="/settings/rewards?tab=assessmentTypes"
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 transition hover:text-sky-900"
            >
              <span className="material-icons-outlined text-sm">settings</span>
              {t('manageTypes')}
            </Link>
          </div>
          {canSubmitAssessmentType ? (
            <AssessmentTypeRadioGroup
              assessmentTypes={isEditMode ? assessmentTypeOptions : activeAssessmentTypeOptions}
              selectedType={selectedAssessmentType}
              onChange={setSelectedAssessmentType}
              currentType={assessment?.assessment_type}
              compact
              inactiveLabel={locale === 'zh-TW' ? '已停用' : 'Inactive'}
            />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {locale === 'zh-TW'
                ? '目前沒有啟用中的評量類別。請到管理類別復原或新增類別後再新增評量。'
                : 'No active assessment types are available. Restore or create a type before adding an assessment.'}
            </div>
          )}
        </div>

        {/* 評量標題與日期 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('title')} ({t('optional')})
            </label>
            <input
              name="title"
              type="text"
              defaultValue={assessment?.title || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={locale === 'zh-TW' ? '留空則自動生成：日期 + 評量類型' : 'Leave blank to auto-generate: Date + Type'}
            />
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span className="material-icons-outlined text-sm">lightbulb</span>
              {locale === 'zh-TW' ? '留空將自動產生名稱，例如：12/25 測驗' : 'Leave blank to auto-generate, e.g., 12/25 Quiz'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('dueDate')}
            </label>
            <input
              name="due_date"
              type="date"
              defaultValue={
                assessment?.due_date 
                  ? new Date(assessment.due_date).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0]
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 評分方式選擇 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {locale === 'zh-TW' ? '評分方式' : 'Scoring Method'}
          </label>
          <select
            value={scoreType}
            onChange={(e) => {
              const newType = e.target.value as 'numeric' | 'letter' | 'record_only'
              setScoreType(newType)
              if (newType === 'letter') {
                setScore(null) // 清除數字分數
              } else if (newType === 'numeric') {
                setGrade(null) // 清除等級
              } else {
                setScore(null)
                setGrade(null)
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="numeric">{locale === 'zh-TW' ? '數字分數' : 'Numeric Score'}</option>
            <option value="letter">{locale === 'zh-TW' ? '等級制 (A+ ~ F)' : 'Letter Grade (A+ ~ F)'}</option>
            <option value="record_only">{locale === 'zh-TW' ? '不計分，只留紀錄' : 'No Score, Record Only'}</option>
          </select>
        </div>

        {isRecordOnly ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <span className="material-icons-outlined text-base text-slate-500">inventory_2</span>
              <p>
                {locale === 'zh-TW'
                  ? '這筆評量會保留日期、備註與圖片，不列入平均，也不會產生獎勵。'
                  : 'This assessment keeps the date, notes, and images without affecting averages or rewards.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 分數、滿分、獎金 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {scoreType === 'letter'
                    ? (locale === 'zh-TW' ? '等級' : 'Grade')
                    : `${t('score')} (${t('optional')})`
                  }
                </label>
                {scoreType === 'numeric' ? (
                  <>
                    <input
                      name="score"
                      type="number"
                      min="0"
                      max="150"
                      step="0.5"
                      value={score !== null ? score : ''}
                      onChange={(e) => setScore(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('scorePlaceholder') || '例如：95'}
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <span className="material-icons-outlined text-sm">lightbulb</span>
                      {t('scoreHint') || '留空表示尚未完成'}
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      value={grade || ''}
                      onChange={(e) => setGrade(e.target.value ? (e.target.value as Grade) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{locale === 'zh-TW' ? '請選擇等級' : 'Select Grade'}</option>
                      {GRADE_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <span className="material-icons-outlined text-sm">lightbulb</span>
                      {locale === 'zh-TW' ? '選擇等級後會自動轉換為分數計算獎金' : 'Grade will be converted to score for reward calculation'}
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('maxScore')}
                </label>
                <input
                  name="max_score"
                  type="number"
                  min="1"
                  value={maxScore}
                  onChange={(e) => setMaxScore(parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('manualReward')}
                </label>
                <input
                  name="manual_reward"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={assessment?.reward_amount || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('rewardPlaceholder') || '留空則根據規則自動計算'}
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">lightbulb</span>
                  {t('rewardHint') || '可以手動修改獎金金額，留空則根據獎金規則計算'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {locale === 'zh-TW' ? '獎勵類型' : 'Reward Type'}
              </label>
              <select
                name="reward_type_id"
                value={selectedRewardTypeId}
                onChange={(e) => setSelectedRewardTypeId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {rewardTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {getRewardTypeDisplayName(type)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span className="material-icons-outlined text-sm">lightbulb</span>
                {locale === 'zh-TW'
                  ? `此評量產生的獎勵交易會記錄為所選類型（單位：${rewardUnit}）`
                  : `Transactions from this assessment will use the selected reward type (unit: ${rewardUnit})`}
              </p>
            </div>
          </>
        )}

        {/* 備註 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {locale === 'zh-TW' ? '備註' : 'Notes'} ({t('optional')})
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={assessment?.notes || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            placeholder={locale === 'zh-TW' ? '可填寫此次評量的補充說明' : 'Optional additional details for this assessment'}
          />
        </div>

        {/* 評量圖片上傳 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {locale === 'zh-TW' ? '評量圖片' : 'Assessment Images'}
          </label>
          <ImageUploader
            images={imageUrls}
            onChange={setImageUrls}
            maxCount={10}
            uploadEndpoint="/api/assessments/upload-image"
            deleteEndpoint="/api/assessments/delete-image"
            idFieldName="assessmentId"
            entityId={assessment?.id}
          />
        </div>

        {/* 分數預覽與預期獎勵 */}
        {!isRecordOnly && ((scoreType === 'numeric' && score !== null) || (scoreType === 'letter' && grade)) && displayPercentage !== null && (
          <div className={`p-3 rounded-lg border-2 ${
            matchingRule 
              ? 'bg-green-50 border-green-300' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {scoreType === 'letter' ? (
                    <>
                      {locale === 'zh-TW' ? '等級' : 'Grade'}: <span className="font-bold text-gray-800 text-xl">{grade}</span>
                      {actualScore !== null && (
                        <span className="ml-2 text-gray-500">
                          ({locale === 'zh-TW' ? '相當於' : 'equivalent to'} {actualScore.toFixed(1)}/{maxScore}, {displayPercentage.toFixed(1)}%)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {locale === 'zh-TW' ? '分數' : 'Score'}: <span className="font-bold text-gray-800">{score}/{maxScore}</span> ({displayPercentage.toFixed(1)}%)
                    </>
                  )}
                </p>
              </div>
              {matchingRule ? (
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {locale === 'zh-TW' ? '預期獎勵' : 'Expected Reward'}
                  </p>
                  <div className="space-y-1">
                    {expectedRewardDisplays.length > 0 ? expectedRewardDisplays.map((reward) => (
                      <div key={reward.key}>
                        <p className="text-xs font-semibold text-gray-500">{reward.name}</p>
                        <p className="text-2xl font-bold text-green-600">+{reward.amountText}</p>
                      </div>
                    )) : (
                      <p className="text-2xl font-bold text-green-600">+0 {rewardUnit}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {locale === 'zh-TW' ? '根據' : 'Based on'} &quot;{matchingRule.rule_name}&quot;
                  </p>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {locale === 'zh-TW' ? '無匹配規則' : 'No matching rule'}
                  </p>
                  <p className="text-xl font-bold text-gray-400">
                    0 {rewardUnit}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 獎金規則預覽（可折疊） */}
        {!isRecordOnly && selectedSubjectId && applicableRules.length > 0 ? (
          <div className={`border-2 rounded-lg overflow-hidden ${matchingRule ? 'border-green-300' : 'border-blue-200'}`}>
            {/* 折疊按鈕 */}
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className={`w-full p-3 transition-all duration-200 flex items-center justify-between ${
                matchingRule 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100'
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span 
                  className={`text-lg text-blue-600 transition-transform duration-300 ${
                    showRules ? 'rotate-90' : 'rotate-0'
                  }`}
                >
                  ▶
                </span>
                <div>
                  <h3 className={`font-semibold flex items-center gap-2 ${matchingRule ? 'text-green-800' : 'text-blue-800'}`}>
                    💎 {t('applicableRules')}
                    <span className="text-xs font-normal text-gray-600">
                      ({applicableRules.length} {locale === 'zh-TW' ? '條規則' : 'rules'})
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 text-left">
                    {locale === 'zh-TW' ? '適用於' : 'For'}: {selectedAssessmentTypeLabel}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold transition-all duration-200 ${matchingRule ? 'text-green-600' : 'text-blue-600'}`}>
                {showRules 
                  ? (locale === 'zh-TW' ? '點擊收起' : 'Click to collapse')
                  : (locale === 'zh-TW' ? '點擊查看' : 'Click to view')}
              </span>
            </button>

            {/* 規則列表（可折疊，带动画） */}
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showRules ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-3 bg-white">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {applicableRules.map((rule) => {
                // 判斷規則類型
                let ruleTypeLabel = ''
                let ruleTypeBadge = ''
                if (rule.student_id && rule.subject_id) {
                  ruleTypeLabel = t('ruleTypes.exclusive')
                  ruleTypeBadge = 'bg-purple-100 text-purple-700'
                } else if (rule.subject_id) {
                  ruleTypeLabel = t('ruleTypes.subject')
                  ruleTypeBadge = 'bg-blue-100 text-blue-700'
                } else if (rule.student_id) {
                  ruleTypeLabel = t('ruleTypes.student')
                  ruleTypeBadge = 'bg-green-100 text-green-700'
                } else {
                  ruleTypeLabel = t('ruleTypes.global')
                  ruleTypeBadge = 'bg-gray-100 text-gray-700'
                }

                // 格式化分數範圍
                let scoreRange = ''
                const pointsUnit = locale === 'zh-TW' ? '分' : ' pts'
                if (rule.condition === 'score_equals') {
                  scoreRange = `= ${rule.min_score}${pointsUnit}`
                } else if (rule.condition === 'score_range') {
                  if (rule.min_score !== null && rule.max_score !== null) {
                    scoreRange = `${rule.min_score}-${rule.max_score}${pointsUnit}`
                  } else if (rule.min_score !== null) {
                    scoreRange = `≥ ${rule.min_score}${pointsUnit}`
                  } else if (rule.max_score !== null) {
                    scoreRange = `≤ ${rule.max_score}${pointsUnit}`
                  }
                } else if (rule.condition === 'perfect_score') {
                  scoreRange = t('perfectScore')
                }

                // 檢查是否為當前匹配的規則
                const isMatching = matchingRule?.id === rule.id
                const rewardDisplays = getRuleRewardDisplays(rule)

                return (
                  <div 
                    key={rule.id} 
                    className={`flex flex-col gap-2 p-2 rounded-lg border-2 transition-all ${
                      isMatching 
                        ? 'bg-green-100 border-green-500 ring-2 ring-green-300 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${ruleTypeBadge}`}>
                        {ruleTypeLabel}
                      </span>
                      <div className="text-right">
                        {rewardDisplays.map((reward) => (
                          <p
                            key={reward.key}
                            className={`text-base font-bold ${isMatching ? 'text-green-700 text-lg' : 'text-green-600'}`}
                          >
                            {reward.name}: +{reward.amountText}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800 truncate" title={rule.rule_name}>
                        {rule.rule_name}
                      </p>
                      <p className="text-xs text-gray-600">{scoreRange}</p>
                      {rewardDisplays.some((reward) => reward.amountText.startsWith('(')) && (
                        <p className="text-[11px] text-gray-500">{t('formulaLabel')}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {locale === 'zh-TW' ? '優先級' : 'Priority'} {rule.priority}
                    </p>
                  </div>
                )
              })}
                </div>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800 flex items-start gap-1">
                    <span className="material-icons-outlined text-sm mt-0.5">lightbulb</span>
                    <span>
                      <strong>{locale === 'zh-TW' ? '提示：' : 'Note:'}</strong>
                    {locale === 'zh-TW' 
                      ? '系統會自動選擇最高優先級的符合規則來計算獎金。優先級：專屬規則 > 科目規則 > 學生規則 > 全局規則' 
                      : 'The system will automatically select the highest priority matching rule to calculate rewards. Priority: Exclusive > Subject > Student > Global'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : !isRecordOnly && selectedSubjectId ? (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600 text-sm">
              ℹ️ {t('noRules')}
            </p>
          </div>
        ) : null}

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || success || deleting || !canSubmitAssessmentType}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 text-lg cursor-pointer"
          >
            {loading 
              ? (isEditMode ? tMessages('updating') : tMessages('creating'))
              : success 
              ? '✅ ' + (isEditMode ? tMessages('updated') : tMessages('created'))
              : isEditMode ? '💾 ' + tCommon('save') : '➕ ' + t('createAssessment')}
          </button>
          
          <button
            type="button"
            onClick={() => onCancel ? onCancel() : router.back()}
            disabled={loading || deleting}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
        </div>

        {/* 危險區域：刪除（僅編輯模式，預設收折） */}
        {isEditMode && (
          <div className="border-t-2 border-red-200 pt-6 mt-6">
            <button
              type="button"
              onClick={() => setShowDangerZone(!showDangerZone)}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-left hover:bg-red-100 transition-colors duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-lg text-red-600 transition-transform duration-300 shrink-0 ${
                    showDangerZone ? 'rotate-90' : 'rotate-0'
                  }`}
                >
                  ▶
                </span>
                <h3 className="text-lg font-bold text-red-600 truncate">
                  ⚠️ {tMessages('dangerZone')}
                </h3>
              </div>
              <span className="text-xs font-semibold text-red-600 shrink-0">
                {showDangerZone
                  ? (locale === 'zh-TW' ? '點擊收起' : 'Click to collapse')
                  : (locale === 'zh-TW' ? '點擊展開' : 'Click to expand')}
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showDangerZone ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  {tMessages('deleteWarning')}
                </p>
                <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
                  <li>{tMessages('deleteItem1')}</li>
                  <li>{tMessages('deleteItem2')}</li>
                  <li className="text-red-600 font-bold">{tMessages('cannotUndo')}</li>
                </ul>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading || deleting || success}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 font-semibold cursor-pointer"
                >
                  {deleting ? tMessages('deleting') : '🗑️ ' + tMessages('deleteThis')}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
        </>
      )}
    </>
  )
}
