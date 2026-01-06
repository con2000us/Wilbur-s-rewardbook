'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface Subject {
  id: string
  name: string
  color: string
  icon: string
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
  reward_amount?: number | null
  penalty_amount?: number | null
  description?: string | null
  notes?: string | null
  completed_date?: string | null
  subjects?: {
    id: string
    name: string
    color: string
    icon: string
  }
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
  assessment_type?: string | null
}

interface Props {
  studentId: string
  assessment: Assessment
  subjects: Subject[]
  rewardRules: RewardRule[]
}

export default function EditAssessmentForm({ studentId, assessment, subjects, rewardRules }: Props) {
  const router = useRouter()
  const t = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState(assessment.subject_id)
  const [selectedAssessmentType, setSelectedAssessmentType] = useState(assessment.assessment_type)
  const [currentScore, setCurrentScore] = useState(assessment.score || null)
  const [currentMaxScore, setCurrentMaxScore] = useState(assessment.max_score)

  const formatFormulaForDisplay = (formula?: string | null) => {
    const f = (formula ?? '').trim()
    if (!f) return ''
    return f
      .replace(/G/g, t('formulaVars.score'))
      .replace(/M/g, t('formulaVars.maxScore'))
      .replace(/P/g, t('formulaVars.percentage'))
  }

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    
    try {
      const manualReward = formData.get('manual_reward')
      const response = await fetch('/api/assessments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessment.id,
          student_id: studentId,
          subject_id: formData.get('subject_id'),
          title: formData.get('title'),
          assessment_type: formData.get('assessment_type'),
          score: formData.get('score') ? parseFloat(formData.get('score') as string) : null,
          max_score: parseFloat(formData.get('max_score') as string) || 100,
          due_date: formData.get('due_date') || null,
          status: formData.get('score') ? 'completed' : 'upcoming',
          manual_reward: manualReward ? parseFloat(manualReward as string) : null,
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/student/${studentId}`)
          router.refresh()
        }, 1000)
      } else {
        setError(result.error || '更新失敗，請稍後再試')
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(t('deleteConfirm'))) {
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
          student_id: studentId,
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('✅ 評量已刪除')
        router.push(`/student/${studentId}`)
        router.refresh()
      } else {
        setError(result.error || '刪除失敗，請稍後再試')
      }
    } catch (err) {
      setError('發生錯誤：' + (err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">✅ 評量更新成功！正在返回...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 科目選擇 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            科目 *
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
                <span className="text-lg font-medium text-gray-800">
                  {subject.icon} {subject.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 評量標題 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            評量名稱 *
          </label>
          <input
            name="title"
            type="text"
            required
            defaultValue={assessment.title}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例如：第一次月考"
          />
        </div>

        {/* 評量類型 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            評量類型 *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="exam"
                checked={selectedAssessmentType === 'exam'}
                onChange={(e) => setSelectedAssessmentType(e.target.value)}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800">📝 {t('types.exam')}</span>
            </label>
            
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="quiz"
                checked={selectedAssessmentType === 'quiz'}
                onChange={(e) => setSelectedAssessmentType(e.target.value)}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800">📋 {t('types.quiz')}</span>
            </label>
            
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="homework"
                checked={selectedAssessmentType === 'homework'}
                onChange={(e) => setSelectedAssessmentType(e.target.value)}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800">📓 {t('types.homework')}</span>
            </label>
            
            <label className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:shadow-md hover:border-blue-400 hover:bg-blue-50 border-gray-300">
              <input
                type="radio"
                name="assessment_type"
                value="project"
                checked={selectedAssessmentType === 'project'}
                onChange={(e) => setSelectedAssessmentType(e.target.value)}
                required
                className="w-5 h-5 text-blue-600 accent-blue-600"
              />
              <span className="text-lg font-medium text-gray-800">🎨 {t('types.project')}</span>
            </label>
          </div>
        </div>

        {/* 分數 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              得分（選填）
            </label>
            <input
              name="score"
              type="number"
              min="0"
              max="150"
              step="0.5"
              defaultValue={assessment.score || ''}
              onChange={(e) => setCurrentScore(e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如：95"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 留空表示尚未完成
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              滿分
            </label>
            <input
              name="max_score"
              type="number"
              min="1"
              defaultValue={assessment.max_score}
              onChange={(e) => setCurrentMaxScore(parseInt(e.target.value) || 100)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            截止/考試日期
          </label>
          <input
            name="due_date"
            type="date"
            defaultValue={assessment.due_date ? new Date(assessment.due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 獎金金額 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            獎金金額
          </label>
          <input
            name="manual_reward"
            type="number"
            min="0"
            step="1"
            defaultValue={assessment.reward_amount || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="留空則根據規則自動計算"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 可以手動修改獎金金額，留空則根據獎金規則重新計算
          </p>
        </div>

        {/* 獎金規則預覽（可折疊） - 與新增評量一致 */}
        {selectedSubjectId && applicableRules.length > 0 ? (
          <div className={`border-2 rounded-lg overflow-hidden ${
            currentScore !== null && currentMaxScore 
              ? applicableRules.some(rule => {
                  const percentage = (currentScore / currentMaxScore) * 100
                  if (rule.condition === 'score_equals') return currentScore === rule.min_score
                  if (rule.condition === 'perfect_score') return currentScore === currentMaxScore
                  if (rule.condition === 'score_range') {
                    const minCheck = rule.min_score === null || currentScore >= rule.min_score
                    const maxCheck = rule.max_score === null || currentScore <= rule.max_score
                    return minCheck && maxCheck
                  }
                  return false
                })
                ? 'border-green-300' 
                : 'border-blue-200'
              : 'border-blue-200'
          }`}>
            {/* 折疊按鈕 */}
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className={`w-full p-4 transition-all duration-200 flex items-center justify-between ${
                currentScore !== null && currentMaxScore && applicableRules.some(rule => {
                  if (rule.condition === 'score_equals') return currentScore === rule.min_score
                  if (rule.condition === 'perfect_score') return currentScore === currentMaxScore
                  if (rule.condition === 'score_range') {
                    const minCheck = rule.min_score === null || currentScore >= rule.min_score
                    const maxCheck = rule.max_score === null || currentScore <= rule.max_score
                    return minCheck && maxCheck
                  }
                  return false
                })
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100'
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span 
                  className={`text-xl transition-transform duration-300 ${
                    showRules ? 'rotate-90' : 'rotate-0'
                  }`}
                >
                  ▶
                </span>
                <div>
                  <h3 className={`font-bold flex items-center gap-2 ${
                    currentScore !== null && currentMaxScore && applicableRules.some(rule => {
                      if (rule.condition === 'score_equals') return currentScore === rule.min_score
                      if (rule.condition === 'perfect_score') return currentScore === currentMaxScore
                      if (rule.condition === 'score_range') {
                        const minCheck = rule.min_score === null || currentScore >= rule.min_score
                        const maxCheck = rule.max_score === null || currentScore <= rule.max_score
                        return minCheck && maxCheck
                      }
                      return false
                    })
                      ? 'text-green-800' 
                      : 'text-blue-800'
                  }`}>
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
              <span className={`text-sm font-semibold transition-all duration-200 ${
                currentScore !== null && currentMaxScore && applicableRules.some(rule => {
                  if (rule.condition === 'score_equals') return currentScore === rule.min_score
                  if (rule.condition === 'perfect_score') return currentScore === currentMaxScore
                  if (rule.condition === 'score_range') {
                    const minCheck = rule.min_score === null || currentScore >= rule.min_score
                    const maxCheck = rule.max_score === null || currentScore <= rule.max_score
                    return minCheck && maxCheck
                  }
                  return false
                }) ? 'text-green-600' : 'text-blue-600'
              }`}>
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
                const isMatching = currentScore !== null && currentMaxScore && (() => {
                  if (rule.condition === 'score_equals') return currentScore === rule.min_score
                  if (rule.condition === 'perfect_score') return currentScore === currentMaxScore
                  if (rule.condition === 'score_range') {
                    const minCheck = rule.min_score === null || currentScore >= rule.min_score
                    const maxCheck = rule.max_score === null || currentScore <= rule.max_score
                    return minCheck && maxCheck
                  }
                  return false
                })()
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
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{rule.rule_name}</p>
                        <p className="text-sm text-gray-600">{scoreRange}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isMatching ? 'text-green-700 text-2xl' : 'text-green-600'}`}>
                        {rule.reward_formula ? `+(${formulaDisplay})` : `$${amountDisplay}`}
                      </p>
                      {rule.reward_formula && (
                        <p className="text-[11px] text-gray-500">
                          {t('formulaLabel')}: {formulaDisplay}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {locale === 'zh-TW' ? '優先級' : 'Priority'} {rule.priority}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>💡 {locale === 'zh-TW' ? '提示：' : 'Note:'}</strong>
                {locale === 'zh-TW' 
                  ? '系統會自動選擇最高優先級的符合規則來計算獎金。優先級：專屬規則 > 科目規則 > 學生規則 > 全局規則' 
                  : 'The system will automatically select the highest priority matching rule to calculate rewards. Priority: Exclusive > Subject > Student > Global'}
              </p>
            </div>
          </div>
            </div>
          </div>
        ) : selectedSubjectId ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600 text-sm">
              ℹ️ {locale === 'zh-TW' ? '此科目尚未設置獎金規則' : 'No reward rules set for this subject'}
            </p>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600 text-sm">
              ℹ️ {locale === 'zh-TW' ? '請先選擇科目以查看適用的獎金規則' : 'Please select a subject first to view applicable reward rules'}
            </p>
          </div>
        )}

        {/* 按鈕區域 */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || success || deleting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 text-lg cursor-pointer"
          >
            {loading ? '更新中...' : success ? '✅ 已更新' : '💾 保存更改'}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading || deleting}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
          >
            取消
          </button>
        </div>

        {/* 危險區域：刪除 */}
        <div className="border-t-2 border-red-200 pt-6 mt-6">
          <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ 危險操作</h3>
          <p className="text-sm text-gray-600 mb-4">
            刪除此評量將會：
          </p>
          <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
            <li>永久刪除此評量記錄</li>
            <li>刪除相關的交易記錄</li>
            <li>此操作無法復原</li>
          </ul>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleting || success}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 font-semibold cursor-pointer"
          >
            {deleting ? '刪除中...' : '🗑️ 刪除此評量'}
          </button>
        </div>
      </form>
    </>
  )
}

