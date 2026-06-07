import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { CalculatedRewardItem } from '@/lib/rewardFormula'

type SupabaseClientLike = ReturnType<typeof createClient>
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type RewardTypeLookup = Pick<Database['public']['Tables']['custom_reward_types']['Row'], 'id' | 'display_name' | 'type_key'>

type InsertAssessmentRewardTransactionsParams = {
  studentId?: string
  assessmentId: string
  title?: string | null
  dueDate?: string | null
  rewardItems?: CalculatedRewardItem[]
  legacyRewardAmount?: number
  selectedRewardTypeId?: string | null
}

function findRewardTypeForItem(item: CalculatedRewardItem, rewardTypes: RewardTypeLookup[]) {
  return rewardTypes.find((type) =>
    (item.type_id && type.id === item.type_id) ||
    (item.type_key && type.type_key === item.type_key)
  ) || null
}

export async function insertAssessmentRewardTransactions(
  supabase: SupabaseClientLike,
  params: InsertAssessmentRewardTransactionsParams
) {
  const {
    studentId,
    assessmentId,
    title,
    dueDate,
    rewardItems = [],
    legacyRewardAmount = 0,
    selectedRewardTypeId,
  } = params

  if (!studentId) return []

  const positiveRewardItems = rewardItems.filter((item) => item.amount > 0)
  const shouldCreateTransactions = positiveRewardItems.length > 0 || legacyRewardAmount > 0
  if (!shouldCreateTransactions) return []

  const { data: rewardTypesData } = await supabase
    .from('custom_reward_types')
    .select('id, display_name, type_key')

  const rewardTypes = (rewardTypesData as RewardTypeLookup[] | null) || []
  const selectedRewardType = selectedRewardTypeId
    ? rewardTypes.find((type) => type.id === selectedRewardTypeId) || null
    : null
  const moneyRewardType = rewardTypes.find((type) => type.type_key === 'money') || null
  const transactionDate = dueDate || new Date().toISOString().split('T')[0]

  const transactions: TransactionInsert[] = positiveRewardItems.length > 0
    ? positiveRewardItems.map((item) => {
        const rewardType = findRewardTypeForItem(item, rewardTypes)
        const categoryName = rewardType?.display_name || item.type_key || 'Reward'

        return {
          student_id: studentId,
          assessment_id: assessmentId,
          reward_type_id: rewardType?.id || item.type_id || null,
          achievement_event_id: null,
          transaction_type: 'earn',
          amount: item.amount,
          description: `${title || 'Assessment'} - ${categoryName}`,
          category: categoryName,
          transaction_date: transactionDate,
        }
      })
    : [{
        student_id: studentId,
        assessment_id: assessmentId,
        reward_type_id: selectedRewardType?.id || moneyRewardType?.id || null,
        achievement_event_id: null,
        transaction_type: 'earn',
        amount: legacyRewardAmount,
        description: `${title || 'Assessment'} - ${(selectedRewardType || moneyRewardType)?.display_name || 'Reward'}`,
        category: (selectedRewardType || moneyRewardType)?.display_name || 'Reward',
        transaction_date: transactionDate,
      }]

  const { data } = await supabase
    .from('transactions')
    .insert(transactions)
    .select()

  return data || []
}
