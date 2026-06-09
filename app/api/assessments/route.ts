import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const rawLimit = searchParams.get('limit')

    if (!studentId) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    }

    let limit = 10
    if (rawLimit) {
      const parsed = parseInt(rawLimit, 10)
      if (Number.isNaN(parsed) || parsed < 1) {
        return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 })
      }
      limit = Math.min(parsed, 50)
    }

    const supabase = createClient()

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { data: assessments, error } = await supabase
      .from('assessments')
      .select(`
        id,
        subject_id,
        title,
        assessment_type,
        score,
        max_score,
        percentage,
        scoring_mode,
        completed_date,
        image_urls,
        reward_amount,
        subjects!inner ( id, name, student_id )
      `)
      .eq('subjects.student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Assessments list query error:', error)
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
    }

    const result = (assessments || []).map((item) => {
      // biome-ignore lint/suspicious/noExplicitAny: Supabase join type
      const subjects = (item as any).subjects
      return {
        id: item.id,
        subject_id: item.subject_id,
        subject_name: subjects?.name || '',
        title: item.title,
        assessment_type: item.assessment_type,
        score: item.score,
        max_score: item.max_score,
        percentage: item.percentage,
        scoring_mode: item.scoring_mode,
        completed_date: item.completed_date,
        image_urls: item.image_urls,
        reward_amount: item.reward_amount,
      }
    })

    return NextResponse.json({ success: true, assessments: result })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
