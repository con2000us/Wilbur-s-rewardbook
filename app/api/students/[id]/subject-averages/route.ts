import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type AssessmentRow = {
  subject_id: string | null
  percentage: number | string | null
  title: string | null
  assessment_type: string | null
  due_date: string | null
  completed_date: string | null
  created_at: string | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createClient()
    const { id: studentId } = await params

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, icon, color, order_index')
      .eq('student_id', studentId)
      .order('order_index', { ascending: true })

    if (subjectsError) {
      return NextResponse.json({ error: subjectsError.message }, { status: 500 })
    }

    if (!subjects?.length) {
      return NextResponse.json({ success: true, subjects: [] })
    }

    const subjectIds = subjects.map((subject) => subject.id)
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('subject_id, percentage, title, assessment_type, due_date, completed_date, created_at')
      .in('subject_id', subjectIds)
      .eq('status', 'completed')
      .not('percentage', 'is', null)

    if (assessmentsError) {
      return NextResponse.json({ error: assessmentsError.message }, { status: 500 })
    }

    const getAssessmentDateValue = (row: AssessmentRow) =>
      row.due_date || row.completed_date || row.created_at

    const getAssessmentSortTime = (row: AssessmentRow) => {
      const dateValue = getAssessmentDateValue(row)
      return dateValue ? new Date(dateValue).getTime() : 0
    }

    const buckets = new Map<string, { sum: number; count: number }>()
    const recentBySubject = new Map<
      string,
      Array<{
        title: string
        date: string | null
        percentage: number
        assessment_type: string | null
        sortTime: number
      }>
    >()

    ;((assessments || []) as AssessmentRow[]).forEach((row) => {
      if (!row.subject_id || row.percentage == null) {
        return
      }

      const percentage = Number(row.percentage)
      if (!Number.isFinite(percentage)) {
        return
      }

      const bucket = buckets.get(row.subject_id) || { sum: 0, count: 0 }
      bucket.sum += percentage
      bucket.count += 1
      buckets.set(row.subject_id, bucket)

      const recent = recentBySubject.get(row.subject_id) || []
      recent.push({
        title: row.title || '',
        date: getAssessmentDateValue(row),
        percentage,
        assessment_type: row.assessment_type,
        sortTime: getAssessmentSortTime(row),
      })
      recentBySubject.set(row.subject_id, recent)
    })

    const result = subjects.map((subject) => {
      const bucket = buckets.get(subject.id)
      const average =
        bucket && bucket.count > 0 ? Math.round((bucket.sum / bucket.count) * 10) / 10 : null

      const recentAssessments = (recentBySubject.get(subject.id) || [])
        .sort((a, b) => b.sortTime - a.sortTime)
        .slice(0, 3)
        .map((entry) => ({
          title: entry.title || 'Untitled',
          date: entry.date,
          percentage: Math.round(entry.percentage * 10) / 10,
          assessment_type: entry.assessment_type,
        }))

      return {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        color: subject.color || '#4a9eff',
        average,
        recentAssessments,
      }
    })

    return NextResponse.json({ success: true, subjects: result })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          'An unexpected error occurred: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 },
    )
  }
}
