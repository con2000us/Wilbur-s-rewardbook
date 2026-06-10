/**
 * calculate-reward.ts — CLI wrapper for reward formula calculation
 *
 * 用法:
 *   npx tsx scripts/calculate-reward.ts \
 *     --rule-reward-amount 10 \
 *     --rule-reward-config '[{"type_key":"points","amount":10},{"type_key":"money","formula":"P*2"}]' \
 *     --score 95 --max-score 100
 *
 *   # 或傳 JSON
 *   echo '{"score":95,"maxScore":100,"percentage":95,...}' | npx tsx scripts/calculate-reward.ts
 *
 * 輸出: JSON (最後一行)
 *   {"rewardAmount":10,"rewards":[...],"usesRewardConfig":false}
 *
 * 同時可用於 Python subprocess 呼叫和 Wilbur 內部 import。
 */

import {
  calculateRewardOutputsFromRule,
  calculateRewardFromRule,
  type CalculatedRewardItem
} from '../lib/rewardFormula'

interface CliInput {
  // Direct inputs
  ruleRewardAmount?: number | string
  ruleRewardFormula?: string
  ruleRewardConfig?: unknown
  score: number
  percentage?: number
  maxScore?: number

  // Or: found rule from DB (we'll resolve it)
  rule?: {
    reward_amount?: number | string
    reward_formula?: string
    reward_config?: unknown
  }
}

function main() {
  const args = process.argv.slice(2)

  // Parse --key value style args
  const parsed: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
      parsed[key] = value
    }
  }

  // Allow stdin JSON as fallback
  let stdinData: Partial<CliInput> = {}
  if (!process.stdin.isTTY) {
    try {
      stdinData = JSON.parse(require('fs').readFileSync(0, 'utf-8'))
    } catch {}
  }

  const { ruleRewardAmount, ruleRewardFormula, ruleRewardConfig, rule, ...rest } =
    { ...stdinData, ...Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])
      )} as any

  const score = Number((parsed as any).score ?? stdinData.score ?? 0)
  const maxScore = Number((parsed as any).maxScore ?? stdinData.maxScore ?? 100)
  const percentage = (parsed as any).percentage !== undefined
    ? Number((parsed as any).percentage)
    : (maxScore > 0 ? (score / maxScore) * 100 : 0)

  // Merge rule if provided
  let finalAmount = ruleRewardAmount ?? (rule as any)?.reward_amount
  let finalFormula = ruleRewardFormula ?? (rule as any)?.reward_formula
  let finalConfig = ruleRewardConfig ?? (rule as any)?.reward_config

  // Parse JSON strings
  if (typeof finalConfig === 'string' && finalConfig.trim()) {
    try { finalConfig = JSON.parse(finalConfig) } catch {}
  }

  const result = calculateRewardOutputsFromRule({
    ruleRewardAmount: finalAmount,
    ruleRewardFormula: finalFormula,
    ruleRewardConfig: finalConfig,
    score,
    percentage,
    maxScore,
  })

  // Pretty print to stderr for human readability, JSON to stdout for parsing
  console.error(
    `  Score: ${score}/${maxScore} (${percentage.toFixed(0)}%) → ` +
    `Reward: ${result.rewardAmount}` +
    (result.rewards.length > 0
      ? ` [${result.rewards.map(r => `${r.type_key || '?'}=${r.amount}`).join(', ')}]`
      : '')
  )

  // Always output clean JSON on stdout (last line is parseable)
  console.log(JSON.stringify(result))
}

main()
