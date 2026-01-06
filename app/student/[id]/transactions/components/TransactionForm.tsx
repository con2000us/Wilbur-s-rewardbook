'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  description: string
  category: string
  transaction_date: string
}

interface Props {
  studentId: string
  transaction?: Transaction  // 如果有值就是編輯模式
  onSuccess?: () => void  // 成功後的回調
  onCancel?: () => void  // 取消的回調
}

export default function TransactionForm({ studentId, transaction, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const t = useTranslations('transaction')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  
  // 判斷是編輯還是新增模式
  const isEditMode = !!transaction
  
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [transactionType, setTransactionType] = useState<'earn' | 'spend' | 'reset'>(
    (transaction?.transaction_type as 'earn' | 'spend' | 'reset') || 'earn'
  )
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null)
  
  // 預設事件選項（根據語言動態生成）
  const PRESET_EARN_EVENTS = [
    { description: t('presets.earn.extraReward'), icon: '🎁', category: t('categories.specialReward') },
    { description: t('presets.earn.contestWin'), icon: '🏆', category: t('categories.contestReward') },
    { description: t('presets.earn.goodBehavior'), icon: '⭐', category: t('categories.behaviorReward') },
    { description: t('presets.earn.improvement'), icon: '📈', category: t('categories.improvementReward') },
  ]

  const PRESET_SPEND_EVENTS = [
    { description: t('presets.spend.redeemGift'), icon: '🎁', category: t('categories.giftExchange') },
    { description: t('presets.spend.buyStationery'), icon: '✏️', category: t('categories.stationeryPurchase') },
    { description: t('presets.spend.buyBooks'), icon: '📚', category: t('categories.bookPurchase') },
    { description: t('presets.spend.gameTime'), icon: '🎮', category: t('categories.leisureActivity') },
    { description: t('presets.spend.snacks'), icon: '🍭', category: t('categories.foodPurchase') },
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    let amount: number
    
    if (transactionType === 'reset') {
      // 归零类型：使用起始金额
      amount = parseFloat(formData.get('starting_balance') as string) || 0
    } else {
      // 收入/支出类型
      amount = parseFloat(formData.get('amount') as string)
    }
    
    const transactionDate = formData.get('transaction_date') as string
    
    // 處理事件名稱：如果沒有填寫，自動生成 [日期][分類標籤]
    let description = formData.get('description') as string
    if (!description || description.trim() === '') {
      const category = formData.get('category') as string
      const date = transactionDate || new Date().toISOString().split('T')[0]
      
      // 格式化日期 (例如: 12/16)
      const dateObj = new Date(date)
      const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      
      // 生成名稱: [日期][分類標籤]
      description = `${dateStr} ${category}`
    }
    
    try {
      const apiUrl = isEditMode ? '/api/transactions/update' : '/api/transactions/create'
      const payload: any = {
        student_id: studentId,
        transaction_type: transactionType,
        amount: transactionType === 'reset' ? amount : (transactionType === 'spend' ? -Math.abs(amount) : Math.abs(amount)),
        description: description,
        category: formData.get('category'),
        transaction_date: transactionDate || new Date().toISOString().split('T')[0],
      }

      if (isEditMode) {
        payload.transaction_id = transaction.id
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        if (onSuccess) {
          // Modal 模式：調用回調並刷新
          router.refresh()
          setTimeout(() => {
            onSuccess()
          }, 1000)
        } else {
          // 獨立頁面模式：跳轉回交易頁面
          router.push(`/student/${studentId}/transactions`)
          router.refresh()
        }
      } else {
        setError(result.error || (isEditMode ? t('updateFailed') : tCommon('error')))
      }
    } catch (err) {
      setError(tCommon('error') + '：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!isEditMode || !transaction) return

    if (!confirm(t('confirmDelete'))) {
      return
    }

    setDeleting(true)
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
        if (onSuccess) {
          // Modal 模式：調用回調並刷新
          router.refresh()
          setTimeout(() => {
            onSuccess()
          }, 500)
        } else {
          // 獨立頁面模式：跳轉回交易頁面
          router.push(`/student/${studentId}/transactions`)
          router.refresh()
        }
      } else {
        setError(result.error || t('deleteFailed'))
      }
    } catch (err) {
      setError(tCommon('error') + '：' + (err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  function handlePresetClick(preset: { description: string; icon: string; category: string }, index: number) {
    const form = document.querySelector('form') as HTMLFormElement
    if (form) {
      (form.elements.namedItem('description') as HTMLInputElement).value = preset.description;
      (form.elements.namedItem('category') as HTMLInputElement).value = preset.category
    }
    setSelectedPresetIndex(index)
  }

  // 格式化日期
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return new Date().toISOString().split('T')[0]
    return new Date(dateString).toISOString().split('T')[0]
  }

  // 计算显示金额（正数）
  const displayAmount = transaction ? Math.abs(transaction.amount) : undefined

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
            onClick={() => {
              setTransactionType('earn')
              setSelectedPresetIndex(null)
            }}
            className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
              transactionType === 'earn'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-lg'
            }`}
          >
            <div className="text-4xl mb-2">💰</div>
            <div className="font-bold text-gray-800">{t('income')}</div>
            <div className="text-sm text-gray-600">{t('earnRewards')}</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTransactionType('spend')
              setSelectedPresetIndex(null)
            }}
            className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
              transactionType === 'spend'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-lg'
            }`}
          >
            <div className="text-4xl mb-2">🛍️</div>
            <div className="font-bold text-gray-800">{t('expense')}</div>
            <div className="text-sm text-gray-600">{t('spendRewards')}</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setTransactionType('reset')
              setSelectedPresetIndex(null)
            }}
            className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
              transactionType === 'reset'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-lg'
            }`}
          >
            <div className="text-4xl mb-2">🔄</div>
            <div className="font-bold text-gray-800">{t('reset')}</div>
            <div className="text-sm text-gray-600">{t('recalibrate')}</div>
          </button>
        </div>
      </div>

      {/* 快速選擇（僅新增模式） */}
      {!isEditMode && transactionType !== 'reset' && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">
            {t('quickSelect')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(transactionType === 'earn' ? PRESET_EARN_EVENTS : PRESET_SPEND_EVENTS).map((preset, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePresetClick(preset, index)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-left cursor-pointer ${
                  selectedPresetIndex === index
                    ? transactionType === 'earn'
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-red-500 bg-red-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:-translate-y-1 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{preset.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{preset.description}</div>
                    <div className="text-xs text-gray-500">{preset.category}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 歸零說明 */}
        {transactionType === 'reset' && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <span>ℹ️</span>
              <span>{t('resetExplanation')}</span>
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>{t('resetNote1')}</li>
              <li>{t('resetNote2')}</li>
              <li>{t('resetNote3')}</li>
              <li><span className="font-bold">{t('resetNote4')}</span></li>
              <li>{t('resetNote5')}</li>
            </ul>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                <span className="font-bold">⚠️ {tCommon('important')}：</span>
                {t('resetWarning')}
              </p>
            </div>
          </div>
        )}

        {/* 事件名稱（描述） */}
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
            defaultValue={transaction?.description || ''}
            onChange={() => setSelectedPresetIndex(null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('autoGenerate')}
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 {t('autoGenExample')}
          </p>
        </div>

        {/* 分類標籤（類別） */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>{t('categoryLabel')} *</span>
            <span className="text-xs text-gray-500 font-normal">
              {transactionType === 'reset' 
                ? t('exampleCategoryReset')
                : transactionType === 'earn' 
                  ? t('exampleCategoryEarn')
                  : t('exampleCategorySpend')
              }
            </span>
          </label>
          {transactionType === 'reset' ? (
            <select
              name="category"
              required
              defaultValue={transaction?.category || ''}
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
              defaultValue={transaction?.category || ''}
              onChange={() => setSelectedPresetIndex(null)}
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
              defaultValue={transaction?.category || ''}
              onChange={() => setSelectedPresetIndex(null)}
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
            defaultValue={formatDate(transaction?.transaction_date)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 起始金額（僅歸零類型） */}
        {transactionType === 'reset' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>{t('startingBalance')} *</span>
              <span className="text-xs text-gray-500 font-normal">
                {t('startingBalanceHint')}
              </span>
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
                defaultValue={displayAmount || 0}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-bold"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 {t('startingBalanceExample')}
            </p>
          </div>
        )}

        {/* 金額 */}
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
                placeholder="0"
              />
            </div>
          </div>
        )}

        {/* 提交按鈕 */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || deleting}
            className={`flex-1 text-white py-3 rounded-lg font-semibold hover:opacity-90 hover:-translate-y-1 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 text-lg cursor-pointer ${
              transactionType === 'earn' 
                ? 'bg-green-600' 
                : transactionType === 'spend' 
                  ? 'bg-red-600' 
                  : 'bg-blue-600'
            }`}
          >
            {loading 
              ? tCommon('loading')
              : isEditMode
                ? `💾 ${t('saveChanges')}`
                : transactionType === 'earn' 
                  ? `✅ ${t('recordIncome')}`
                  : transactionType === 'spend' 
                    ? `✅ ${t('recordExpense')}`
                    : `🔄 ${t('createReset')}`
            }
          </button>
          
          <button
            type="button"
            onClick={() => onCancel ? onCancel() : router.back()}
            disabled={loading || deleting}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 hover:bg-gray-50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
          >
            {tCommon('cancel')}
          </button>
        </div>

        {/* 刪除按鈕（僅編輯模式） */}
        {isEditMode && (
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? `${tCommon('delete')}...` : `🗑️ ${t('deleteRecord')}`}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              ⚠️ {t('deleteWarning')}
            </p>
          </div>
        )}
      </form>
    </>
  )
}

