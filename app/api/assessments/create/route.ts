import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  AssessmentCreateError,
  createAssessmentWithReward,
  type AssessmentCreatePayload,
} from '@/lib/assessments/createAssessmentWithReward'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AssessmentCreatePayload
    const supabase = createClient()
    const created = await createAssessmentWithReward(supabase, body)

    return NextResponse.json({ success: true, data: created.assessment })
  } catch (error) {
    if (error instanceof AssessmentCreateError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
