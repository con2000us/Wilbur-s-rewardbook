import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()

    const { data: assessment, error } = await supabase
      .from('assessments')
      .select(`
        *,
        subjects (
          id, name, student_id
        )
      `)
      .eq('id', id)
      .single()

    if (error || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // Resolve student name via subjects.student_id
    let studentName = ''
    // biome-ignore lint/suspicious/noExplicitAny: Supabase join type
    const subjects = (assessment as any).subjects
    const studentId = subjects?.student_id

    if (studentId) {
      const { data: student } = await supabase
        .from('students')
        .select('name')
        .eq('id', studentId)
        .single()
      studentName = student?.name || ''
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        student_id: studentId || null,
        student_name: studentName,
        subject_id: assessment.subject_id,
        subject_name: subjects?.name || '',
        title: assessment.title,
        assessment_type: assessment.assessment_type,
        score: assessment.score,
        max_score: assessment.max_score,
        percentage: assessment.percentage,
        grade: assessment.grade,
        score_type: assessment.score_type,
        scoring_mode: assessment.scoring_mode,
        status: assessment.status,
        due_date: assessment.due_date,
        completed_date: assessment.completed_date,
        notes: assessment.notes,
        image_urls: assessment.image_urls,
        reward_amount: assessment.reward_amount,
        created_at: assessment.created_at,
        updated_at: assessment.updated_at,
      },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
