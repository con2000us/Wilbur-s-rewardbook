import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parsePreferredLocale, resolveLocalizedText } from '@/app/api/_shared/i18n'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()
    const preferredLocale = parsePreferredLocale(request.cookies.get('NEXT_LOCALE')?.value)

    const { studentId, exchangeRuleId } = body

    if (!studentId || !exchangeRuleId) {
      return NextResponse.json({ error: 'Student ID and Exchange Rule ID are required' }, { status: 400 })
    }

    // 獲取兌換規則
    const { data: exchangeRule, error: ruleError } = await supabase
      .from('exchange_rules')
      .select('*')
      .eq('id', exchangeRuleId)
      .eq('is_active', true)
      .single()

    if (ruleError || !exchangeRule) {
      return NextResponse.json({ error: 'Exchange rule not found or inactive' }, { status: 404 })
    }

    // 獲取獎勵類型
    const { data: rewardType, error: typeError } = await supabase
      .from('custom_reward_types')
      .select('*')
      .eq('id', exchangeRule.required_reward_type_id)
      .single()

    if (typeError || !rewardType) {
      return NextResponse.json({ error: 'Reward type not found' }, { status: 404 })
    }

    // 獲取學生當前的獎勵統計
    const statsResponse = await fetch(`${request.nextUrl.origin}/api/students/${studentId}/reward-stats`)
    if (!statsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch reward stats' }, { status: 500 })
    }

    const statsData = await statsResponse.json()
    if (!statsData.success || !statsData.stats) {
      return NextResponse.json({ error: 'Failed to get reward stats' }, { status: 500 })
    }

    const currentBalance = statsData.stats[rewardType.id]?.currentBalance || 0

    // 檢查餘額是否足夠
    if (currentBalance < exchangeRule.required_amount) {
      return NextResponse.json({ 
        error: `Insufficient balance. Need ${exchangeRule.required_amount} ${rewardType.display_name}, but only have ${currentBalance}` 
      }, { status: 400 })
    }

    const { data: ruleTranslations } = await supabase
      .from('exchange_rule_translations')
      .select('locale, name, description')
      .eq('rule_id', exchangeRule.id)
      .in('locale', ['zh-TW', 'en'])

    const localizedRule = resolveLocalizedText({
      locale: preferredLocale,
      translations: ruleTranslations || [],
      fallbackZhName: exchangeRule.name_zh,
      fallbackEnName: exchangeRule.name_en,
      fallbackZhDescription: exchangeRule.description_zh,
      fallbackEnDescription: exchangeRule.description_en,
    })

    // 創建交易記錄
    const displayName = rewardType.display_name || rewardType.type_key
    const exchangeDescription = preferredLocale === 'zh-TW'
      ? `兌換：${localizedRule.name}`
      : `Exchange: ${localizedRule.name}`
    
    const transactionDate = new Date().toISOString().split('T')[0]

    // 如果是類型對類型的兌換，創建兩筆交易記錄
    if (exchangeRule.reward_type_id && exchangeRule.reward_amount) {
      // 獲取兌換得到的獎勵類型
      const { data: rewardTypeToReceive, error: rewardTypeError } = await supabase
        .from('custom_reward_types')
        .select('*')
        .eq('id', exchangeRule.reward_type_id)
        .single()

      if (rewardTypeError || !rewardTypeToReceive) {
        return NextResponse.json({ error: 'Reward type to receive not found' }, { status: 404 })
      }

      const rewardTypeToReceiveName = rewardTypeToReceive.display_name || rewardTypeToReceive.type_key

      // 創建扣除交易（原獎勵類型）
      const { data: deductTransaction, error: deductError } = await supabase
        .from('transactions')
        // @ts-ignore
        .insert({
          student_id: studentId,
          assessment_id: null,
          reward_type_id: rewardType.id,
          achievement_event_id: null,
          transaction_type: 'exchange',
          amount: -exchangeRule.required_amount, // 負數表示扣除
          description: `${exchangeDescription} (扣除)`,
          category: displayName,
          transaction_date: transactionDate,
        })
        .select()
        .single()

      if (deductError) {
        console.error('Error creating deduct transaction:', deductError)
        return NextResponse.json({ error: deductError.message }, { status: 500 })
      }

      // 創建獲得交易（新獎勵類型）
      const { data: receiveTransaction, error: receiveError } = await supabase
        .from('transactions')
        // @ts-ignore
        .insert({
          student_id: studentId,
          assessment_id: null,
          reward_type_id: rewardTypeToReceive.id,
          achievement_event_id: null,
          transaction_type: 'exchange',
          amount: exchangeRule.reward_amount, // 正數表示獲得
          description: `${exchangeDescription} (獲得)`,
          category: rewardTypeToReceiveName,
          transaction_date: transactionDate,
        })
        .select()
        .single()

      if (receiveError) {
        console.error('Error creating receive transaction:', receiveError)
        return NextResponse.json({ error: receiveError.message }, { status: 500 })
      }

      // 計算新的餘額
      const newBalance = currentBalance - exchangeRule.required_amount

      return NextResponse.json({ 
        success: true,
        message: 'Exchange successful',
        newBalance,
        transactions: {
          deduct: deductTransaction,
          receive: receiveTransaction
        }
      })
    } else {
      // 舊的兌換方式（只扣除，不獲得新獎勵）
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        // @ts-ignore
        .insert({
          student_id: studentId,
          assessment_id: null,
          reward_type_id: rewardType.id,
          achievement_event_id: null,
          transaction_type: 'exchange',
          amount: -exchangeRule.required_amount, // 負數表示扣除
          description: exchangeDescription,
          category: displayName,
          transaction_date: transactionDate,
        })
        .select()
        .single()

      if (transactionError) {
        console.error('Error creating exchange transaction:', transactionError)
        return NextResponse.json({ error: transactionError.message }, { status: 500 })
      }

      // 計算新的餘額
      const newBalance = currentBalance - exchangeRule.required_amount

      return NextResponse.json({ 
        success: true,
        message: 'Exchange successful',
        newBalance,
        transaction
      })
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
