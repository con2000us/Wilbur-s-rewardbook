import { locales, type Locale } from '@/lib/i18n/config'

interface DemoEventSeed {
  key: string
  nameZh: string
  nameEn: string
  descriptionZh: string
  descriptionEn: string
  displayOrder: number
  rewardTypeKey: string
  defaultAmount: number
}

interface DemoExchangeRuleSeed {
  key: string
  nameZh: string
  nameEn: string
  descriptionZh: string
  descriptionEn: string
  displayOrder: number
  requiredRewardTypeKey: string
  requiredAmount: number
  rewardTypeKey: string
  rewardAmount: number
}

const demoSeeds: DemoEventSeed[] = [
  {
    key: 'homework_on_time',
    nameZh: '作業準時完成',
    nameEn: 'Homework On Time',
    descriptionZh: '作業按時繳交',
    descriptionEn: 'Submit homework on time',
    displayOrder: 1,
    rewardTypeKey: 'points',
    defaultAmount: 5,
  },
  {
    key: 'self_review',
    nameZh: '主動複習',
    nameEn: 'Self Review',
    descriptionZh: '自主安排複習',
    descriptionEn: 'Take initiative to review',
    displayOrder: 2,
    rewardTypeKey: 'stars',
    defaultAmount: 1,
  },
  {
    key: 'great_quiz_performance',
    nameZh: '小考表現優良',
    nameEn: 'Great Quiz Performance',
    descriptionZh: '小考達到目標成績',
    descriptionEn: 'Reach target score in quiz',
    displayOrder: 3,
    rewardTypeKey: 'money',
    defaultAmount: 10,
  },
  {
    key: 'active_participation',
    nameZh: '課堂參與積極',
    nameEn: 'Active Participation',
    descriptionZh: '課堂參與與回應積極',
    descriptionEn: 'Actively participate in class',
    displayOrder: 4,
    rewardTypeKey: 'hearts',
    defaultAmount: 1,
  },
  {
    key: 'help_classmates',
    nameZh: '主動幫助同學',
    nameEn: 'Help Classmates',
    descriptionZh: '主動協助同儕學習',
    descriptionEn: 'Help classmates proactively',
    displayOrder: 5,
    rewardTypeKey: 'diamonds',
    defaultAmount: 1,
  },
]

const demoExchangeRuleSeeds: DemoExchangeRuleSeed[] = [
  {
    key: 'points_to_money_basic',
    nameZh: '積分兌換獎金',
    nameEn: 'Points to Money',
    descriptionZh: '累積 100 積分可兌換 10 元獎金',
    descriptionEn: 'Exchange 100 points for 10 money',
    displayOrder: 1,
    requiredRewardTypeKey: 'points',
    requiredAmount: 100,
    rewardTypeKey: 'money',
    rewardAmount: 10,
  },
  {
    key: 'stars_to_diamonds',
    nameZh: '星星兌換鑽石',
    nameEn: 'Stars to Diamonds',
    descriptionZh: '集滿 5 顆星星可兌換 1 顆鑽石',
    descriptionEn: 'Exchange 5 stars for 1 diamond',
    displayOrder: 2,
    requiredRewardTypeKey: 'stars',
    requiredAmount: 5,
    rewardTypeKey: 'diamonds',
    rewardAmount: 1,
  },
]

export type BootstrapLogAction = 'initialize' | 'import_demo_data'

export function parseLocale(input: string | undefined): Locale {
  return locales.includes(input as Locale) ? (input as Locale) : 'en'
}

export async function upsertSetting(supabase: any, key: string, value: string) {
  return supabase.from('site_settings').upsert({ key, value } as any, { onConflict: 'key' })
}

export async function appendInitializationLog(
  supabase: any,
  action: BootstrapLogAction,
  locale: Locale,
  importDemoData: boolean,
  success: boolean,
  note?: string
) {
  const { data: logSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'initialization_logs')
    .maybeSingle()

  const currentLogs = (() => {
    try {
      return JSON.parse(logSetting?.value || '[]')
    } catch {
      return []
    }
  })()

  const nextLogs = [
    {
      timestamp: new Date().toISOString(),
      action,
      locale,
      importDemoData,
      success,
      note: note || '',
    },
    ...currentLogs,
  ].slice(0, 20)

  await upsertSetting(supabase, 'initialization_logs', JSON.stringify(nextLogs))
}

