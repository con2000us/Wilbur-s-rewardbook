'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'

interface Subject {
  id: string
  name: string
  color: string
  icon: string
}

interface Assessment {
  id: string
  subject_id: string
  title: string
  status: string
  score: number | null
  max_score: number
  percentage: number | null
  reward_amount: number
  due_date: string | null
  assessment_type?: string
  subjects?: {
    name: string
    color: string
    icon: string
  }
}

interface Summary {
  balance: number
  total_earned: number
  total_spent: number
  total_subjects: number
  total_assessments: number
  completed_assessments: number
}

interface RewardBreakdown {
  assessmentEarned: number
  assessmentSpent: number
  passbookEarned: number
  passbookSpent: number
  startingBalance: number
  totalRewardAmount?: number      // 評量獎金（從評量記錄計算）
  totalPassbookEarned?: number    // 非評量收入
  totalPassbookSpent?: number     // 非評量支出
  resetBaseInPeriod?: number      // 該時間區段內的獎金存摺歸零基準
  nonAssessmentBalance?: number,  // 獎金存摺非評量獎金部份的金額（收入-支出）
  averageScores?: {               // 各評量類型平均分數
    exam: number
    quiz: number
    homework: number
    project: number
  },
  totalAverage?: number           // 總平均分數
}

interface Props {
  subjects: Subject[]
  assessments: Assessment[]
  studentId: string
  summary: Summary | null
  selectedSubject: string
  setSelectedSubject: (subject: string) => void
  resetDate: Date | null
  rewardBreakdown: RewardBreakdown
  onEditAssessment?: (assessment: Assessment) => void
}

