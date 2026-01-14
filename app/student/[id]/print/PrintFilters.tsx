'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
}

interface Props {
  subjects: Subject[]
}

export default function PrintFilters({ subjects }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('print')
  const tCommon = useTranslations('common')
  
  // 從 URL 參數獲取初始值
  const startDateParam = searchParams.get('startDate') || ''
  const endDateParam = searchParams.get('endDate') || ''
  const subjectParam = searchParams.get('subject') || ''
  
  const [startDate, setStartDate] = useState(startDateParam)
  const [endDate, setEndDate] = useState(endDateParam)
  const [selectedSubject, setSelectedSubject] = useState(subjectParam)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // 當 URL 參數變化時同步更新 state（用於從學習記錄頁面跳轉過來時）
  useEffect(() => {
    const currentStartDate = searchParams.get('startDate') || ''
    const currentEndDate = searchParams.get('endDate') || ''
    const currentSubject = searchParams.get('subject') || ''
    
    if (currentStartDate !== startDate) setStartDate(currentStartDate)
    if (currentEndDate !== endDate) setEndDate(currentEndDate)
    if (currentSubject !== selectedSubject) setSelectedSubject(currentSubject)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  
  // 當參數變化時更新 URL（跳過初始化）
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
      return
    }
    
    const params = new URLSearchParams(window.location.search)
    
    // 更新或移除參數
    if (startDate) {
      params.set('startDate', startDate)
    } else {
      params.delete('startDate')
    }
    
    if (endDate) {
      params.set('endDate', endDate)
    } else {
      params.delete('endDate')
    }
    
    if (selectedSubject) {
      params.set('subject', selectedSubject)
    } else {
      params.delete('subject')
    }
    
    // 移除舊的 month 參數（如果存在）
    params.delete('month')
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    router.push(newUrl)
  }, [startDate, endDate, selectedSubject, router, isInitialized])
  
  return (
    <div className="no-print mb-6 flex flex-col md:flex-row items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
      {/* 日期選擇器 */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {t('startDate')}:
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
        />
        <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {t('endDate')}:
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>
      
      {/* 科目選擇器 */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {t('subject')}:
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm min-w-[150px]"
        >
          <option value="">{t('allSubjects')}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

