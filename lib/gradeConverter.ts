/**
 * 等級制評量轉換工具
 * 將 A+ ~ F 等級轉換為數字分數，用於獎金計算
 * 支援科目特定的等級對應設定
 */

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'

export const GRADE_OPTIONS: Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']

export interface GradeScoreRange {
  min: number
  max: number
  average: number
}

// 系統預設等級對應
export const DEFAULT_GRADE_TO_SCORE: Record<Grade, GradeScoreRange> = {
  'A+': { min: 97, max: 100, average: 98.5 },
  'A':  { min: 93, max: 96, average: 94.5 },
  'A-': { min: 90, max: 92, average: 91 },
  'B+': { min: 87, max: 89, average: 88 },
  'B':  { min: 83, max: 86, average: 84.5 },
  'B-': { min: 80, max: 82, average: 81 },
  'C+': { min: 77, max: 79, average: 78 },
  'C':  { min: 73, max: 76, average: 74.5 },
  'C-': { min: 70, max: 72, average: 71 },
  'D+': { min: 67, max: 69, average: 68 },
  'D':  { min: 63, max: 66, average: 64.5 },
  'D-': { min: 60, max: 62, average: 61 },
  'F':  { min: 0, max: 59, average: 30 },
}

// 向後兼容：保留舊的常數名稱
export const GRADE_TO_SCORE = DEFAULT_GRADE_TO_SCORE

/**
 * 解析科目特定的等級對應（從 JSONB 格式）
 */
export function parseSubjectGradeMapping(gradeMapping: any): Record<Grade, GradeScoreRange> | null {
  if (!gradeMapping || typeof gradeMapping !== 'object') return null
  
  try {
    const mapping: Record<string, GradeScoreRange> = {}
    for (const grade of GRADE_OPTIONS) {
      if (gradeMapping[grade] && typeof gradeMapping[grade] === 'object') {
        const range = gradeMapping[grade]
        if (typeof range.average === 'number') {
          mapping[grade] = {
            min: typeof range.min === 'number' ? range.min : range.average,
            max: typeof range.max === 'number' ? range.max : range.average,
            average: range.average
          }
        }
      }
    }
    
    // 確保所有等級都有對應
    if (Object.keys(mapping).length === GRADE_OPTIONS.length) {
      return mapping as Record<Grade, GradeScoreRange>
    }
  } catch (err) {
    console.error('Failed to parse subject grade mapping:', err)
  }
  
  return null
}

/**
 * 獲取等級對應表（優先使用科目特定設定，否則使用系統預設）
 */
export function getGradeMapping(subjectGradeMapping: any): Record<Grade, GradeScoreRange> {
  const customMapping = parseSubjectGradeMapping(subjectGradeMapping)
  return customMapping || DEFAULT_GRADE_TO_SCORE
}

/**
 * 將等級轉換為數字分數（使用最高分數）
 * @param grade 等級
 * @param subjectGradeMapping 科目特定的等級對應（可選）
 */
export function gradeToScore(grade: string | null, subjectGradeMapping?: any): number | null {
  if (!grade) return null
  
  const mapping = getGradeMapping(subjectGradeMapping)
  if (!(grade in mapping)) return null
  
  return mapping[grade as Grade].max
}

/**
 * 將等級轉換為百分比
 * @param grade 等級
 * @param maxScore 滿分
 * @param subjectGradeMapping 科目特定的等級對應（可選）
 */
export function gradeToPercentage(grade: string | null, maxScore: number = 100, subjectGradeMapping?: any): number | null {
  const score = gradeToScore(grade, subjectGradeMapping)
  if (score === null) return null
  return (score / maxScore) * 100
}

/**
 * 驗證等級是否有效
 */
export function isValidGrade(grade: string | null): grade is Grade {
  return grade !== null && grade in DEFAULT_GRADE_TO_SCORE
}
