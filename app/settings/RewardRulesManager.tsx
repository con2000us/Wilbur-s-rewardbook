'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
}

interface Subject {
  id: string
  student_id: string
  name: string
  color: string
  icon: string
}

interface RewardRule {
  id: string
  student_id: string | null
  subject_id: string | null
  rule_name: string
  description: string | null
  icon: string
  color: string
  min_score: number
  max_score: number
  reward_amount: number
  priority: number
  is_active: boolean
  students?: { name: string }
  subjects?: { name: string; color: string; icon: string }
}

interface Props {
  students: Student[]
  subjects: Subject[]
  initialRules: RewardRule[]
}

export default function RewardRulesManager({ students, subjects, initialRules }: Props) {
  const router = useRouter()
  const [rules, setRules] = useState(initialRules)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const studentId = formData.get('student_id') as string
    const subjectId = formData.get('subject_id') as string

    try {
      const response = await fetch('/api/reward-rules/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId === 'global' ? null : studentId,
          subject_id: subjectId === 'global' ? null : subjectId,
          rule_name: formData.get('rule_name'),
          description: formData.get('description'),
          icon: formData.get('icon'),
          color: formData.get('color'),
          min_score: parseFloat(formData.get('min_score') as string),
          max_score: parseFloat(formData.get('max_score') as string),
          reward_amount: parseFloat(formData.get('reward_amount') as string),
          priority: parseInt(formData.get('priority') as string) || 0,
        })
      })

      if (response.ok) {
        router.refresh()
        setShowForm(false)
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

  async function toggleActive(ruleId: string, currentState: boolean) {
    try {
      await fetch('/api/reward-rules/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: ruleId, is_active: !currentState })
      })
      router.refresh()
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('確定要刪除這個規則嗎？')) return

    try {
      await fetch('/api/reward-rules/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: ruleId })
      })
      router.refresh()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div>
      {/* 添加按鈕 */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
        >
          {showForm ? '✖ 取消' : '➕ 添加新規則'}
        </button>
      </div>

      {/* 添加表單 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-xl mb-8 border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">新增獎金規則</h3>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">❌ {error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 科目選擇 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                適用科目 *
              </label>
              <select
                name="subject_id"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="global">🌍 全局（所有科目）</option>
                {subjects.map(subject => {
                  const student = students.find(s => s.id === subject.student_id)
                  return (
                    <option key={subject.id} value={subject.id}>
                      {subject.icon} {subject.name} ({student?.name || '未知學生'})
                    </option>
                  )
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                💡 選擇特定科目可設置該科目的專屬獎金
              </p>
            </div>

            {/* 學生選擇 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                適用學生 *
              </label>
              <select
                name="student_id"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="global">🌍 全局（所有學生）</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 規則名稱 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                規則名稱 *
              </label>
              <input
                name="rule_name"
                type="text"
                required
                placeholder="例如：滿分獎勵"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 圖標 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                圖標
              </label>
              <input
                name="icon"
                type="text"
                defaultValue="💎"
                placeholder="💎"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 顏色 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                顏色
              </label>
              <input
                name="color"
                type="color"
                defaultValue="#4a9eff"
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>

            {/* 分數範圍 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                最低分數 (%)
              </label>
              <input
                name="min_score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                placeholder="90"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                最高分數 (%)
              </label>
              <input
                name="max_score"
                type="number"
                min="0"
                max="150"
                step="0.1"
                required
                placeholder="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 獎金金額 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                獎金金額 ($)
              </label>
              <input
                name="reward_amount"
                type="number"
                min="0"
                step="1"
                required
                placeholder="30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 優先級 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                優先級（越高越優先）
              </label>
              <input
                name="priority"
                type="number"
                min="0"
                defaultValue="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 說明 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                說明
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="規則說明..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? '創建中...' : '✅ 創建規則'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 規則列表 */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg mb-2">📭 尚無獎金規則</p>
            <p className="text-gray-400 text-sm">點擊上方按鈕添加第一個規則</p>
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className={`p-5 rounded-xl border-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ${
                rule.is_active ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{rule.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">
                        {rule.rule_name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {/* 科目標籤 */}
                        {rule.subject_id && rule.subjects ? (
                          <span 
                            className="text-xs px-2 py-1 rounded-full text-white font-semibold"
                            style={{ backgroundColor: rule.subjects.color }}
                          >
                            {rule.subjects.icon} {rule.subjects.name}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            🌍 所有科目
                          </span>
                        )}
                        
                        {/* 學生標籤 */}
                        {rule.student_id && rule.students ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
                            👤 {rule.students.name}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                            🌍 所有學生
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {rule.description && (
                    <p className="text-gray-600 text-sm mb-3">{rule.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      分數：{rule.min_score}% - {rule.max_score}%
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                      獎金：${rule.reward_amount}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                      優先級：{rule.priority}
                    </span>
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(rule.id, rule.is_active)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      rule.is_active
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {rule.is_active ? '❌ 停用' : '✅ 啟用'}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                  >
                    🗑️ 刪除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

