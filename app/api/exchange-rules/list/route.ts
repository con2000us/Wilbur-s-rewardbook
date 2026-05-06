import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parsePreferredLocale, resolveLocalizedText } from '@/app/api/_shared/i18n'

export async function GET() {
  const supabase = createClient()
  
  try {
    const cookieStore = await cookies()
    const preferredLocale = parsePreferredLocale(cookieStore.get('NEXT_LOCALE')?.value)

    // 獲取所有啟用的兌換規則，按 display_order 排序
    const { data: rules, error } = await supabase
      .from('exchange_rules')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message || 'Failed to fetch exchange rules'
      }, { status: 500 })
    }

    const ruleIds = (rules || []).map((rule: any) => rule.id)
    let translationsByRuleId = new Map<string, any[]>()

    if (ruleIds.length > 0) {
      const { data: translations, error: translationError } = await supabase
        .from('exchange_rule_translations')
        .select('rule_id, locale, name, description')
        .in('rule_id', ruleIds)
        .in('locale', ['zh-TW', 'en'])

      if (!translationError) {
        translationsByRuleId = (translations || []).reduce((map: Map<string, any[]>, translation: any) => {
          const current = map.get(translation.rule_id) || []
          current.push(translation)
          map.set(translation.rule_id, current)
          return map
        }, new Map<string, any[]>())
      }
    }

    const localizedRules = (rules || []).map((rule: any) => {
      const translations = translationsByRuleId.get(rule.id) || []
      const localized = resolveLocalizedText({
        locale: preferredLocale,
        translations,
        fallbackZhName: rule.name_zh,
        fallbackEnName: rule.name_en,
        fallbackZhDescription: rule.description_zh,
        fallbackEnDescription: rule.description_en,
      })

      return {
        ...rule,
        ...localized,
      }
    })
    
    return NextResponse.json({ 
      success: true,
      rules: localizedRules
    })
  } catch (error) {
    console.error('Failed to fetch exchange rules:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch exchange rules: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
