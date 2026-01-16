'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { calculateRewardFromRule } from '@/lib/rewardFormula'
import { gradeToScore, gradeToPercentage, GRADE_OPTIONS, type Grade } from '@/lib/gradeConverter'

interface Subject {
  id: string
  name: string
  color: string
  icon: string
  grade_mapping?: any
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
  priority: number
  is_active: boolean
  assessment_type: string | null
}

interface Props {
  studentId: string
  subjects: Subject[]
  rewardRules: RewardRule[]
  defaultAssessmentType: string
}

export default function AddAssessmentForm({ studentId, subjects, rewardRules, defaultAssessmentType }: Props) {
  const router = useRouter()
  const t = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '')
  const [selectedAssessmentType, setSelectedAssessmentType] = useState(defaultAssessmentType)
  const [scoreType, setScoreType] = useState<'numeric' | 'letter'>('numeric')
  const [score, setScore] = useState<number | null>(null)
  const [grade, setGrade] = useState<Grade | null>(null)
  const [maxScore, setMaxScore] = useState(100)
  const [showRules, setShowRules] = useState(false)

  // 根據選中的科目和評量類型篩選適用的規則
  const getApplicableRules = () => {
    if (!selectedSubjectId) return []
    
    return rewardRules
      .filter(rule => {
        // 先檢查評量類型是否匹配
        // 如果規則指定了評量類型，必須匹配；如果沒指定，則適用於所有類型
        const typeMatches = !rule.assessment_type || rule.assessment_type === selectedAssessmentType
        if (!typeMatches) return false

        // 全局規則
        if (!rule.student_id && !rule.subject_id) return true
        // 學生規則
        if (rule.student_id === studentId && !rule.subject_id) return true
        // 科目規則（該科目的全局規則）
        if (!rule.student_id && rule.subject_id === selectedSubjectId) return true
        // 科目+學生規則（最高優先級）
        if (rule.student_id === studentId && rule.subject_id === selectedSubjectId) return true
        return false
      })
      .sort((a, b) => b.priority - a.priority)
  }

  const applicableRules = getApplicableRules()

  // 獲取當前選中科目的等級對應
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const subjectGradeMapping = selectedSubject?.grade_mapping

  // 計算實際用於獎金計算的分數和百分比
  let actualScore: number | null = null
  let actualPercentage: number | null = null

  if (scoreType === 'letter' && grade) {
    actualScore = gradeToScore(grade, subjectGradeMapping)
    actualPercentage = gradeToPercentage(grade, maxScore, subjectGradeMapping)
  } else if (scoreType === 'numeric' && score !== null) {
    actualScore = score
    actualPercentage = maxScore > 0 ? (score / maxScore) * 100 : null
  }

  // 找到當前分數對應的規則（使用實際百分比）
  const getMatchingRule = () => {
    if (actualPercentage === null) return null
    
    for (const rule of applicableRules) {
      let matches = false
      
      if (rule.condition === 'perfect_score') {
        matches = actualPercentage === 100
      } else if (rule.condition === 'score_equals') {
        matches = actualPercentage === rule.min_score
      } else if (rule.condition === 'score_range') {
        const minOk = rule.min_score === null || actualPercentage >= rule.min_score
        const maxOk = rule.max_score === null || actualPercentage <= rule.max_score
        matches = minOk && maxOk
      }
      
      if (matches) return rule
    }
    return null
  }

  const matchingRule = getMatchingRule()
  const expectedReward = matchingRule && actualScore !== null && actualPercentage !== null
    ? calculateRewardFromRule({
        ruleRewardAmount: matchingRule.reward_amount,
        ruleRewardFormula: matchingRule.reward_formula,
        score: actualScore,
        percentage: actualPercentage,
        maxScore,
      })
    : 0

  // 用於顯示的百分比
  const displayPercentage = scoreType === 'letter' && grade
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    
    try {
      // 如果沒有填寫評量名稱，自動生成：[日期][科目][評量類型]
      let title = formData.get('title') as string
      if (!title || title.trim() === '') {
        const dueDate = formData.get('due_date') as string
        const subjectId = formData.get('subject_id') as string
        const assessmentType = formData.get('assessment_type') as string
        
        // 格式化日期 (例如: 12/16)
        const dateStr = dueDate 
          ? new Date(dueDate).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
          : '未定'
        
        // 找到科目名稱
        const subject = subjects.find(s => s.id === subjectId)
        const subjectName = subject ? subject.name : '未知科目'
        
        // 評量類型映射
        const typeMap: Record<string, string> = {
          'exam': '考試',
          'quiz': '小考',
          'homework': '作業',
          'project': '專題'
        }
        const typeName = typeMap[assessmentType] || assessmentType
        
        // 生成名稱：日期 科目 類型
        title = `${dateStr} ${subjectName} ${typeName}`
      }
      
      const manualReward = formData.get('manual_reward')
      
      // 根據評分方式設定分數或等級
      const payload: any = {
        student_id: studentId,
        subject_id: formData.get('subject_id'),
        title: title,
        assessment_type: formData.get('assessment_type'),
        score_type: scoreType,
        max_score: parseFloat(formData.get('max_score') as string) || 100,
        due_date: formData.get('due_date') || null,
        manual_reward: manualReward ? parseFloat(manualReward as string) : null,
      }

      // 獲取當前選中科目的等級對應
      const selectedSubject = subjects.find(s => s.id === formData.get('subject_id') as string)
      const subjectGradeMapping = selectedSubject?.grade_mapping

      if (scoreType === 'letter') {
        // 等級制：必須選擇等級
        if (!grade) {
          setError(locale === 'zh-TW' ? '請選擇等級' : 'Please select a grade')
          setLoading(false)
          return
        }
        payload.grade = grade
        // 等級制時，score 只作為內部計算用，不應該在顯示時使用
        payload.score = gradeToScore(grade, subjectGradeMapping)
      } else {
        payload.score = formData.get('score') ? parseFloat(formData.get('score') as string) : null
        payload.grade = null
      }

      const response = await fetch('/api/assessments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/student/${studentId}`)
          router.refresh()
        }, 1500)
      } else {
        setError(result.error || tMessages('createFailed'))
      }
    } catch (err) {
      setError(tMessages('error') + ': ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
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
            {tMessages('createSuccess')}! {locale === 'zh-TW' ? '正在返回...' : 'Redirecting...'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 科目選擇 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t('subject')} *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {subjects.map(subject => (
              <label 
                key={subject.id}
                className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300"
              >
                <input
                  type="radio"
                  name="subject_id"
                  value={subject.id}
                  checked={selectedSubjectId === subject.id}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                  className="w-5 h-5 text-blue-600 accent-blue-600"
                />
                <span className="text-lg font-medium text-gray-800 flex items-center gap-2">
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
                        className="material-icons-outlined" 
                        style={{ color: subject.color }}
                      >
                        {subjectIcon}
                      </span>
                    )
                  })()}
                  {subject.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 評量標題 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('title')} ({locale === 'zh-TW' ? '選填' : 'Optional'})
          </label>
          <input
            name="title"
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={locale === 'zh-TW' ? '留空則自動生成：日期 科目 類型' : 'Auto-generate if left blank: Date Subject Type'}
          />
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span className="material-icons-outlined text-sm">lightbulb</span>
            {locale === 'zh-TW' ? '例如：12/16 國語 考試' : 'e.g.: 12/16 Chinese Exam'}
          </p>
        </div>

        {/* 評量類型 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t('type')} *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="exam"
                checked={selectedAssessmentType === 'exam'}
                onChange={() => setSelectedAssessmentType('exam')}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800 flex items-center gap-2">
                <span className="material-icons-outlined text-red-600">assignment</span>
                {t('types.exam')}
              </span>
            </label>
            
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="quiz"
                checked={selectedAssessmentType === 'quiz'}
                onChange={() => setSelectedAssessmentType('quiz')}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800 flex items-center gap-2">
                <span className="material-icons-outlined text-blue-600">checklist_rtl</span>
                {t('types.quiz')}
              </span>
            </label>
            
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="homework"
                checked={selectedAssessmentType === 'homework'}
                onChange={() => setSelectedAssessmentType('homework')}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800 flex items-center gap-2">
                <span className="material-icons-outlined text-green-600">edit_note</span>
                {t('types.homework')}
              </span>
            </label>
            
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="project"
                checked={selectedAssessmentType === 'project'}
                onChange={() => setSelectedAssessmentType('project')}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800 flex items-center gap-2">
                <span className="material-icons-outlined text-purple-600">palette</span>
                {t('types.project')}
              </span>
            </label>
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
              const newType = e.target.value as 'numeric' | 'letter'
              setScoreType(newType)
              if (newType === 'letter') {
                setScore(null) // 清除數字分數
              } else {
                setGrade(null) // 清除等級
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="numeric">{locale === 'zh-TW' ? '數字分數' : 'Numeric Score'}</option>
            <option value="letter">{locale === 'zh-TW' ? '等級制 (A+ ~ F)' : 'Letter Grade (A+ ~ F)'}</option>
          </select>
        </div>

        {/* 分數 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {scoreType === 'letter' 
                ? (locale === 'zh-TW' ? '等級' : 'Grade')
                : `${t('score')} (${locale === 'zh-TW' ? '選填' : 'Optional'})`
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
                  value={score ?? ''}
                  onChange={(e) => setScore(e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={locale === 'zh-TW' ? '例如：95' : 'e.g.: 95'}
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">lightbulb</span>
                  {locale === 'zh-TW' ? '留空表示尚未完成' : 'Leave blank if not completed'}
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
        </div>

        {/* 分數預覽與預期獎金 */}
        {((scoreType === 'numeric' && score !== null) || (scoreType === 'letter' && grade)) && displayPercentage !== null && (
          <div className={`p-4 rounded-lg border-2 ${
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
                    {locale === 'zh-TW' ? '預期獎金' : 'Expected Reward'}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    +${expectedReward}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === 'zh-TW' ? '根據' : 'Based on'} "{matchingRule.rule_name}"
                  </p>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {locale === 'zh-TW' ? '無匹配規則' : 'No matching rule'}
                  </p>
                  <p className="text-xl font-bold text-gray-400">
                    $0
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 獎金金額 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('manualReward')}
          </label>
          <input
            name="manual_reward"
            type="number"
            min="0"
            step="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('manualRewardHint')}
          />
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span className="material-icons-outlined text-sm">lightbulb</span>
            {t('manualRewardHint')}
          </p>
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('dueDate')}
          </label>
          <input
            name="due_date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 獎金規則預覽（可折疊） */}
        {selectedSubjectId && applicableRules.length > 0 ? (
          <div className={`border-2 rounded-lg overflow-hidden ${matchingRule ? 'border-green-300' : 'border-blue-200'}`}>
            {/* 折疊按鈕 */}
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className={`w-full p-4 transition-all duration-200 flex items-center justify-between ${
                matchingRule 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100'
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span 
                  className={`text-xl text-blue-600 transition-transform duration-300 ${
                    showRules ? 'rotate-90' : 'rotate-0'
                  }`}
                >
                  ▶
                </span>
                <div>
                  <h3 className={`font-bold flex items-center gap-2 ${matchingRule ? 'text-green-800' : 'text-blue-800'}`}>
                    💎 {t('applicableRules')}
                    <span className="text-xs font-normal text-gray-600">
                      ({applicableRules.length} {locale === 'zh-TW' ? '條規則' : 'rules'})
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 text-left">
                    {locale === 'zh-TW' ? '適用於' : 'For'}: {t(`types.${selectedAssessmentType}`)}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold transition-all duration-200 ${matchingRule ? 'text-green-600' : 'text-blue-600'}`}>
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
              <div className="p-4 bg-white">
                <ul className="space-y-2">
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
                const formulaDisplay = rule.reward_formula ? formatFormulaForDisplay(rule.reward_formula) : ''
                const amountDisplay = Math.max(0, Math.round(Number(rule.reward_amount ?? 0)))

                return (
                  <li 
                    key={rule.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      isMatching 
                        ? 'bg-green-100 border-green-500 ring-2 ring-green-300 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${ruleTypeBadge}`}>
                          {ruleTypeLabel}
                        </span>
                        {isMatching && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500 text-white">
                            ✓ {locale === 'zh-TW' ? '符合' : 'Match'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className={`font-semibold ${isMatching ? 'text-green-800' : 'text-gray-800'}`}>
                          {rule.rule_name}
                        </p>
                        <p className={`text-sm ${isMatching ? 'text-green-700' : 'text-gray-600'}`}>
                          {scoreRange}
                        </p>
                        {rule.reward_formula && (
                          <p className="text-xs text-gray-500">
                            {t('formulaLabel')}: {formulaDisplay}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isMatching ? 'text-green-700 text-2xl' : 'text-green-600'}`}>
                        {rule.reward_formula ? `+(${formulaDisplay})` : `+${amountDisplay}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {locale === 'zh-TW' ? '優先級' : 'Priority'} {rule.priority}
                      </p>
                    </div>
                  </li>
                )
              })}
                </ul>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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
        ) : selectedSubjectId ? (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <span className="material-icons-outlined text-sm">info</span>
              {t('noRules')}
            </p>
          </div>
        ) : null}

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || success}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading 
              ? (locale === 'zh-TW' ? '添加中...' : 'Adding...')
              : success 
              ? (
                  <>
                    <span className="material-icons-outlined align-middle mr-1">check_circle</span>
                    {locale === 'zh-TW' ? '已添加' : 'Added'}
                  </>
                )
              : (
                  <>
                    <span className="material-icons-outlined align-middle mr-1">check_circle</span>
                    {locale === 'zh-TW' ? '添加評量' : `${tCommon('add')} ${t('type')}`}
                  </>
                )}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            {tCommon('cancel')}
          </button>
        </div>
      </form>
    </>
  )
}

