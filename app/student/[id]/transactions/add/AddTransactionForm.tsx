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
}

export default function AddTransactionForm({ studentId }: Props) {
  const router = useRouter()
  const t = useTranslations('transaction')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transactionType, setTransactionType] = useState<'earn' | 'spend' | 'reset'>('earn')
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null)
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
      // 归零类型：使用起始金额
      amount = parseFloat(formData.get('starting_balance') as string) || 0
    } else {
      // 收入/支出类型
      amount = parseFloat(formData.get('amount') as string)
    }
    
    const transactionDate = formData.get('transaction_date') as string
    
    // 處理事件名稱：如果沒有填寫，自動生成 [日期][獎勵類別]
    let description = formData.get('description') as string
    if (!description || description.trim() === '') {
      const category = formData.get('category') as string
      const date = transactionDate || new Date().toISOString().split('T')[0]
      
      // 格式化日期 (例如: 12/16)
      const dateObj = new Date(date)
      const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      
      // 生成名稱: [日期][獎勵類別]
      description = `${dateStr} ${category}`
    }
    
    try {
      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          transaction_type: transactionType,
          amount: transactionType === 'reset' ? amount : (transactionType === 'spend' ? -Math.abs(amount) : Math.abs(amount)),
          description: description,
          category: formData.get('category'),
          transaction_date: transactionDate || new Date().toISOString().split('T')[0],
        })
      })

      const result = await response.json()

      if (response.ok) {
        router.push(`/student/${studentId}/transactions`)
        router.refresh()
      } else {
        setError(result.error || tCommon('error'))
      }
    } catch (err) {
      setError(tCommon('error') + '：' + (err as Error).message)
    } finally {
      setLoading(false)
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
            onClick={() => {
              setTransactionType('spend')
              setSelectedPresetIndex(null)
            }}
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
            onClick={() => {
              setTransactionType('reset')
              setSelectedPresetIndex(null)
            }}
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

      {/* 快速選擇 */}
      {transactionType !== 'reset' && (
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
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedPresetIndex === index
                    ? transactionType === 'earn'
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-red-500 bg-red-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
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
            onChange={() => setSelectedPresetIndex(null)}
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
              defaultValue={resetCategoryOptions[0]}
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
              defaultValue={customTypes[0] ? getDisplayName(customTypes[0]) : undefined}
              onChange={() => setSelectedPresetIndex(null)}
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
            defaultValue={new Date().toISOString().split('T')[0]}
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
                defaultValue="0"
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
            disabled={loading}
            className={`flex-1 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg ${
              transactionType === 'earn' 
                ? 'bg-green-600' 
                : transactionType === 'spend' 
                  ? 'bg-red-600' 
                  : 'bg-blue-600'
            }`}
          >
            {loading 
              ? tCommon('loading')
              : transactionType === 'earn' 
                ? `✅ ${t('recordIncome')}`
                : transactionType === 'spend' 
                  ? `✅ ${t('recordExpense')}`
                  : `🔄 ${t('createReset')}`
            }
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
      </form>
    </>
  )
}

