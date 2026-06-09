import type { SupabaseClient } from '@supabase/supabase-js'
import { locales, type Locale } from '@/lib/i18n/config'
import type { Database } from '@/lib/supabase/types'

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

type AchievementEventInsert = Database['public']['Tables']['achievement_events']['Insert']
type ExchangeRuleInsert = Database['public']['Tables']['exchange_rules']['Insert']

const demoSeeds: DemoEventSeed[] = [
  {
    key: 'homework_on_time',
    nameZh: '作業準時繳交',
    nameEn: 'Homework On Time',
    descriptionZh: '準時完成並繳交作業',
    descriptionEn: 'Submit homework on time',
    displayOrder: 1,
    rewardTypeKey: 'points',
    defaultAmount: 5,
  },
  {
    key: 'self_review',
    nameZh: '主動複習',
    nameEn: 'Self Review',
    descriptionZh: '主動整理與複習學習內容',
    descriptionEn: 'Take initiative to review',
    displayOrder: 2,
    rewardTypeKey: 'stars',
    defaultAmount: 1,
  },
  {
    key: 'great_quiz_performance',
    nameZh: '小考表現優秀',
    nameEn: 'Great Quiz Performance',
    descriptionZh: '小考達到目標分數',
    descriptionEn: 'Reach target score in quiz',
    displayOrder: 3,
    rewardTypeKey: 'money',
    defaultAmount: 10,
  },
  {
    key: 'active_participation',
    nameZh: '課堂積極參與',
    nameEn: 'Active Participation',
    descriptionZh: '積極參與課堂活動與討論',
    descriptionEn: 'Actively participate in class',
    displayOrder: 4,
    rewardTypeKey: 'hearts',
    defaultAmount: 1,
  },
  {
    key: 'help_classmates',
    nameZh: '主動幫助同學',
    nameEn: 'Help Classmates',
    descriptionZh: '主動協助同學解決問題',
    descriptionEn: 'Help classmates proactively',
    displayOrder: 5,
    rewardTypeKey: 'diamonds',
    defaultAmount: 1,
  },
]

const demoExchangeRuleSeeds: DemoExchangeRuleSeed[] = [
  {
    key: 'points_to_money_basic',
    nameZh: '點數兌換金錢',
    nameEn: 'Points to Money',
    descriptionZh: '使用 100 點兌換 10 元',
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
    descriptionZh: '使用 5 顆星星兌換 1 顆鑽石',
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
          points: '點數',
          money: '金錢',
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
    { type_key: 'points', icon: 'P', color: '#fbbf24', default_unit: selectedLocale === 'zh-TW' ? '點' : 'pts' },
    { type_key: 'money', icon: '$', color: '#10b981', default_unit: selectedLocale === 'zh-TW' ? '元' : 'USD' },
    { type_key: 'hearts', icon: 'H', color: '#ef4444', default_unit: selectedLocale === 'zh-TW' ? '顆' : 'pcs' },
    { type_key: 'stars', icon: 'S', color: '#3b82f6', default_unit: selectedLocale === 'zh-TW' ? '顆' : 'pcs' },
    { type_key: 'diamonds', icon: 'D', color: '#8b5cf6', default_unit: selectedLocale === 'zh-TW' ? '顆' : 'pcs' },
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

export async function ensureAssessmentTypes(supabase: SupabaseClient, selectedLocale: Locale) {
  const displayNames =
    selectedLocale === 'zh-TW'
      ? {
          exam: '\u8003\u8a66',
          quiz: '\u5c0f\u8003',
          homework: '\u4f5c\u696d',
          project: '\u5c08\u984c',
        }
      : {
          exam: 'Exam',
          quiz: 'Quiz',
          homework: 'Homework',
          project: 'Project',
        }

  const assessmentTypes = [
    { type_key: 'exam', icon: 'assignment', color: '#dc2626' },
    { type_key: 'quiz', icon: 'checklist_rtl', color: '#2563eb' },
    { type_key: 'homework', icon: 'edit_note', color: '#16a34a' },
    { type_key: 'project', icon: 'palette', color: '#9333ea' },
  ].map((type, index) => ({
    ...type,
    display_name: displayNames[type.type_key as keyof typeof displayNames],
    display_order: index + 1,
    is_active: true,
    is_system: true,
  }))

  const { error } = await supabase
    .from('assessment_types')
    .upsert(assessmentTypes, { onConflict: 'type_key' })

  if (error) {
    throw new Error(error.message)
  }
}

function buildEventPayload(seed: DemoEventSeed): AchievementEventInsert {
  return {
    event_key: seed.key,
    name: seed.nameZh,
    description: seed.descriptionZh,
    is_active: true,
    display_order: seed.displayOrder,
  }
}

function buildExchangeRulePayload(
  seed: DemoExchangeRuleSeed,
  requiredRewardTypeId: string,
  rewardTypeId: string
): ExchangeRuleInsert {
  return {
    rule_key: seed.key,
    name: seed.nameZh,
    description: seed.descriptionZh,
    required_reward_type_id: requiredRewardTypeId,
    required_amount: seed.requiredAmount,
    reward_item: seed.descriptionZh,
    reward_type_id: rewardTypeId,
    reward_amount: seed.rewardAmount,
    is_active: true,
    display_order: seed.displayOrder,
  }
}

export async function importDemoSeedData(supabase: SupabaseClient) {
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
    const { data: eventRow, error: eventError } = await supabase
      .from('achievement_events')
      .upsert(buildEventPayload(seed), { onConflict: 'event_key' })
      .select('id')
      .single()

    if (eventError) {
      throw new Error(eventError.message)
    }

    const eventId = eventRow?.id || null
    if (!eventId) continue

    try {
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
        console.warn('Failed to upsert achievement_event_translation:', translationError.message)
      }
    } catch (err: any) {
      console.warn('achievement_event_translations table may not exist, skipping translation upsert:', err.message)
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

    const { data: ruleRow, error: ruleError } = await supabase
      .from('exchange_rules')
      .upsert(buildExchangeRulePayload(seed, requiredRewardTypeId, rewardTypeId), { onConflict: 'rule_key' })
      .select('id')
      .single()

    if (ruleError) {
      throw new Error(ruleError.message)
    }

    const ruleId = ruleRow?.id || null
    if (!ruleId) continue

    try {
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
        console.warn('Failed to upsert exchange_rule_translation:', translationError.message)
      }
    } catch (err: any) {
      console.warn('exchange_rule_translations table may not exist, skipping translation upsert:', err.message)
    }
  }
}
