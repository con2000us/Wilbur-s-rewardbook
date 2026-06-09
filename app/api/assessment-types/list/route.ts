import { createClient } from '@/lib/supabase/server'
import { normalizeAssessmentTypes, type AssessmentType } from '@/lib/assessmentTypes'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const searchParams = request.nextUrl.searchParams
  const includeInactive = searchParams.get('includeInactive') === 'true'
  const currentType = searchParams.get('currentType')

  try {
    let query = supabase
      .from('assessment_types')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    let types = normalizeAssessmentTypes((data || []) as AssessmentType[], currentType)

    if (currentType && !types.some((type) => type.type_key === currentType)) {
      const { data: current, error: currentError } = await supabase
        .from('assessment_types')
        .select('*')
        .eq('type_key', currentType)
        .maybeSingle()

      if (currentError) {
        return NextResponse.json({ success: false, error: currentError.message }, { status: 500 })
      }

      if (current) {
        types = normalizeAssessmentTypes([...((data || []) as AssessmentType[]), current as AssessmentType], currentType)
      }
    }

    return NextResponse.json({ success: true, types })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
