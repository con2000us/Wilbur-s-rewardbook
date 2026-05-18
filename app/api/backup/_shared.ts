import { createClient } from '@/lib/supabase/server'

export interface BackupData {
  version: string
  exported_at: string
  exported_by: string
  tables: Record<string, any[]>
  metadata: {
    total_students: number
    total_subjects: number
    total_assessments: number
    total_transactions: number
    total_reward_rules: number
    total_settings: number
    total_goal_templates: number
    total_custom_reward_types: number
    total_achievement_events: number
    total_exchange_rules: number
    students_detail: Array<{
      id: string
      name: string
      subjects_count: number
      assessments_count: number
      transactions_count: number
    }>
  }
}

/**
 * 匯出所有資料表的共用函數。
 * 可在 backup/export 和 backup/full-export 中復用。
 */
export async function createBackupData(supabase: ReturnType<typeof createClient>): Promise<BackupData> {
  const tableNames = [
    'students',
    'subjects',
    'assessments',
    'transactions',
    'reward_rules',
    'site_settings',
    'goal_templates',
    'goal_template_event_links',
    'custom_reward_types',
    'achievement_events',
    'achievement_event_reward_rules',
    'exchange_rules',
    'exchange_rule_translations',
    'achievement_event_translations',
  ] as const

  const queries = tableNames.map((table) =>
    supabase.from(table).select('*').order('created_at', { ascending: true })
  )

  const results = await Promise.all(queries)

  const errors = results
    .map((r, i) => ({ table: tableNames[i], error: r.error }))
    .filter((e) => e.error)

  if (errors.length > 0) {
    throw new Error(
      `Failed to export some tables: ${errors.map((e) => `${e.table}: ${e.error?.message}`).join(', ')}`
    )
  }

  const tables: Record<string, any[]> = {}
  results.forEach((r, i) => {
    tables[tableNames[i]] = (r.data || []) as any[]
  })

  const studentsData = tables['students'] || []
  const subjectsData = tables['subjects'] || []
  const assessmentsData = tables['assessments'] || []
  const transactionsData = tables['transactions'] || []

  return {
    version: '2.0',
    exported_at: new Date().toISOString(),
    exported_by: 'system',

    tables,

    metadata: {
      total_students: studentsData.length,
      total_subjects: subjectsData.length,
      total_assessments: assessmentsData.length,
      total_transactions: transactionsData.length,
      total_reward_rules: (tables['reward_rules'] || []).length,
      total_settings: (tables['site_settings'] || []).length,
      total_goal_templates: (tables['goal_templates'] || []).length,
      total_custom_reward_types: (tables['custom_reward_types'] || []).length,
      total_achievement_events: (tables['achievement_events'] || []).length,
      total_exchange_rules: (tables['exchange_rules'] || []).length,

      students_detail: studentsData.map((s: any) => ({
        id: s.id,
        name: s.name,
        subjects_count: subjectsData.filter((sub: any) => sub.student_id === s.id).length,
        assessments_count: assessmentsData.filter((a: any) =>
          subjectsData.some((sub: any) => sub.id === a.subject_id && sub.student_id === s.id)
        ).length,
        transactions_count: transactionsData.filter((t: any) => t.student_id === s.id).length,
      })),
    },
  }
}
