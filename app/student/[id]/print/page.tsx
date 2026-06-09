import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButtons from './PrintButtons'
import PrintFilters from './PrintFilters'
import { getTranslations, getLocale } from 'next-intl/server'
import { fetchAssessmentTypes } from '@/lib/assessmentTypesServer'
import {
  getAssessmentTypeColor,
  getAssessmentTypeIcon,
  getAssessmentTypeLabel,
} from '@/lib/assessmentTypes'

export default async function PrintPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string; subject?: string; startDate?: string; endDate?: string; calculateFromReset?: string }>
}) {
  const { id } = await params
  const { month, subject, startDate, endDate, calculateFromReset } = await searchParams
  const supabase = createClient()
  const t = await getTranslations('print')
  const tAssessment = await getTranslations('assessment')
  const locale = await getLocale()
  
  // 獲取學生資料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()
  
  if (!student) {
    notFound()
  }
  
  // 獲取科目
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', id)
    .order('order_index')

  const assessmentTypes = await fetchAssessmentTypes(supabase, { includeInactive: true })
  
  // 獲取評量列表
  const { data: allAssessments } = await supabase
    .from('assessments')
    .select(`
      *,
      subjects (
        name,
        color,
        icon
      )
    `)
    // @ts-ignore - Supabase type inference issue with select queries
    .in('subject_id', subjects?.map((s: any) => s.id) || [])
    .order('due_date', { ascending: false })
  
  // 根據日期區間、月份和科目篩選
  let assessments: typeof allAssessments = allAssessments
  
  // 優先使用日期區間，如果沒有則使用月份
  if (startDate && endDate && assessments) {
    // @ts-ignore - Supabase type inference issue with select queries
    assessments = assessments.filter((a: any) => {
      if (!a.due_date) return false
      const assessmentDate = new Date(a.due_date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      // 設置時間為當天的開始和結束
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      assessmentDate.setHours(0, 0, 0, 0)
      return assessmentDate >= start && assessmentDate <= end
    })
  } else if (month && assessments) {
    // 如果沒有日期區間，則使用月份篩選（向後兼容）
    // @ts-ignore - Supabase type inference issue with select queries
    assessments = assessments.filter((a: any) => {
      if (!a.due_date) return false
      const date = new Date(a.due_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return monthKey === month
    })
  }
  
  // 如果指定了 calculateFromReset，需要找到最近的歸零記錄並過濾
  if (calculateFromReset === 'true' && assessments) {
    // 獲取交易記錄以找到歸零點
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('student_id', id)
      .eq('transaction_type', 'reset')
      .order('transaction_date', { ascending: false })
      .limit(1)
    
    if (transactions && transactions.length > 0) {
      // @ts-ignore - Supabase type inference issue
      const lastReset = transactions[0] as any
      const lastResetDate = lastReset.transaction_date || lastReset.created_at
      if (lastResetDate) {
        const resetDate = new Date(lastResetDate)
        const resetDateOnly = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate()).getTime()
        
        // @ts-ignore - Supabase type inference issue with select queries
        assessments = assessments.filter((a: any) => {
          if (!a.due_date && !a.completed_date) return true
          const assessmentDate = new Date(a.due_date || a.completed_date || a.created_at)
          const assessmentDateOnly = new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate()).getTime()
          return assessmentDateOnly > resetDateOnly
        })
      }
    }
  }
  
  // 篩選科目
  if (subject && assessments) {
    // @ts-ignore - Supabase type inference issue with select queries
    assessments = assessments.filter((a: any) => a.subject_id === subject)
  }

  // 解析頭像
  const parseAvatar = (avatarUrl: string | null) => {
    if (!avatarUrl) return null
    const parts = avatarUrl.split('|')
    if (parts.length !== 2) return null
    const emoji = parts[0].replace('emoji:', '')
    const gradient = parts[1]
    return { emoji, gradient }
  }
  
  // @ts-ignore - Supabase type inference issue with select queries
  const avatar = parseAvatar((student as any).avatar_url)

  // 獲取選中的科目資訊
  // @ts-ignore - Supabase type inference issue with select queries
  const selectedSubject = subject ? subjects?.find((s: any) => s.id === subject) : null

  const tMonths = await getTranslations('months')
  
  // 格式化月份
  const formatMonth = (monthKey: string) => {
    const [year, monthNum] = monthKey.split('-')
    const monthNames = [
      tMonths('january'), tMonths('february'), tMonths('march'), tMonths('april'),
      tMonths('may'), tMonths('june'), tMonths('july'), tMonths('august'),
      tMonths('september'), tMonths('october'), tMonths('november'), tMonths('december')
    ]
    return tMonths('format', { year, month: monthNames[parseInt(monthNum) - 1] })
  }

  // 統計
  const totalAssessments = assessments?.length || 0
  // @ts-ignore - Supabase type inference issue with select queries
  const completedAssessments = assessments?.filter((a: any) => a.status === 'completed').length || 0
  // @ts-ignore - Supabase type inference issue with select queries
  const totalReward = assessments?.filter((a: any) => a.status === 'completed').reduce((sum: number, a: any) => sum + (a.reward_amount || 0), 0) || 0
  // @ts-ignore - Supabase type inference issue with select queries
  const avgScore = assessments?.filter((a: any) => a.status === 'completed' && a.percentage !== null).reduce((sum: number, a: any, _: any, arr: any[]) => sum + (a.percentage || 0) / arr.length, 0) || 0

  // Emoji 到 Material Icons Outlined 的映射表
  const emojiToMaterialIcon: Record<string, string> = {
    '📖': 'auto_stories',
    '📚': 'menu_book',
    '🔢': 'calculate',
    '🧮': 'calculate',
    '🌍': 'public',
    '🌏': 'school',
    '🔬': 'science',
    '🧪': 'science',
    '🎵': 'music_note',
    '🎹': 'piano',
    '🎸': 'guitar',
    '🎨': 'palette',
    '🖌️': 'brush',
    '⚽': 'sports_soccer',
    '🏀': 'sports_basketball',
    '🏐': 'sports_volleyball',
    '🎾': 'sports_tennis',
    '✏️': 'edit',
    '📝': 'description',
    '💻': 'computer',
    '🖥️': 'desktop_windows',
    '🌱': 'eco',
    '🌿': 'nature',
    '🌳': 'park',
    '📜': 'article',
    '📰': 'school',
    '🎭': 'theater_comedy',
    '🩰': 'ballet',
    '🥁': 'drum_kit',
    '📐': 'square_foot',
    '⚗️': 'science',
    '🔭': 'biotech',
    '📄': 'description',
    '📋': 'description',
    '🎯': 'gps_fixed',
    '🏫': 'school',
    '📗': 'menu_book',
    '📘': 'menu_book',
    '📙': 'menu_book',
    '📕': 'menu_book',
  }

  // 將 emoji 轉換為 Material Icon
  const convertEmojiToMaterialIcon = (icon: string): string => {
    if (/^[a-z_]+$/i.test(icon) && icon.length > 2) {
      return icon
    }
    return emojiToMaterialIcon[icon] || 'description'
  }

  // 評量類型映射（包含 Material Icon 和顏色）
  const getAssessmentTypeDisplay = (type: string) => {
    return {
      icon: getAssessmentTypeIcon(assessmentTypes, type),
      color: getAssessmentTypeColor(assessmentTypes, type),
      text: getAssessmentTypeLabel(assessmentTypes, type, type || (locale === 'zh-TW' ? '評量' : 'Assessment')),
    }
  }

  return (
    <div className="max-w-[210mm] mx-auto bg-white p-8 border-2 border-gray-300" style={{fontFamily: "'Noto Sans TC', sans-serif", background: 'white'}}>
        {/* 打印按鈕 */}
        <PrintButtons />
        
        {/* 日期和科目選擇器 */}
        <PrintFilters subjects={subjects || []} />

        {/* A4 列印內容 */}
        <div className="border-2 border-gray-300 p-6 bg-white" style={{background: 'white'}}>
          {/* 標題區 */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
            <div className="flex items-center justify-center gap-3 mb-2">
              {avatar ? (
                <div 
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-2xl`}
                >
                  {avatar.emoji}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-2xl text-white">
                  {/* @ts-ignore - Supabase type inference issue with select queries */}
                  {(student as any).name.charAt(0)}
                </div>
              )}
              {/* @ts-ignore - Supabase type inference issue with select queries */}
              <h1 className="text-3xl font-bold">{t('title', { name: (student as any).name })}</h1>
            </div>
            <p className="text-gray-600 flex items-center gap-2">
              {/* @ts-ignore - Supabase type inference issue with select queries */}
              {selectedSubject && (() => {
                const icon = (selectedSubject as any).icon
                const color = (selectedSubject as any).color || '#6b7280'
                const subjectIcon = convertEmojiToMaterialIcon(icon)
                return (
                  <>
                    <span 
                      className="material-icons-outlined" 
                      style={{ color: color }}
                    >
                      {subjectIcon}
                    </span>
                    <span>{(selectedSubject as any).name} - </span>
                  </>
                )
              })()}
              {startDate && endDate 
                ? t('dateRangeReport', { 
                    startDate: new Date(startDate).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    endDate: new Date(endDate).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  })
                : month 
                  ? t('monthReport', { month: formatMonth(month) }) 
                  : t('allRecords')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {t('printDate')}{locale === 'zh-TW' ? '：' : ': '}{new Date().toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded border border-gray-200" style={{background: '#f9fafb', borderColor: '#e5e7eb'}}>
              <div className="text-2xl font-bold text-blue-600">{totalAssessments}</div>
              <div className="text-xs text-gray-600">{t('totalAssessments')}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded border border-gray-200" style={{background: '#f9fafb', borderColor: '#e5e7eb'}}>
              <div className="text-2xl font-bold text-green-600">{completedAssessments}</div>
              <div className="text-xs text-gray-600">{t('completed')}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded border border-gray-200" style={{background: '#f9fafb', borderColor: '#e5e7eb'}}>
              <div className="text-2xl font-bold text-purple-600">{avgScore.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">{t('averageScore')}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded border border-gray-200" style={{background: '#f9fafb', borderColor: '#e5e7eb'}}>
              <div className="text-2xl font-bold text-orange-600">${totalReward}</div>
              <div className="text-xs text-gray-600">{t('totalReward')}</div>
            </div>
          </div>

          {/* 評量記錄表格 */}
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            📋 {t('assessmentDetails')}
          </h2>
          
          {assessments && assessments.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="border border-gray-300 p-2 text-left">{t('date')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('subject')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('type')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('name')}</th>
                  <th className="border border-gray-300 p-2 text-center">{t('score')}</th>
                  <th className="border border-gray-300 p-2 text-center">{tAssessment('percentage')}</th>
                  <th className="border border-gray-300 p-2 text-center">{t('reward')}</th>
                  <th className="border border-gray-300 p-2 text-center">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {/* @ts-ignore - Supabase type inference issue with select queries */}
                {assessments.map((assessment: any, index: number) => (
                  <tr key={assessment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2 text-xs">
                      {assessment.due_date 
                        ? new Date(assessment.due_date).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })
                        : '-'}
                    </td>
                    <td className="border border-gray-300 p-2 flex items-center gap-1">
                      {(() => {
                        const icon = assessment.subjects?.icon
                        const color = assessment.subjects?.color || '#6b7280'
                        if (!icon) return null
                        const subjectIcon = convertEmojiToMaterialIcon(icon)
                        return (
                          <span 
                            className="material-icons-outlined text-sm" 
                            style={{ color: color }}
                          >
                            {subjectIcon}
                          </span>
                        )
                      })()}
                      <span>{assessment.subjects?.name}</span>
                    </td>
                    <td className="border border-gray-300 p-2 text-xs">
                      {(() => {
                        const typeDisplay = getAssessmentTypeDisplay(assessment.assessment_type)
                        return (
                          <span className="flex items-center gap-1" style={{ color: typeDisplay.color }}>
                            <span className="material-icons-outlined text-sm">{typeDisplay.icon}</span>
                            {typeDisplay.text}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {assessment.title}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-semibold">
                      {assessment.scoring_mode === 'record_only' ? (
                        <span className="text-xs font-bold text-slate-500">
                          {locale === 'zh-TW' ? '不計分' : 'No score'}
                        </span>
                      ) : assessment.score_type === 'letter' && assessment.grade ? (
                        <span className="text-lg font-bold">
                          {assessment.grade}
                          {assessment.score !== null && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({assessment.score.toFixed(1)}/{assessment.max_score})
                            </span>
                          )}
                        </span>
                      ) : (
                        assessment.score !== null ? `${assessment.score}/${assessment.max_score}` : '-'
                      )}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {assessment.scoring_mode === 'record_only'
                        ? (locale === 'zh-TW' ? '不列入' : 'Excluded')
                        : assessment.percentage !== null ? `${assessment.percentage.toFixed(1)}%` : '-'}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-semibold text-green-600">
                      {assessment.reward_amount > 0 ? `$${assessment.reward_amount}` : '-'}
                    </td>
                    <td className="border border-gray-300 p-2 text-center text-xs">
                      {assessment.status === 'completed' ? '✅' : '⏳'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-300 rounded">
              <p>📭 {t('noRecords')}</p>
            </div>
          )}

          {/* 頁尾 */}
          <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
            <p>{t('footer')}</p>
          </div>
        </div>
    </div>
  )
}
