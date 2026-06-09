import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type DeletePayload = {
  id?: string
  type_id?: string
  mode?: 'soft' | 'hard'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeletePayload
    const supabase = createClient()
    const id = body.id || body.type_id
    const mode = body.mode || 'soft'

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    if (mode === 'hard') {
      const { data: type, error: typeError } = await supabase
        .from('assessment_types')
        .select('id, type_key, display_name, is_system')
        .eq('id', id)
        .single()

      if (typeError || !type) {
        return NextResponse.json(
          { success: false, error: typeError?.message || 'Assessment type not found' },
          { status: 404 }
        )
      }

      if (type.is_system) {
        return NextResponse.json(
          { success: false, error: 'Default assessment types can only be hidden.' },
          { status: 403 }
        )
      }

      const [
        assessmentsCount,
        rewardRulesCount,
        draftsCount,
      ] = await Promise.all([
        countTypeUsage(supabase, 'assessments', type.type_key),
        countTypeUsage(supabase, 'reward_rules', type.type_key),
        countTypeUsage(supabase, 'assessment_import_drafts', type.type_key),
      ])

      const usage = {
        assessments: assessmentsCount.count,
        reward_rules: rewardRulesCount.count,
        assessment_import_drafts: draftsCount.count,
      }
      const usageError = assessmentsCount.error || rewardRulesCount.error || draftsCount.error

      if (usageError) {
        return NextResponse.json({ success: false, error: usageError }, { status: 500 })
      }

      const totalUsage = Object.values(usage).reduce((sum, count) => sum + count, 0)
      if (totalUsage > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'This assessment type is in use. Hide it instead of deleting it.',
            usage,
          },
          { status: 409 }
        )
      }

      const { error: deleteError } = await supabase
        .from('assessment_types')
        .delete()
        .eq('id', id)

      if (deleteError) {
        return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, deleted: true })
    }

    const { data, error } = await supabase
      .from('assessment_types')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

async function countTypeUsage(
  supabase: ReturnType<typeof createClient>,
  table: 'assessments' | 'reward_rules' | 'assessment_import_drafts',
  typeKey: string
) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('assessment_type', typeKey)

  return {
    count: count || 0,
    error: error?.message,
  }
}
