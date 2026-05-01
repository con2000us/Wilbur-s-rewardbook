interface RewardTypeLike {
  id?: string
  type_key?: string
  display_name?: string
  display_name_zh?: string
  display_name_en?: string
  default_unit?: string | null
}

/** 由交易紀錄取出對應的獎勵類型：以 reward_type_id 為主；缺值才依 category 完全比對顯示名稱／type_key */
export function findRewardTypeForTransaction(
  transaction: { reward_type_id?: string | null; category?: string | null },
  rewardTypes: RewardTypeLike[]
): RewardTypeLike | undefined {
  const rid = transaction.reward_type_id
  if (rid != null && String(rid).trim() !== '') {
    return rewardTypes.find((rt) => rt.id === rid)
  }

  const cat = (transaction.category ?? '').trim()
  if (!cat) return undefined
  const catLower = cat.toLowerCase()

  return rewardTypes.find((rt) => {
    return (
      cat === (rt.display_name || '') ||
      cat === (rt.display_name_zh || '') ||
      cat === (rt.display_name_en || '') ||
      catLower === (rt.type_key || '').toLowerCase()
    )
  })
}

export function getRewardDisplayName(type: RewardTypeLike, locale: string): string {
  if (locale === 'zh-TW') {
    return type.display_name_zh || type.display_name || type.type_key || ''
  }
  return type.display_name_en || type.display_name || type.type_key || ''
}

export function getRewardUnit(type: RewardTypeLike, locale: string): string {
  // 該類型在後台設定的單位（DB：default_unit）；有值即為「設定的單位」
  const unit = (type.default_unit || '').trim()
  if (unit) return unit

  if ((type.type_key || '').toLowerCase() === 'money') {
    return locale === 'zh-TW' ? '元' : 'dollars'
  }

  return getRewardDisplayName(type, locale)
}

export function formatRewardAmountWithUnit(
  amount: number,
  type: RewardTypeLike,
  locale: string
): string {
  const unit = getRewardUnit(type, locale)
  return `${amount.toLocaleString()} ${unit}`
}
