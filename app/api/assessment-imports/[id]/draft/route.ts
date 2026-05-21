/**
 * PATCH /api/assessment-imports/[id]/draft
 *
 * Edit the draft before confirmation.
 * Accepts partial updates to the draft fields.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    const supabase = createClient()

    // Get draft
    const { data: draft, error: draftError } = await supabase
      .from('assessment_import_drafts')
      .select('id, status, score, max_score')
      .eq('job_id', jobId)
      .maybeSingle()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (draft.status !== 'draft') {
      return NextResponse.json(
        { error: `Draft is already ${draft.status}` },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Allowed fields for editing
    const allowedFields = [
      'subject_id',
      'title',
      'assessment_type',
      'score',
      'max_score',
      'percentage',
      'assessment_date',
      'notes',
    ]

    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates[key] = value === '' ? null : value
      }
    }

    // Recalculate percentage if score or max_score changed
    if ('score' in updates || 'max_score' in updates) {
      const score = 'score' in updates ? (updates.score as number) : draft.score
      const maxScore = 'max_score' in updates ? (updates.max_score as number) : draft.max_score

      if (score != null && maxScore != null && maxScore > 0) {
        updates.percentage = Math.round((Number(score) / Number(maxScore)) * 10000) / 100
      }
    }

    const hasMistakeUpdates = Array.isArray(body.mistakes)

    if (Object.keys(updates).length === 0 && !hasMistakeUpdates) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    let updated = null
    let updateError = null

    if (Object.keys(updates).length > 0) {
      const result = await supabase
        .from('assessment_import_drafts')
        .update(updates)
        .eq('id', draft.id)
        .select('*')
        .single()

      updated = result.data
      updateError = result.error
    } else {
      const result = await supabase
        .from('assessment_import_drafts')
        .select('*')
        .eq('id', draft.id)
        .single()

      updated = result.data
      updateError = result.error
    }

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (hasMistakeUpdates) {
      const { error: deleteError } = await supabase
        .from('assessment_import_mistake_drafts')
        .delete()
        .eq('draft_id', draft.id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      const mistakes = body.mistakes
        .filter((m: Record<string, unknown>) =>
          Boolean(
            m.question_number ||
            m.student_answer ||
            m.correct_answer ||
            m.mistake_type ||
            m.knowledge_point ||
            m.ai_reason
          )
        )
        .map((m: Record<string, unknown>) => ({
          draft_id: draft.id,
          question_number: m.question_number || null,
          student_answer: m.student_answer || null,
          correct_answer: m.correct_answer || null,
          mistake_type: m.mistake_type || null,
          knowledge_point: m.knowledge_point || null,
          ai_reason: m.ai_reason || null,
          confidence: typeof m.confidence === 'number' ? m.confidence : null,
        }))

      if (mistakes.length > 0) {
        const { error: insertError } = await supabase
          .from('assessment_import_mistake_drafts')
          .insert(mistakes)

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    }

    const { data: mistakeDrafts } = await supabase
      .from('assessment_import_mistake_drafts')
      .select('*')
      .eq('draft_id', draft.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      draft: updated,
      mistake_drafts: mistakeDrafts || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
