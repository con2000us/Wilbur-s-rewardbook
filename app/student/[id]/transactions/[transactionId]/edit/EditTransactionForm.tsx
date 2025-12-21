'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  studentId: string
  transaction: any
}

export default function EditTransactionForm({ studentId, transaction }: Props) {
  const router = useRouter()
  const t = useTranslations('transaction')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transactionType, setTransactionType] = useState<'earn' | 'spend' | 'reset'>(
    transaction.transaction_type as 'earn' | 'spend' | 'reset'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    let amount: number
    
    if (transactionType === 'reset') {
      amount = parseFloat(formData.get('starting_balance') as string) || 0
    } else {
      amount = parseFloat(formData.get('amount') as string)
    }
    
    const transactionDate = formData.get('transaction_date') as string
    
    // 處理事件名稱：如果沒有填寫，自動生成 [日期][分類標籤]
    let description = formData.get('description') as string
    if (!description || description.trim() === '') {
      const category = formData.get('category') as string
      const date = transactionDate
      
      // 格式化日期 (例如: 12/16)
      const dateObj = new Date(date)
      const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      
      // 生成名稱: [日期][分類標籤]
      description = `${dateStr} ${category}`
    }
    
    try {
      const response = await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transaction.id,
          transaction_type: transactionType,
          amount: transactionType === 'reset' ? amount : (transactionType === 'spend' ? -Math.abs(amount) : Math.abs(amount)),
          description: description,
          category: formData.get('category'),
          transaction_date: transactionDate,
        })
      })

      const result = await response.json()

      if (response.ok) {
        router.push(`/student/${studentId}/transactions`)
        router.refresh()
      } else {
        setError(result.error || t('updateFailed'))
      }
    } catch (err) {
      setError(tCommon('error') + '：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/transactions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transaction.id,
        })
      })

      const result = await response.json()

      if (response.ok) {
        router.push(`/student/${studentId}/transactions`)
        router.refresh()
      } else {
        setError(result.error || t('deleteFailed'))
      }
    } catch (err) {
      setError(tCommon('error') + '：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return new Date().toISOString().split('T')[0]
    return new Date(dateString).toISOString().split('T')[0]
  }

  // 计算显示金额（正数）
  const displayAmount = Math.abs(transaction.amount)

  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* 類型選擇 */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-3">{t('recordType')} *</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setTransactionType('earn')}
            className={`p-4 rounded-lg border-2 transition-all ${
              transactionType === 'earn'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-4xl mb-2">💰</div>
            <div className="font-bold text-gray-800">{t('income')}</div>
            <div className="text-sm text-gray-600">{t('earnRewards')}</div>
          </button>

          <button
            type="button"
            onClick={() => setTransactionType('spend')}
            className={`p-4 rounded-lg border-2 transition-all ${
              transactionType === 'spend'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-4xl mb-2">🛍️</div>
            <div className="font-bold text-gray-800">{t('expense')}</div>
            <div className="text-sm text-gray-600">{t('spendRewards')}</div>
          </button>

          <button
            type="button"
            onClick={() => setTransactionType('reset')}
            className={`p-4 rounded-lg border-2 transition-all ${
              transactionType === 'reset'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-4xl mb-2">🔄</div>
            <div className="font-bold text-gray-800">{t('reset')}</div>
            <div className="text-sm text-gray-600">{t('recalibrate')}</div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 事件名稱 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>{t('eventName')}</span>
            <span className="text-xs text-gray-500 font-normal">
              {t('optionalAutoGen')}
            </span>
          </label>
          <input
            name="description"
            type="text"
            required={false}
            defaultValue={transaction.description}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('autoGenerate')}
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 {t('autoGenExample')}
          </p>
        </div>

        {/* 分類標籤 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('categoryLabel')} *
          </label>
          {transactionType === 'reset' ? (
            <select
              name="category"
              required
              defaultValue={transaction.category}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('selectCategory')}</option>
              <option value={t('categories.semesterUpdate')}>{t('categories.semesterUpdate')}</option>
              <option value={t('categories.yearEnd')}>{t('categories.yearEnd')}</option>
              <option value={t('categories.systemCalibration')}>{t('categories.systemCalibration')}</option>
              <option value={t('categories.amountAdjustment')}>{t('categories.amountAdjustment')}</option>
            </select>
          ) : transactionType === 'earn' ? (
            <select
              name="category"
              required
              defaultValue={transaction.category}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('selectCategory')}</option>
              <option value={t('categories.specialReward')}>{t('categories.specialReward')}</option>
              <option value={t('categories.contestReward')}>{t('categories.contestReward')}</option>
              <option value={t('categories.behaviorReward')}>{t('categories.behaviorReward')}</option>
              <option value={t('categories.improvementReward')}>{t('categories.improvementReward')}</option>
              <option value={t('categories.attendanceReward')}>{t('categories.attendanceReward')}</option>
              <option value={t('categories.homeworkBonus')}>{t('categories.homeworkBonus')}</option>
              <option value={t('categories.other')}>{t('categories.other')}</option>
            </select>
          ) : (
            <select
              name="category"
              required
              defaultValue={transaction.category}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('selectCategory')}</option>
              <option value={t('categories.giftExchange')}>{t('categories.giftExchange')}</option>
              <option value={t('categories.stationeryPurchase')}>{t('categories.stationeryPurchase')}</option>
              <option value={t('categories.bookPurchase')}>{t('categories.bookPurchase')}</option>
              <option value={t('categories.leisureActivity')}>{t('categories.leisureActivity')}</option>
              <option value={t('categories.foodPurchase')}>{t('categories.foodPurchase')}</option>
              <option value={t('categories.toyPurchase')}>{t('categories.toyPurchase')}</option>
              <option value={t('categories.other')}>{t('categories.other')}</option>
            </select>
          )}
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('date')} *
          </label>
          <input
            name="transaction_date"
            type="date"
            required
            defaultValue={formatDate(transaction.transaction_date)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 起始金額（僅歸零類型） */}
        {transactionType === 'reset' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('startingBalance')} *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-blue-600">
                $
              </span>
              <input
                name="starting_balance"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={displayAmount}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-bold"
              />
            </div>
          </div>
        )}

        {/* 金額（收入/支出類型） */}
        {transactionType !== 'reset' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('amount')} * {transactionType === 'spend' && <span className="text-red-600">{t('autoDeduct')}</span>}
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${
                transactionType === 'earn' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transactionType === 'earn' ? '+' : '-'}$
              </span>
              <input
                name="amount"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={displayAmount}
                className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-bold"
              />
            </div>
          </div>
        )}

        {/* 提交和刪除按鈕 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading ? `${tCommon('save')}...` : `💾 ${t('saveChanges')}`}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {tCommon('cancel')}
          </button>
        </div>

        {/* 刪除按鈕 */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? `${tCommon('delete')}...` : `🗑️ ${t('deleteRecord')}`}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            ⚠️ {t('deleteWarning')}
          </p>
        </div>
      </form>
    </>
  )
}