export default function SubjectTabs({ subjects, assessments, studentId, summary, selectedSubject, setSelectedSubject, resetDate, rewardBreakdown, onEditAssessment }: Props) {
  const t = useTranslations('student')
  const tAssessment = useTranslations('assessment')
  const tCommon = useTranslations('common')
  const tSubject = useTranslations('subject')
  const locale = useLocale()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | null>(25)

  // 載入分頁設定
  useEffect(() => {
    async function loadPaginationSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          const valueStr = data.items_per_page
          // 如果值為 'unlimited'，設為 null（不限）
          const value = valueStr === 'unlimited' || valueStr === '' || valueStr === null
            ? null
            : parseInt(valueStr) || 25
          setItemsPerPage(value)
        }
      } catch (error) {
        console.error('Failed to load pagination settings:', error)
      }
    }
    loadPaginationSettings()
  }, [])
  
  // 科目變更時重置頁碼
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSubject, assessments])

  // 過濾評量
  const filteredAssessments = selectedSubject && selectedSubject !== ''
    ? assessments.filter(a => a.subject_id === selectedSubject)
    : assessments

  // 分頁邏輯（支援「不限」）
  const isUnlimited = itemsPerPage === null
  const totalPages = isUnlimited ? 1 : Math.ceil(filteredAssessments.length / itemsPerPage)
  const paginatedAssessments = isUnlimited
    ? filteredAssessments
    : filteredAssessments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
  const showPagination = !isUnlimited && filteredAssessments.length > itemsPerPage

  // 獲取選中的科目資訊
  const selectedSubjectInfo = selectedSubject && selectedSubject !== ''
    ? subjects.find(s => s.id === selectedSubject)
    : null

  // 計算歸零日期（只取日期部分）用於比較
  const resetDateOnly = resetDate 
    ? new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate()).getTime()
    : null

  // 檢查評量是否在歸零日期之前（不計入獎金）
  const isBeforeReset = (assessment: Assessment) => {
    if (!resetDateOnly || !assessment.due_date) return false
    const assessmentDate = new Date(assessment.due_date)
    const assessmentDateOnly = new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate()).getTime()
    // 歸零日期當天及之前的記錄都不計入
    return assessmentDateOnly <= resetDateOnly
  }

  return (
    <>
      {/* 科目標籤 */}
      <div className="flex gap-4 flex-wrap px-3 relative z-10">
        {/* 全部 */}
        <button
          onClick={() => setSelectedSubject('')}
          className={`px-6 py-2 rounded-t-lg font-bold transition-all hover:-translate-y-0.5 cursor-pointer border-[1px] ${
            !selectedSubject || selectedSubject === ''
              ? 'bg-gray-600 text-white scale-110 border-[#FFF7CC] border-b-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.35)]'
              : 'bg-gray-300 text-gray-700 border-transparent opacity-90 hover:opacity-100 hover:bg-gray-400'
          }`}
          style={{ 
            filter: (!selectedSubject || selectedSubject === '') 
              ? 'drop-shadow(0 -2px 8px rgba(0, 0, 0, 0.1))' 
              : 'none' 
          }}
        >
          📚 {t('allSubjects')}
        </button>

        {subjects && subjects.length > 0 ? (
          subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject.id)}
              className={`px-6 py-2 rounded-t-lg font-bold text-white transition-all hover:-translate-y-0.5 duration-200 cursor-pointer border-[1px] ${
                selectedSubject === subject.id 
                  ? 'scale-110 border-[#FFF7CC] border-b-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.35)]'
                  : 'border-transparent opacity-80 hover:opacity-100 scale-100'
              }`}
              style={{ 
                backgroundColor: subject.color,
                filter: selectedSubject === subject.id 
                  ? 'drop-shadow(0 -2px 8px rgba(0, 0, 0, 0.1))' 
                  : 'none'
              }}
            >
              {subject.icon} {subject.name}
            </button>
          ))
        ) : (
          <p className="text-gray-500">{tSubject('noSubjects')}</p>
        )}
      </div>

      {/* 餘額顯示 */}
      <div className="bg-white rounded-t-none rounded-b-lg p-6 mb-6 shadow-lg">
        <div className="text-center">
          <p className="text-gray-600 text-lg">
            {(!selectedSubject || selectedSubject === '') 
              ? '總平均' 
              : `${selectedSubjectInfo?.icon || ''} ${selectedSubjectInfo?.name || ''} 平均`
            }
          </p>
          <p className="text-5xl font-bold text-blue-600 my-4">
            {rewardBreakdown.totalAverage || 0}
          </p>
          <div className="flex justify-around mt-4 text-base">
            <div className="text-center">
              <span className="text-green-600 font-semibold">{t('income')}: </span>
              <span className="font-bold">${summary?.total_earned || 0}</span>
            </div>
            <div className="text-center">
              <span className="text-red-600 font-semibold">{t('expense')}: </span>
              <span className="font-bold">${summary?.total_spent || 0}</span>
            </div>
          </div>
          {/* 各評量類型平均分數（全部科目和單一科目都顯示） */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-3 text-sm">
              {/* 考試平均 */}
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-gray-500 mb-1 text-xs">📝 考試</p>
                <p className="font-bold text-blue-600 text-lg">
                  {(rewardBreakdown.averageScores?.exam || 0) > 0 ? (rewardBreakdown.averageScores?.exam || 0) : '-'}
                </p>
              </div>
              {/* 小考平均 */}
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-gray-500 mb-1 text-xs">📋 小考</p>
                <p className="font-bold text-green-600 text-lg">
                  {(rewardBreakdown.averageScores?.quiz || 0) > 0 ? (rewardBreakdown.averageScores?.quiz || 0) : '-'}
                </p>
              </div>
              {/* 作業平均 */}
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-gray-500 mb-1 text-xs">📓 作業</p>
                <p className="font-bold text-yellow-600 text-lg">
                  {(rewardBreakdown.averageScores?.homework || 0) > 0 ? (rewardBreakdown.averageScores?.homework || 0) : '-'}
                </p>
              </div>
              {/* 專題平均 */}
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-gray-500 mb-1 text-xs">🎨 專題</p>
                <p className="font-bold text-purple-600 text-lg">
                  {(rewardBreakdown.averageScores?.project || 0) > 0 ? (rewardBreakdown.averageScores?.project || 0) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {!selectedSubject ? (
          <div className="bg-blue-100 p-6 rounded-lg text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default flex flex-col justify-center">
            <p className="text-gray-600 text-sm mb-2">{t('totalSubjects')}</p>
            <p className="text-4xl font-bold text-blue-600">{subjects.length}</p>
          </div>
        ) : (
          <div 
            className="p-6 rounded-lg text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default flex flex-col justify-center items-center"
            style={{ backgroundColor: `${selectedSubjectInfo?.color}20` }}
          >
            <div className="text-5xl mb-2">{selectedSubjectInfo?.icon}</div>
            <p className="text-xl font-bold text-gray-800">{selectedSubjectInfo?.name}</p>
          </div>
        )}
        <div className="bg-green-100 p-6 rounded-lg text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default flex flex-col justify-center">
          <p className="text-gray-600 text-sm mb-2">
            {selectedSubjectInfo 
              ? `${selectedSubjectInfo.icon} ${selectedSubjectInfo.name}${locale === 'zh-TW' ? '評量數' : ' Assessments'}` 
              : t('allAssessments')}
          </p>
          <p className="text-4xl font-bold text-green-600">
            {filteredAssessments.length}
          </p>
        </div>
        <div className="bg-purple-100 p-6 rounded-lg text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default flex flex-col justify-center">
          <p className="text-gray-600 text-sm mb-2">
            {selectedSubjectInfo 
              ? `${selectedSubjectInfo.icon} ${t('completed')}` 
              : t('allCompleted')}
          </p>
          <p className="text-4xl font-bold text-purple-600">
            {filteredAssessments.filter(a => a.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* 評量列表 */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          📋 {selectedSubject 
            ? `${subjects.find(s => s.id === selectedSubject)?.icon} ${subjects.find(s => s.id === selectedSubject)?.name} ${locale === 'zh-TW' ? '評量記錄' : 'Records'}` 
            : (locale === 'zh-TW' ? '全部評量記錄' : 'All Assessment Records')}
        </h2>
        
        {filteredAssessments && filteredAssessments.length > 0 ? (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedAssessments.map((assessment) => {
              // 評量類型映射
              const typeMap: Record<string, { icon: string; label: string; color: string }> = {
                'exam': { icon: '📝', label: tAssessment('types.exam'), color: 'bg-purple-100 text-purple-700 border-purple-300' },
                'quiz': { icon: '📋', label: tAssessment('types.quiz'), color: 'bg-blue-100 text-blue-700 border-blue-300' },
                'homework': { icon: '📓', label: tAssessment('types.homework'), color: 'bg-green-100 text-green-700 border-green-300' },
                'project': { icon: '🎨', label: tAssessment('types.project'), color: 'bg-pink-100 text-pink-700 border-pink-300' }
              }
              const typeInfo = assessment.assessment_type ? typeMap[assessment.assessment_type] : null
              const beforeReset = isBeforeReset(assessment)
              
              return (
                <div
                  key={assessment.id}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col"
                  style={{
                    backgroundColor: assessment.status === 'completed' ? '#f0f9ff' : '#fef3c7'
                  }}
                >
                  {/* 頂部：評量類型和今日標記 */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {typeInfo && (
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${typeInfo.color}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      assessment.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {assessment.status === 'completed' 
                        ? `✅ ${tAssessment('statuses.completed')}` 
                        : `⏳ ${tAssessment('statuses.pending')}`}
                    </span>
                  </div>

                  {/* 科目標籤 */}
                  {assessment.subjects && (
                    <div className="mb-2">
                      <span 
                        className="inline-block px-3 py-1 rounded-full text-white text-xs font-semibold"
                        style={{ backgroundColor: assessment.subjects.color }}
                      >
                        {assessment.subjects.icon} {assessment.subjects.name}
                      </span>
                    </div>
                  )}
                  
                  {/* 標題 */}
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                    {assessment.title}
                  </h3>
                  
                  {/* 分數和日期 */}
                  <div className="flex flex-col gap-1 text-sm text-gray-600 mb-3">
                    {assessment.score !== null && (
                      <div className="font-semibold">
                        {tAssessment('score')}: <span className="text-blue-600 text-lg">{assessment.score}</span>/{assessment.max_score}
                        {' '}
                        <span className="text-sm">({assessment.percentage?.toFixed(1)}%)</span>
                      </div>
                    )}
                    {assessment.due_date && (
                      <div className="text-xs">
                        📅 {new Date(assessment.due_date).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US')}
                      </div>
                    )}
                  </div>
                  
                  {/* 底部：獎金和編輯按鈕 */}
                  <div className="mt-auto pt-3 border-t border-gray-300 flex items-center justify-between gap-2">
                    {assessment.reward_amount > 0 ? (
                      <div className="text-left">
                        {beforeReset ? (
                          <>
                            <div className="text-xl font-bold text-gray-400">
                              ${assessment.reward_amount}
                            </div>
                            <div className="text-xs text-gray-400">{t('notCounted')}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-xl font-bold text-green-600">
                              ${assessment.reward_amount}
                            </div>
                            <div className="text-xs text-gray-500">{tAssessment('reward')}</div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-left text-xs text-gray-400">
                        {t('noReward')}
                      </div>
                    )}
                    
                    {onEditAssessment ? (
                      <button
                        onClick={() => onEditAssessment(assessment)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold text-xs whitespace-nowrap cursor-pointer"
                      >
                        ✏️ {tCommon('edit')}
                      </button>
                    ) : (
                      <Link
                        href={`/student/${studentId}/assessment/${assessment.id}/edit`}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold text-xs whitespace-nowrap cursor-pointer"
                      >
                        ✏️ {tCommon('edit')}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 分頁控制 */}
          {showPagination && (
            <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ⏮️
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ◀️ {tCommon('prevPage')}
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-bold transition-all ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tCommon('nextPage')} ▶️
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ⏭️
              </button>
              
              <span className="ml-4 text-sm text-gray-500">
                {tCommon('pageInfo', { current: currentPage, total: totalPages, count: filteredAssessments.length })}
              </span>
            </div>
          )}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg mb-2">
              📭 {selectedSubject 
                ? (locale === 'zh-TW' ? '此科目尚無評量記錄' : 'No records for this subject') 
                : t('noRecords')}
            </p>
            <p className="text-gray-400 text-sm">{t('addNewRecord')}</p>
          </div>
        )}
      </div>
    </>
  )
}

