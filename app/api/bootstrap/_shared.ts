import type { SupabaseClient } from '@supabase/supabase-js'
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

export async function upsertSetting(supabase: SupabaseClient, key: string, value: string) {
  return supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
}

export async function appendInitializationLog(
  supabase: SupabaseClient,
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

export async function ensureRewardTypes(supabase: SupabaseClient, selectedLocale: Locale) {
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
    .upsert(rewardTypes, { onConflict: 'type_key' })

  if (error) {
    throw new Error(error.message)
  }
}

async function tableHasColumn(supabase: SupabaseClient, table: string, column: string) {
  const { error } = await supabase.from(table).select(column).limit(1)
  return !error
}

function addColumnValue(payload: Record<string, unknown>, hasColumn: boolean, key: string, value: unknown) {
  if (hasColumn) {
    payload[key] = value
  }
}

type EventSchema = {
  hasEventKey: boolean
  hasName: boolean
  hasDescription: boolean
  hasNameZh: boolean
  hasNameEn: boolean
  hasDescriptionZh: boolean
  hasDescriptionEn: boolean
}

type ExchangeRuleSchema = {
  hasRuleKey: boolean
  hasName: boolean
  hasDescription: boolean
  hasNameZh: boolean
  hasNameEn: boolean
  hasDescriptionZh: boolean
  hasDescriptionEn: boolean
  hasRewardItem: boolean
  hasRewardTypeId: boolean
  hasRewardAmount: boolean
}

function buildEventPayload(seed: DemoEventSeed, schema: EventSchema) {
  const payload: Record<string, unknown> = {
    is_active: true,
    display_order: seed.displayOrder,
  }

  addColumnValue(payload, schema.hasEventKey, 'event_key', seed.key)
  addColumnValue(payload, schema.hasName, 'name', seed.nameZh)
  addColumnValue(payload, schema.hasDescription, 'description', seed.descriptionZh)
  addColumnValue(payload, schema.hasNameZh, 'name_zh', seed.nameZh)
  addColumnValue(payload, schema.hasNameEn, 'name_en', seed.nameEn)
  addColumnValue(payload, schema.hasDescriptionZh, 'description_zh', seed.descriptionZh)
  addColumnValue(payload, schema.hasDescriptionEn, 'description_en', seed.descriptionEn)

  return payload
}

function getEventLookup(seed: DemoEventSeed, schema: EventSchema) {
  if (schema.hasNameZh) return { column: 'name_zh', value: seed.nameZh }
  if (schema.hasName) return { column: 'name', value: seed.nameZh }
  if (schema.hasNameEn) return { column: 'name_en', value: seed.nameEn }
  return null
}

function buildExchangeRulePayload(
  seed: DemoExchangeRuleSeed,
  schema: ExchangeRuleSchema,
  requiredRewardTypeId: string,
  rewardTypeId: string
) {
  const payload: Record<string, unknown> = {
    required_reward_type_id: requiredRewardTypeId,
    required_amount: seed.requiredAmount,
    is_active: true,
    display_order: seed.displayOrder,
  }

  addColumnValue(payload, schema.hasRuleKey, 'rule_key', seed.key)
  addColumnValue(payload, schema.hasName, 'name', seed.nameZh)
  addColumnValue(payload, schema.hasDescription, 'description', seed.descriptionZh)
  addColumnValue(payload, schema.hasNameZh, 'name_zh', seed.nameZh)
  addColumnValue(payload, schema.hasNameEn, 'name_en', seed.nameEn)
  addColumnValue(payload, schema.hasDescriptionZh, 'description_zh', seed.descriptionZh)
  addColumnValue(payload, schema.hasDescriptionEn, 'description_en', seed.descriptionEn)
  addColumnValue(payload, schema.hasRewardItem, 'reward_item', seed.descriptionZh)
  addColumnValue(payload, schema.hasRewardTypeId, 'reward_type_id', rewardTypeId)
  addColumnValue(payload, schema.hasRewardAmount, 'reward_amount', seed.rewardAmount)

  return payload
}

function getExchangeRuleLookup(seed: DemoExchangeRuleSeed, schema: ExchangeRuleSchema) {
  if (schema.hasNameZh) return { column: 'name_zh', value: seed.nameZh }
  if (schema.hasName) return { column: 'name', value: seed.nameZh }
  if (schema.hasNameEn) return { column: 'name_en', value: seed.nameEn }
  return null
}

export async function importDemoSeedData(supabase: SupabaseClient) {
  const [
    hasEventKey,
    hasEventName,
    hasEventDescription,
    hasEventNameZh,
    hasEventNameEn,
    hasEventDescriptionZh,
    hasEventDescriptionEn,
  ] = await Promise.all([
    tableHasColumn(supabase, 'achievement_events', 'event_key'),
    tableHasColumn(supabase, 'achievement_events', 'name'),
    tableHasColumn(supabase, 'achievement_events', 'description'),
    tableHasColumn(supabase, 'achievement_events', 'name_zh'),
    tableHasColumn(supabase, 'achievement_events', 'name_en'),
    tableHasColumn(supabase, 'achievement_events', 'description_zh'),
    tableHasColumn(supabase, 'achievement_events', 'description_en'),
  ])

  const eventSchema: EventSchema = {
    hasEventKey,
    hasName: hasEventName,
    hasDescription: hasEventDescription,
    hasNameZh: hasEventNameZh,
    hasNameEn: hasEventNameEn,
    hasDescriptionZh: hasEventDescriptionZh,
    hasDescriptionEn: hasEventDescriptionEn,
  }

  const translationTableCheck = await supabase
    .from('achievement_event_translations')
    .select('id')
    .limit(1)
  const hasTranslationTable = !translationTableCheck.error

  const [
    hasExchangeRuleKey,
    hasExchangeRuleName,
    hasExchangeRuleDescription,
    hasExchangeRuleNameZh,
    hasExchangeRuleNameEn,
    hasExchangeRuleDescriptionZh,
    hasExchangeRuleDescriptionEn,
    hasRewardItem,
    hasRewardTypeId,
    hasRewardAmount,
  ] = await Promise.all([
    tableHasColumn(supabase, 'exchange_rules', 'rule_key'),
    tableHasColumn(supabase, 'exchange_rules', 'name'),
    tableHasColumn(supabase, 'exchange_rules', 'description'),
    tableHasColumn(supabase, 'exchange_rules', 'name_zh'),
    tableHasColumn(supabase, 'exchange_rules', 'name_en'),
    tableHasColumn(supabase, 'exchange_rules', 'description_zh'),
    tableHasColumn(supabase, 'exchange_rules', 'description_en'),
    tableHasColumn(supabase, 'exchange_rules', 'reward_item'),
    tableHasColumn(supabase, 'exchange_rules', 'reward_type_id'),
    tableHasColumn(supabase, 'exchange_rules', 'reward_amount'),
  ])

  const exchangeRuleSchema: ExchangeRuleSchema = {
    hasRuleKey: hasExchangeRuleKey,
    hasName: hasExchangeRuleName,
    hasDescription: hasExchangeRuleDescription,
    hasNameZh: hasExchangeRuleNameZh,
    hasNameEn: hasExchangeRuleNameEn,
    hasDescriptionZh: hasExchangeRuleDescriptionZh,
    hasDescriptionEn: hasExchangeRuleDescriptionEn,
    hasRewardItem,
    hasRewardTypeId,
    hasRewardAmount,
  }

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

  const rewardTypeIdByKey = (rewardTypeRows || []).reduce((map: Record<string, string>, row) => {
    map[row.type_key] = row.id
    return map
  }, {})

  for (const seed of demoSeeds) {
    let eventId: string | null = null
    const eventPayload = buildEventPayload(seed, eventSchema)

    if (eventSchema.hasEventKey) {
      const { data: eventRow, error: eventError } = await supabase
        .from('achievement_events')
        .upsert(eventPayload, { onConflict: 'event_key' })
        .select('id')
        .single()

      if (eventError) {
        throw new Error(eventError.message)
      }
      eventId = eventRow?.id || null
    } else {
      const eventLookup = getEventLookup(seed, eventSchema)
      if (!eventLookup) {
        throw new Error('Unsupported achievement_events schema: no usable name column found')
      }

      const { data: existingEvent, error: existingEventError } = await supabase
        .from('achievement_events')
        .select('id')
        .eq(eventLookup.column, eventLookup.value)
        .limit(1)
        .maybeSingle()

      if (existingEventError) {
        throw new Error(existingEventError.message)
      }

      if (existingEvent?.id) {
        eventId = existingEvent.id
      } else {
        const { data: insertedEvent, error: insertEventError } = await supabase
          .from('achievement_events')
          .insert(eventPayload)
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
          ],
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
          },
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
    const rulePayload = buildExchangeRulePayload(seed, exchangeRuleSchema, requiredRewardTypeId, rewardTypeId)

    if (exchangeRuleSchema.hasRuleKey) {
      const { data: ruleRow, error: ruleError } = await supabase
        .from('exchange_rules')
        .upsert(rulePayload, { onConflict: 'rule_key' })
        .select('id')
        .single()

      if (ruleError) {
        throw new Error(ruleError.message)
      }
      ruleId = ruleRow?.id || null
    } else {
      const ruleLookup = getExchangeRuleLookup(seed, exchangeRuleSchema)
      if (!ruleLookup) {
        throw new Error('Unsupported exchange_rules schema: no usable name column found')
      }

      const { data: existingRule, error: existingRuleError } = await supabase
        .from('exchange_rules')
        .select('id')
        .eq(ruleLookup.column, ruleLookup.value)
        .limit(1)
        .maybeSingle()

      if (existingRuleError) {
        throw new Error(existingRuleError.message)
      }

      if (existingRule?.id) {
        ruleId = existingRule.id
      } else {
        const { data: insertedRule, error: insertRuleError } = await supabase
          .from('exchange_rules')
          .insert(rulePayload)
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
        ],
        { onConflict: 'rule_id,locale' }
      )

    if (translationError) {
      throw new Error(translationError.message)
    }
  }
}
