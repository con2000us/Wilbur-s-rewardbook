'use client'

import React from 'react'
import { useLocale, useTranslations } from 'next-intl'

interface AssessmentRecord {
  id: string
  subject_id: string
  title: string
  score: number | null
  due_date: string | null
  reward_amount: number
  assessment_type?: string
  grade?: string | null
  score_type?: string | null
  subjects?: {
    name: string
    color: string
    icon: string
  }
  description?: string
  notes?: string | null
}

interface RecordCardProps {
  record: AssessmentRecord
  onClick?: () => void
}

const AssessmentRecordCard: React.FC<RecordCardProps> = ({ record, onClick }) => {
  const locale = useLocale()
  const t = useTranslations('student')
  
  // Emoji 到 Material Icons Outlined 的映射表
  const emojiToMaterialIcon: Record<string, string> = {
    '📖': 'auto_stories',      // 書本 → 故事書
    '📚': 'menu_book',         // 書堆 → 選單書
    '🔢': 'calculate',         // 數字 → 計算
    '🧮': 'calculate',         // 算盤 → 計算
    '🌍': 'public',            // 地球 → 公共
    '🌏': 'school',            // 地球 → 學校（社會）
    '🔬': 'science',           // 顯微鏡 → 科學
    '🧪': 'science',           // 試管 → 科學
    '🎵': 'music_note',        // 音符 → 音樂
    '🎹': 'piano',             // 鋼琴 → 鋼琴
    '🎸': 'guitar',            // 吉他 → 吉他
    '🎨': 'palette',           // 調色盤 → 調色盤
    '🖌️': 'brush',            // 畫筆 → 畫筆
    '⚽': 'sports_soccer',      // 足球 → 足球
    '🏀': 'sports_basketball',  // 籃球 → 籃球
    '🏐': 'sports_volleyball', // 排球 → 排球
    '🎾': 'sports_tennis',     // 網球 → 網球
    '✏️': 'edit',              // 鉛筆 → 編輯
    '📝': 'description',       // 備忘錄 → 描述
    '💻': 'computer',          // 筆電 → 電腦
    '🖥️': 'desktop_windows',  // 桌面 → 桌面
    '🌱': 'eco',               // 幼苗 → 生態
    '🌿': 'nature',            // 葉子 → 自然
    '🌳': 'park',              // 樹 → 公園
    '📜': 'article',           // 卷軸 → 文章
    '📰': 'school',            // 報紙 → 學校（社會）
    '🎭': 'theater_comedy',    // 戲劇 → 喜劇
    '🩰': 'ballet',            // 芭蕾 → 芭蕾
    '🥁': 'drum_kit',          // 鼓 → 鼓組
    '📐': 'square_foot',       // 三角尺 → 平方英尺
    '⚗️': 'science',           // 化學 → 科學
    '🔭': 'biotech',           // 望遠鏡 → 生物技術
    '📄': 'description',       // 文件 → 描述
    '📋': 'description',       // 剪貼板 → 描述
    '🎯': 'gps_fixed',         // 靶心 → GPS
    '🏫': 'school',            // 學校 → 學校
    '📗': 'menu_book',         // 綠書 → 選單書
    '📘': 'menu_book',         // 藍書 → 選單書
    '📙': 'menu_book',         // 橘書 → 選單書
    '📕': 'menu_book',         // 紅書 → 選單書
  }

  // 將 emoji 轉換為 Material Icon
  const convertEmojiToMaterialIcon = (icon: string): string => {
    // 如果已經是 Material Icon 名稱，直接返回
    if (/^[a-z_]+$/i.test(icon) && icon.length > 2) {
      return icon
    }
    // 如果是 emoji，查找映射表
    return emojiToMaterialIcon[icon] || 'description'
  }

  // 獲取科目顏色和圖標
  const subjectColor = record.subjects?.color || '#6b7280'
  const rawSubjectIcon = record.subjects?.icon || 'description'
  const subjectIcon = convertEmojiToMaterialIcon(rawSubjectIcon)
  const subjectName = record.subjects?.name || ''
  
  // 確定分數顏色
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400'
    if (score === 100) return 'text-emerald-500'
    if (score >= 90) return 'text-slate-700'
    return 'text-slate-400'
  }

  // 確定等級顏色
  const getGradeColor = (grade: string | null | undefined) => {
    if (!grade) return 'text-slate-400'
    if (grade.startsWith('A')) return 'text-emerald-500'
    if (grade.startsWith('B')) return 'text-blue-500'
    if (grade.startsWith('C')) return 'text-yellow-500'
    if (grade.startsWith('D')) return 'text-orange-500'
    return 'text-red-500' // F
  }

  const scoreColor = getScoreColor(record.score)
  const gradeColor = getGradeColor(record.grade)
  
  // 判斷是否使用等級制
  // 優先級：score_type === 'letter' > grade 存在 > score 存在
  // 如果 score_type 是 'letter'，無論 score 是否有值，都應該顯示 grade
  const isLetterGrade = record.score_type === 'letter' && record.grade
  
  // 格式化日期顯示
  const formatDisplayDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (locale === 'zh-TW') {
      return `${date.getMonth() + 1}${t('month')}${date.getDate()}${t('day')}`
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[date.getMonth()]} ${date.getDate()}`
    }
  }
  
  // 格式化日期（用於底部顯示）
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US')
  }

  // 獲取科目對應的邊框顏色類名
  const getBorderColor = (color: string) => {
    // 使用內聯樣式處理自定義顏色
    return color
  }

  // 根據評量種類獲取對應的 Material Icon
  const getAssessmentTypeIcon = (type: string | undefined | null): string => {
    const typeIconMap: Record<string, string> = {
      'exam': 'assignment',      // 考試 → 作業/任務
      'quiz': 'checklist_rtl',   // 小考 → 檢查清單（右到左）
      'homework': 'edit_note',   // 作業 → 編輯筆記
      'project': 'palette',      // 專題 → 調色盤
    }
    return typeIconMap[type || ''] || 'history_edu'  // 預設為歷史教育
  }

  return (
    <div 
      className={`group glass-card p-6 rounded-[2.5rem] shadow-sm relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
      style={{ 
        borderLeft: `8px solid ${getBorderColor(subjectColor)}`,
        borderRadius: '2.5rem'
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-8">
        <div className="flex gap-4">
          {/* 背景裝飾圓形 */}
          <div 
            className="w-16 h-16 rounded-3xl flex items-center justify-center opacity-10 absolute top-6 left-6 -z-10"
            style={{ backgroundColor: subjectColor }}
          ></div>
          
          {/* 科目圖標 - 統一使用 Material Icons Outlined */}
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center relative z-0">
            <span className="material-icons-outlined" style={{ color: subjectColor, fontSize: '3.11rem' }}>
              {subjectIcon}
            </span>
            <div 
              className="absolute inset-0 rounded-3xl opacity-10"
              style={{ backgroundColor: subjectColor }}
            ></div>
          </div>
          
          <div>
            <h3 className="text-xl font-black mb-2">{record.title || record.description || formatDisplayDate(record.due_date)}</h3>
            <div className="flex items-center gap-2">
              <span 
                className="px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1"
                style={{ 
                  backgroundColor: `${subjectColor}20`,
                  color: subjectColor
                }}
              >
                <span className="material-icons-outlined text-[14px]">{getAssessmentTypeIcon(record.assessment_type)}</span> {subjectName}
              </span>
              <span className="text-slate-400 text-sm">
                {formatDisplayDate(record.due_date) || (record.description ? `${t('unitLabel')}${record.description}` : '')}
              </span>
            </div>
            {record.notes && (
              <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                {locale === 'zh-TW' ? '備註：' : 'Notes: '}{record.notes}
              </p>
            )}
          </div>
        </div>
        
        {/* 獎金標籤 */}
        {record.reward_amount > 0 && (
          <div className="bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            <span className="text-orange-600 font-bold text-sm">${record.reward_amount}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
          <span className="material-icons-outlined text-sm">calendar_today</span>
          {formatDate(record.due_date)}
        </div>
        <div className="flex items-baseline gap-1">
          {isLetterGrade ? (
            <span className={`text-5xl font-black ${gradeColor}`}>{record.grade}</span>
          ) : (
            <>
          <span className={`text-5xl font-black ${scoreColor}`}>{record.score ?? '-'}</span>
          <span className="text-slate-400 font-bold">{t('points')}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssessmentRecordCard
