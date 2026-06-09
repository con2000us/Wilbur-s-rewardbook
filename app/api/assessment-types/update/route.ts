import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type AssessmentTypeUpdate = Database['public']['Tables']['assessment_types']['Update']

type UpdatePayload = AssessmentTypeUpdate & {
  id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdatePayload
    const supabase = createClient()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('assessment_types')
      .select('id, type_key, is_system')
      .eq('id', id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ success: false, error: existingError?.message || 'Assessment type not found' }, { status: 404 })
    }

    if (body.type_key && body.type_key !== existing.type_key) {
      return NextResponse.json({ success: false, error: 'type_key cannot be changed' }, { status: 400 })
    }

    const updateData: AssessmentTypeUpdate = {
      updated_at: new Date().toISOString(),
    }

    if (body.display_name !== undefined) updateData.display_name = String(body.display_name || '').trim()
    if (body.icon !== undefined) updateData.icon = body.icon || 'assignment'
    if (body.color !== undefined) updateData.color = body.color || '#64748b'
    if (body.display_order !== undefined) updateData.display_order = body.display_order
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.is_system !== undefined && !existing.is_system) updateData.is_system = body.is_system

    if (updateData.display_name !== undefined && !updateData.display_name) {
      return NextResponse.json({ success: false, error: 'display_name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('assessment_types')
      .update(updateData)
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
