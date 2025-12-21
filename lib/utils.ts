import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Tailwind CSS class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 計算獎金
export interface RewardRule {
  id: string
  rule_name: string
  min_score: number | null
  max_score: number | null
  reward_amount: number
  priority: number
}

export function calculateReward(score: number, rules: RewardRule[]) {
  if (!score || !rules || rules.length === 0) {
    return { ruleId: null, amount: 0, ruleName: null }
  }

  // 按優先級排序
  const sortedRules = [...rules].sort((a: RewardRule, b: RewardRule) => a.priority - b.priority)

  // 找到第一個符合的規則
  for (const rule of sortedRules) {
    const minScore = rule.min_score ?? 0
    const maxScore = rule.max_score ?? 100

    if (score >= minScore && score <= maxScore) {
      return {
        ruleId: rule.id,
        amount: rule.reward_amount,
        ruleName: rule.rule_name
      }
    }
  }

  return { ruleId: null, amount: 0, ruleName: null }
}

// 計算總餘額
export interface Transaction {
  amount: number
  transaction_type: 'earn' | 'spend' | 'bonus' | 'penalty'
}

export function calculateBalance(transactions: Transaction[]) {
  const earned = transactions
    .filter(t => t.amount > 0 || t.transaction_type === 'earn' || t.transaction_type === 'bonus')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const spent = transactions
    .filter(t => t.amount < 0 || t.transaction_type === 'spend' || t.transaction_type === 'penalty')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return {
    earned,
    spent,
    balance: earned - spent
  }
}

// 格式化日期
export function formatDate(date: string | Date | null): string {
  if (!date) return '-'
  
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d)
}

// 格式化金額
export function formatCurrency(amount: number): string {
  return `$ ${amount.toFixed(0)}`
}

// 計算百分比
export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0
  return Math.round((score / maxScore) * 100 * 100) / 100
}

// 獲取狀態顏色
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'graded':
      return 'text-green-600 bg-green-100'
    case 'upcoming':
      return 'text-blue-600 bg-blue-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

// 獲取評量類型標籤
export function getAssessmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    exam: '考試',
    homework: '作業',
    quiz: '小考',
    project: '專題'
  }
  return labels[type] || type
}

