import { createClient } from '@/lib/supabase/server'
import { generateAssessmentTypeKey } from '@/lib/assessmentTypes'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type AssessmentTypeInsert = Database['public']['Tables']['assessment_types']['Insert']

type CreatePayload = {
  type_key?: string
  display_name?: string
  icon?: string
  color?: string | null
}

function normalizeProvidedKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

async function ensureUniqueTypeKey(supabase: ReturnType<typeof createClient>, baseKey: string) {
  let candidate = baseKey || `custom_${Math.random().toString(36).slice(2, 10)}`
  let suffix = 1

  while (suffix < 100) {
    const { data } = await supabase
      .from('assessment_types')
      .select('id')
      .eq('type_key', candidate)
      .maybeSingle()

    if (!data) return candidate

    candidate = `${baseKey}_${suffix}`
    suffix += 1
  }

  return `${baseKey}_${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePayload
    const supabase = createClient()
    const displayName = (body.display_name || '').trim()

    if (!displayName) {
      return NextResponse.json({ success: false, error: 'display_name is required' }, { status: 400 })
    }

    const baseKey = body.type_key
      ? normalizeProvidedKey(body.type_key)
      : generateAssessmentTypeKey(displayName)
    const typeKey = await ensureUniqueTypeKey(supabase, baseKey)

    const { data: maxOrderRow } = await supabase
      .from('assessment_types')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const insertData: AssessmentTypeInsert = {
      type_key: typeKey,
      display_name: displayName,
      icon: body.icon || 'assignment',
      color: body.color || '#64748b',
      display_order: Number(maxOrderRow?.display_order || 0) + 1,
      is_active: true,
      is_system: false,
    }

    const { data, error } = await supabase
      .from('assessment_types')
      .insert(insertData)
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
