export type TrackableTransactionDate = {
  created_at?: string | null
  transaction_date?: string | null
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isFinite(date.getTime())) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 10)
  }

  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || ''
}

function toStoredDateKey(value: string | null | undefined) {
  if (!value) return ''
  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || ''
}

export function getTrackingStartDateKey(value: string | null | undefined) {
  return toStoredDateKey(value)
}

export function getTransactionDateKey(transaction: TrackableTransactionDate) {
  return toStoredDateKey(transaction.transaction_date) || toStoredDateKey(transaction.created_at)
}

export function isTransactionOnOrAfterTrackingStart(
  transaction: TrackableTransactionDate,
  trackingStartedAt: string | null | undefined
) {
  const startDateKey = getTrackingStartDateKey(trackingStartedAt)
  if (!startDateKey) return true

  const transactionDateKey = getTransactionDateKey(transaction)
  return Boolean(transactionDateKey && transactionDateKey >= startDateKey)
}

export function filterTransactionsByTrackingStart<T extends TrackableTransactionDate>(
  transactions: T[],
  trackingStartedAt: string | null | undefined
) {
  return transactions.filter((transaction) =>
    isTransactionOnOrAfterTrackingStart(transaction, trackingStartedAt)
  )
}

export function sortTransactionsForGoalProgress<T extends TrackableTransactionDate>(transactions: T[]) {
  return [...transactions].sort((a, b) => {
    const aDateKey = getTransactionDateKey(a)
    const bDateKey = getTransactionDateKey(b)
    if (aDateKey !== bDateKey) return aDateKey.localeCompare(bDateKey)

    const aCreatedAt = Date.parse(a.created_at || '')
    const bCreatedAt = Date.parse(b.created_at || '')
    return (Number.isFinite(aCreatedAt) ? aCreatedAt : 0) - (Number.isFinite(bCreatedAt) ? bCreatedAt : 0)
  })
}
