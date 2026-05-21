/**
 * Student context builder for AI assessment import.
 *
 * Builds minimal student context for the AI model following
 * the privacy principle: only send grade level, available subjects,
 * and recent assessment patterns. NEVER send student names.
 */

import { createClient } from '@/lib/supabase/server'

export interface StudentContextData {
  grade?: string
  candidateSubjects: Array<{ id: string; name: string }>
  recentAssessmentPatterns: string[]
  subjectArchiveHints: Array<{ detected: string; subject: string; count: number }>
}

/**
 * Build student context from the database.
 * Only includes grade, subjects, and recent assessment titles.
 * Student name is deliberately excluded for privacy.
 */
export async function buildStudentContext(studentId: string): Promise<StudentContextData> {
  const supabase = createClient()

  // Fetch subjects for this student
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('student_id', studentId)
    .order('order_index', { ascending: true })

  const subjectRows = (subjects || []).map((s) => ({ id: s.id, name: s.name }))
  const subjectIds = subjectRows.map((s) => s.id)
  const subjectNameById = new Map(subjectRows.map((subject) => [subject.id, subject.name]))

  // Fetch recent assessment titles for this student's subjects only.
  const { data: recentAssessments } = await supabase
    .from('assessments')
    .select('title, subject_id')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })
    .limit(10)

  // Try to get grade from this student's recent assessment history (optional).
  let grade: string | undefined
  const { data: latestWithGrade } = await supabase
    .from('assessments')
    .select('grade, subject_id')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : ['00000000-0000-0000-0000-000000000000'])
    .not('grade', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (latestWithGrade && latestWithGrade.length > 0) {
    grade = latestWithGrade[0].grade || undefined
  }

  const { data: confirmedImports } = await supabase
    .from('assessment_import_drafts')
    .select('detected_subject_name, subject_id')
    .eq('student_id', studentId)
    .eq('status', 'confirmed')
    .not('detected_subject_name', 'is', null)
    .not('subject_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(40)

  const archiveHintCounts = new Map<string, { detected: string; subject: string; count: number }>()
  ;(confirmedImports || []).forEach((row) => {
    const detected = (row.detected_subject_name || '').trim()
    const subject = row.subject_id ? subjectNameById.get(row.subject_id) : undefined
    if (!detected || !subject) return

    const key = `${detected}→${subject}`
    const current = archiveHintCounts.get(key)
    archiveHintCounts.set(key, {
      detected,
      subject,
      count: (current?.count || 0) + 1,
    })
  })

  return {
    grade,
    candidateSubjects: subjectRows,
    recentAssessmentPatterns: (recentAssessments || [])
      .map((a) => {
        const subjectName = a.subject_id ? subjectNameById.get(a.subject_id) : undefined
        return subjectName ? `${subjectName}: ${a.title}` : a.title
      })
      .filter((title): title is string => typeof title === 'string' && title.length > 0),
    subjectArchiveHints: Array.from(archiveHintCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  }
}