export async function ensureRewardTypes(supabase: any, selectedLocale: Locale) {
  const rewardTypeDisplayNames =
    selectedLocale === 'zh-TW'
      ? {
          points: '積分',
          money: '獎金',
          hearts: '愛心',
          stars: '星星',
          diamonds: '鑽石',
        }
      : {
          points: 'Points',
          money: 'Money',
          hearts: 'Hearts',
          stars: 'Stars',
          diamonds: 'Diamonds',
        }

  const rewardTypes = [
    { type_key: 'points', icon: '⭐', color: '#fbbf24', default_unit: selectedLocale === 'zh-TW' ? '分' : 'pts' },
    { type_key: 'money', icon: '💰', color: '#10b981', default_unit: selectedLocale === 'zh-TW' ? '元' : 'USD' },
    { type_key: 'hearts', icon: '❤️', color: '#ef4444', default_unit: selectedLocale === 'zh-TW' ? '顆' : 'pcs' },
    { type_key: 'stars', icon: '🌟', color: '#3b82f6', default_unit: selectedLocale === 'zh-TW' ? '顆' : 'pcs' },
    { type_key: 'diamonds', icon: '💎', color: '#8b5cf6', default_unit: selectedLocale === 'zh-TW' ? '顆' : 'pcs' },
  ].map((rewardType, index) => ({
    ...rewardType,
    display_name: rewardTypeDisplayNames[rewardType.type_key as keyof typeof rewardTypeDisplayNames],
    display_order: index + 1,
    is_accumulable: true,
    has_extra_input: false,
    extra_input_schema: null,
    is_system: true,
  }))

  const { error } = await supabase
    .from('custom_reward_types')
    .upsert(rewardTypes as any, { onConflict: 'type_key' })

  if (error) {
    throw new Error(error.message)
  }
}

