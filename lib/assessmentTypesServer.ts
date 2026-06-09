import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type AssessmentType,
  DEFAULT_ASSESSMENT_TYPES,
  normalizeAssessmentTypes,
} from '@/lib/assessmentTypes'

const ASSESSMENT_TYPES_MIGRATION = 'database/migrations/add-assessment-types.sql'

function isMissingAssessmentTypesTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes("Could not find the table 'public.assessment_types'")
  )
}

export async function fetchAssessmentTypes(
  supabase: SupabaseClient,
  options: { includeInactive?: boolean; currentTypeKey?: string | null } = {}
) {
  let query = supabase
    .from('assessment_types')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!options.includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    if (isMissingAssessmentTypesTable(error)) {
      console.warn(
        `assessment_types table is missing; using built-in defaults. Run ${ASSESSMENT_TYPES_MIGRATION} in Supabase SQL Editor.`,
        error.message
      )
      return normalizeAssessmentTypes(DEFAULT_ASSESSMENT_TYPES, options.currentTypeKey)
    }

    console.error(
      'Failed to load assessment_types:',
      error.message || error.code || error
    )
    return normalizeAssessmentTypes(DEFAULT_ASSESSMENT_TYPES, options.currentTypeKey)
  }

  return normalizeAssessmentTypes((data || []) as AssessmentType[], options.currentTypeKey)
}
