export type RewardTypeLike = {
  id: string
  type_key?: string | null
  display_name?: string | null
}

export type RewardTransactionLike = {
  reward_type_id?: string | null
  category?: string | null
  transaction_type?: string | null
  amount?: number | string | null
}

function normalize(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function isAsciiLike(value: string) {
  return /^[\x00-\x7F]+$/.test(value)
}

function isKnownLegacyAlias(category: string, rewardType: RewardTypeLike) {
  const typeKey = normalize(rewardType.type_key)
  const displayName = normalize(rewardType.display_name)
  const aliases = new Set<string>()

  if (typeKey === 'money' || displayName === '獎金') {
    aliases.add('獎金')
    aliases.add('測驗獎金')
    aliases.add('money')
    aliases.add('assessment reward')
    aliases.add('assessment money')
  }

  return aliases.has(category)
}

export function categoryMatchesRewardType(
  category: string | null | undefined,
  rewardType: RewardTypeLike | null | undefined
) {
  if (!rewardType) return false

  const normalizedCategory = normalize(category)
  if (!normalizedCategory) return false

  const displayName = normalize(rewardType.display_name)
  const typeKey = normalize(rewardType.type_key)

  if (
    typeKey &&
    typeKey.length >= 3 &&
    isAsciiLike(typeKey) &&
    isAsciiLike(normalizedCategory) &&
    normalizedCategory.includes(typeKey)
  ) {
    return true
  }

  return (
    normalizedCategory === displayName ||
    normalizedCategory === typeKey ||
    isKnownLegacyAlias(normalizedCategory, rewardType)
  )
}

export function findMatchingRewardType(
  transaction: RewardTransactionLike,
  rewardTypes: RewardTypeLike[]
) {
  if (transaction.reward_type_id) {
    const directType = rewardTypes.find((type) => type.id === transaction.reward_type_id)
    if (directType) return directType
  }

  return rewardTypes.find((type) => categoryMatchesRewardType(transaction.category, type)) || null
}

export function transactionMatchesRewardType(
  transaction: RewardTransactionLike,
  targetRewardTypeId: string | null | undefined,
  rewardTypes: RewardTypeLike[]
) {
  if (!targetRewardTypeId) return false
  if (transaction.reward_type_id === targetRewardTypeId) return true

  const targetRewardType = rewardTypes.find((type) => type.id === targetRewardTypeId)
  return categoryMatchesRewardType(transaction.category, targetRewardType)
}

export function getTransactionAmount(transaction: RewardTransactionLike) {
  return Number(transaction.amount) || 0
}

export function getEarnedRewardAmount(transaction: RewardTransactionLike) {
  return Math.abs(getTransactionAmount(transaction))
}