export async function importDemoSeedData(supabase: any) {
  const eventKeyCheck = await supabase.from('achievement_events').select('event_key').limit(1)
  const hasEventKey = !eventKeyCheck.error

  const translationTableCheck = await supabase
    .from('achievement_event_translations')
    .select('id')
    .limit(1)
  const hasTranslationTable = !translationTableCheck.error

  const exchangeRuleKeyCheck = await supabase.from('exchange_rules').select('rule_key').limit(1)
  const hasExchangeRuleKey = !exchangeRuleKeyCheck.error

  const exchangeRuleTranslationCheck = await supabase
    .from('exchange_rule_translations')
    .select('id')
    .limit(1)
  const hasExchangeRuleTranslations = !exchangeRuleTranslationCheck.error

  const { data: rewardTypeRows, error: rewardTypeError } = await supabase
    .from('custom_reward_types')
    .select('id, type_key')
    .in('type_key', ['points', 'money', 'hearts', 'stars', 'diamonds'])

  if (rewardTypeError) {
    throw new Error(rewardTypeError.message)
  }

  const rewardTypeIdByKey = (rewardTypeRows || []).reduce((map: Record<string, string>, row: any) => {
    map[row.type_key] = row.id
    return map
  }, {})

  for (const seed of demoSeeds) {
    let eventId: string | null = null

    if (hasEventKey) {
      const { data: eventRow, error: eventError } = await supabase
        .from('achievement_events')
        .upsert(
          {
            event_key: seed.key,
            name: seed.nameZh,
            description: seed.descriptionZh,
            is_active: true,
            display_order: seed.displayOrder,
          } as any,
          { onConflict: 'event_key' }
        )
        .select('id')
        .single()

      if (eventError) {
        throw new Error(eventError.message)
      }
      eventId = eventRow?.id || null
    } else {
      const { data: existingEvent } = await supabase
        .from('achievement_events')
        .select('id')
        .eq('name', seed.nameZh)
        .maybeSingle()

      if (existingEvent?.id) {
        eventId = existingEvent.id
      } else {
        const { data: insertedEvent, error: insertEventError } = await supabase
          .from('achievement_events')
          .insert({
            name: seed.nameZh,
            description: seed.descriptionZh,
            is_active: true,
            display_order: seed.displayOrder,
          } as any)
          .select('id')
          .single()

        if (insertEventError) {
          throw new Error(insertEventError.message)
        }
        eventId = insertedEvent?.id || null
      }
    }

    if (!eventId) continue

    if (hasTranslationTable) {
      const { error: translationError } = await supabase
        .from('achievement_event_translations')
        .upsert(
          [
            {
              event_id: eventId,
              locale: 'zh-TW',
              name: seed.nameZh,
              description: seed.descriptionZh,
            },
            {
              event_id: eventId,
              locale: 'en',
              name: seed.nameEn,
              description: seed.descriptionEn,
            },
          ] as any,
          { onConflict: 'event_id,locale' }
        )

      if (translationError) {
        throw new Error(translationError.message)
      }
    }

    const rewardTypeId = rewardTypeIdByKey[seed.rewardTypeKey]
    if (rewardTypeId) {
      const { error: ruleError } = await supabase
        .from('achievement_event_reward_rules')
        .upsert(
          {
            event_id: eventId,
            reward_type_id: rewardTypeId,
            default_amount: seed.defaultAmount,
            is_default: true,
          } as any,
          { onConflict: 'event_id,reward_type_id' }
        )

      if (ruleError) {
        throw new Error(ruleError.message)
      }
    }
  }

  for (const seed of demoExchangeRuleSeeds) {
    const requiredRewardTypeId = rewardTypeIdByKey[seed.requiredRewardTypeKey]
    const rewardTypeId = rewardTypeIdByKey[seed.rewardTypeKey]
    if (!requiredRewardTypeId || !rewardTypeId) continue

    let ruleId: string | null = null

    if (hasExchangeRuleKey) {
      const { data: ruleRow, error: ruleError } = await supabase
        .from('exchange_rules')
        .upsert(
          {
            rule_key: seed.key,
            name: seed.nameZh,
            description: seed.descriptionZh,
            required_reward_type_id: requiredRewardTypeId,
            required_amount: seed.requiredAmount,
            reward_type_id: rewardTypeId,
            reward_amount: seed.rewardAmount,
            is_active: true,
            display_order: seed.displayOrder,
          } as any,
          { onConflict: 'rule_key' }
        )
        .select('id')
        .single()

      if (ruleError) {
        throw new Error(ruleError.message)
      }
      ruleId = ruleRow?.id || null
    } else {
      const { data: existingRule } = await supabase
        .from('exchange_rules')
        .select('id')
        .eq('name', seed.nameZh)
        .maybeSingle()

      if (existingRule?.id) {
        ruleId = existingRule.id
      } else {
        const { data: insertedRule, error: insertRuleError } = await supabase
          .from('exchange_rules')
          .insert(
            {
              name: seed.nameZh,
              description: seed.descriptionZh,
              required_reward_type_id: requiredRewardTypeId,
              required_amount: seed.requiredAmount,
              reward_type_id: rewardTypeId,
              reward_amount: seed.rewardAmount,
              is_active: true,
              display_order: seed.displayOrder,
            } as any
          )
          .select('id')
          .single()

        if (insertRuleError) {
          throw new Error(insertRuleError.message)
        }
        ruleId = insertedRule?.id || null
      }
    }

    if (!ruleId || !hasExchangeRuleTranslations) continue

    const { error: translationError } = await supabase
      .from('exchange_rule_translations')
      .upsert(
        [
          {
            rule_id: ruleId,
            locale: 'zh-TW',
            name: seed.nameZh,
            description: seed.descriptionZh,
          },
          {
            rule_id: ruleId,
            locale: 'en',
            name: seed.nameEn,
            description: seed.descriptionEn,
          },
        ] as any,
        { onConflict: 'rule_id,locale' }
      )

    if (translationError) {
      throw new Error(translationError.message)
    }
  }
}
