export type RewardFormulaVars = { G: number; P: number; M: number }

function isFiniteNumber(n: number) {
  return Number.isFinite(n) && !Number.isNaN(n)
}

/**
 * 安全計算獎金公式（禁止 eval）
 * - 支援：數字、小數點、空白、+ - * / ( )、變數 G/P/M
 * - 變數：
 *   - G = score（原始得分）
 *   - P = percentage（百分比）
 *   - M = max_score（滿分）
 *
 * @throws Error 若公式非法或無法計算出有限數值
 */
export function evalRewardFormula(input: string, vars: RewardFormulaVars): number {
  const expr = (input ?? '').trim()
  if (!expr) throw new Error('Empty formula')

  // 白名單：只允許數字/運算子/括號/變數/空白
  if (!/^[0-9GPM+\-*/().\s]+$/.test(expr)) {
    throw new Error('Invalid characters in formula')
  }

  type Op = '+' | '-' | '*' | '/'
  type Tok =
    | { t: 'num'; v: number }
    | { t: 'var'; v: keyof RewardFormulaVars }
    | { t: 'op'; v: Op }
    | { t: 'lp' }
    | { t: 'rp' }

  const s = expr.replace(/\s+/g, '')
  const toks: Tok[] = []

  const pushUnaryMinusAsBinary = () => {
    // 將 unary '-' 轉成 '0 - X'
    toks.push({ t: 'num', v: 0 })
    toks.push({ t: 'op', v: '-' })
  }

  let i = 0
  let prev: Tok | null = null

  while (i < s.length) {
    const ch = s[i]

    // number
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++
      const raw = s.slice(i, j)
      const n = Number(raw)
      if (!isFiniteNumber(n)) throw new Error(`Invalid number: ${raw}`)
      toks.push({ t: 'num', v: n })
      prev = toks[toks.length - 1]
      i = j
      continue
    }

    // variable
    if (ch === 'G' || ch === 'P' || ch === 'M') {
      toks.push({ t: 'var', v: ch as keyof RewardFormulaVars })
      prev = toks[toks.length - 1]
      i++
      continue
    }

    // parentheses
    if (ch === '(') {
      toks.push({ t: 'lp' })
      prev = toks[toks.length - 1]
      i++
      continue
    }
    if (ch === ')') {
      toks.push({ t: 'rp' })
      prev = toks[toks.length - 1]
      i++
      continue
    }

    // operators
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      // unary minus
      if (ch === '-' && (prev === null || prev.t === 'op' || prev.t === 'lp')) {
        pushUnaryMinusAsBinary()
        prev = toks[toks.length - 1]
        i++
        continue
      }

      toks.push({ t: 'op', v: ch })
      prev = toks[toks.length - 1]
      i++
      continue
    }

    throw new Error(`Unexpected token: ${ch}`)
  }

  const prec: Record<Op, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

  // Shunting-yard -> RPN
  const out: Tok[] = []
  const opStack: Tok[] = []

  for (const tok of toks) {
    if (tok.t === 'num' || tok.t === 'var') {
      out.push(tok)
      continue
    }

    if (tok.t === 'op') {
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1]
        if (top.t === 'op' && prec[top.v] >= prec[tok.v]) out.push(opStack.pop()!)
        else break
      }
      opStack.push(tok)
      continue
    }

    if (tok.t === 'lp') {
      opStack.push(tok)
      continue
    }

    if (tok.t === 'rp') {
      while (opStack.length > 0 && opStack[opStack.length - 1].t !== 'lp') {
        out.push(opStack.pop()!)
      }
      if (opStack.length === 0) throw new Error('Mismatched parentheses')
      opStack.pop() // pop lp
      continue
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!
    if (top.t === 'lp' || top.t === 'rp') throw new Error('Mismatched parentheses')
    out.push(top)
  }

  // Eval RPN
  const st: number[] = []
  for (const tok of out) {
    if (tok.t === 'num') st.push(tok.v)
    else if (tok.t === 'var') st.push(vars[tok.v])
    else if (tok.t === 'op') {
      const b = st.pop()
      const a = st.pop()
      if (a === undefined || b === undefined) throw new Error('Bad expression')
      let r = 0
      if (tok.v === '+') r = a + b
      if (tok.v === '-') r = a - b
      if (tok.v === '*') r = a * b
      if (tok.v === '/') r = a / b
      if (!isFiniteNumber(r)) throw new Error('Non-finite result')
      st.push(r)
    }
  }

  if (st.length !== 1) throw new Error('Bad expression')
  return st[0]
}

export function calculateRewardFromRule(params: {
  ruleRewardAmount?: unknown
  ruleRewardFormula?: unknown
  score: number
  percentage: number
  maxScore: number
}) {
  const { ruleRewardAmount, ruleRewardFormula, score, percentage, maxScore } = params

  const formula = typeof ruleRewardFormula === 'string' ? ruleRewardFormula.trim() : ''
  if (formula) {
    const raw = evalRewardFormula(formula, { G: score, P: percentage, M: maxScore })
    return Math.max(0, Math.round(raw))
  }

  const fallback = Number(ruleRewardAmount ?? 0)
  if (!isFiniteNumber(fallback)) return 0
  return Math.max(0, Math.round(fallback))
}


