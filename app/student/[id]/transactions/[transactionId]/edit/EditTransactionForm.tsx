'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface CustomRewardType {
  id: string
  type_key: string
  display_name: string
  icon: string
  color: string
  default_unit: string | null
  is_accumulable: boolean
  description?: string
  extra_input_schema: any
  is_system?: boolean
}

interface Props {
  studentId: string
  transaction: any
}

export default function EditTransactionForm({ studentId, transaction }: Props) {
  const router = useRouter()
  const t = useTranslations('transaction')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transactionType, setTransactionType] = useState<'earn' | 'spend' | 'reset'>(
    transaction.transaction_type as 'earn' | 'spend' | 'reset'
  )
  const [customTypes, setCustomTypes] = useState<CustomRewardType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)

  // 載入自訂義獎勵類型
  useEffect(() => {
    async function loadCustomTypes() {
      try {
        setLoadingTypes(true)
        const response = await fetch('/api/custom-reward-types/list', {
          method: 'GET',
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success && data.types) {
          setCustomTypes(data.types || [])
        } else {
          setCustomTypes([])
        }
      } catch (err) {
        console.error('Failed to load custom types:', err)
        setCustomTypes([])
      } finally {
        setLoadingTypes(false)
      }
    }
    loadCustomTypes()
  }, [])

  // 取得顯示名稱（根據語言）
  const getDisplayName = (type: CustomRewardType): string => {
    return type.display_name || type.type_key
  }

  // 判斷是否為 emoji
  const isEmojiIcon = (icon: string): boolean => {
    return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) || 
           icon.length <= 2 || 
           !/^[a-z_]+$/i.test(icon)
  }
  const resetCategoryOptions = [
    t('categories.semesterUpdate'),
    t('categories.yearEnd'),
    t('categories.systemCalibration'),
    t('categories.amountAdjustment')
  ]

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
    
    // 處理事件名稱：如果沒有填寫，自動生成 [日期][獎勵類別]
    let description = formData.get('description') as string
    if (!description || description.trim() === '') {
      const category = formData.get('category') as string
      const date = transactionDate
      
      // 格式化日期 (例如: 12/16)
      const dateObj = new Date(date)
      const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      
      // 生成名稱: [日期][獎勵類別]
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

        {/* 獎勵類別（獎勵品種類） */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>{t('categoryLabel')} *</span>
            <span className="text-xs text-gray-500 font-normal">
              {transactionType === 'reset' 
                ? t('exampleCategoryReset')
                : locale === 'zh-TW' 
                  ? '選擇獎勵品種類'
                  : 'Select reward type'
              }
            </span>
          </label>
          {transactionType === 'reset' ? (
            <select
              name="category"
              required
              defaultValue={transaction.category || resetCategoryOptions[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {resetCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          ) : loadingTypes ? (
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500">
              {locale === 'zh-TW' ? '載入中...' : 'Loading...'}
            </div>
          ) : customTypes.length === 0 ? (
            <div className="w-full px-4 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
              {locale === 'zh-TW' 
                ? '⚠️ 尚未設定獎勵品種類，請先前往「獎勵管理」頁面新增'
                : '⚠️ No reward types configured. Please add reward types in "Reward Management" first'}
            </div>
          ) : (
            <select
              name="category"
              required
              defaultValue={transaction.category || getDisplayName(customTypes[0])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {customTypes.map((type) => {
                const displayName = getDisplayName(type)
                return (
                  <option key={type.id} value={displayName}>
                    {isEmojiIcon(type.icon) ? `${type.icon} ` : ''}{displayName}
                  </option>
                )
              })}
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
            className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50"
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

