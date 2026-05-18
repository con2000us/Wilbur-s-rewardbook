import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type GoalTemplate = {
  id: string
  [key: string]: unknown
}

type GoalTemplateEventLink = {
  template_id: string
  event_id: string
}

type AchievementEvent = {
  id: string
  name: string | null
  icon: string | null
}

type AssignedGoalRow = {
  id: string
  template_id: string
  student_id: string
  status: string | null
  is_active: boolean | null
  tracking_started_at: string | null
  completed_at: string | null
  students?: {
    id: string
    name: string | null
    avatar_url: string | null
  } | Array<{
    id: string
    name: string | null
    avatar_url: string | null
  }> | null
}

type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isMissingTemplateIdColumn(error: SupabaseErrorLike | null | undefined) {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    text.includes('student_goals.template_id') ||
    text.includes("'template_id' column") ||
    text.includes('template_id')
  )
}

export async function GET() {
  const supabase = createClient()

  try {
    // 取得所有模板
    const { data: templates, error } = await supabase
      .from('goal_templates')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ success: true, templates: [] })
    }

    // 取得所有關聯的成就事件
    const templateIds = templates.map((t: GoalTemplate) => t.id)
    const { data: links } = await supabase
      .from('goal_template_event_links')
      .select('template_id, event_id')
      .in('template_id', templateIds)

    const typedLinks = (links || []) as GoalTemplateEventLink[]
    const eventIds = [...new Set(typedLinks.map((l) => l.event_id))]
    const { data: events } = eventIds.length > 0
      ? await supabase
          .from('achievement_events')
          .select('id, name, icon')
          .in('id', eventIds)
      : { data: [] }

    // 建立 event lookup
    const eventMap = new Map((events || [] as AchievementEvent[]).map((e) => [e.id, e]))

    // 建立 template → events 對應
    const linksMap = new Map<string, AchievementEvent[]>()
    for (const link of typedLinks) {
      const arr = linksMap.get(link.template_id) || []
      const evt = eventMap.get(link.event_id)
      if (evt) arr.push(evt)
      linksMap.set(link.template_id, arr)
    }

    const { data: assignedGoalRows, error: assignedGoalsError } = await supabase
      .from('student_goals')
      .select('id, template_id, student_id, status, is_active, tracking_started_at, completed_at, students(id, name, avatar_url)')
      .in('template_id', templateIds)

    if (assignedGoalsError && !isMissingTemplateIdColumn(assignedGoalsError)) {
      console.warn('Failed to fetch assigned student goals:', assignedGoalsError)
    }

    const assignedGoalsMap = new Map<string, Array<Record<string, unknown>>>()
    for (const row of (assignedGoalsError ? [] : assignedGoalRows || []) as AssignedGoalRow[]) {
      const student = Array.isArray(row.students) ? row.students[0] : row.students
      const arr = assignedGoalsMap.get(row.template_id) || []
      arr.push({
        id: row.id,
        student_id: row.student_id,
        student_name: student?.name || '',
        student_avatar_url: student?.avatar_url || null,
        status: row.status,
        is_active: row.is_active,
        tracking_started_at: row.tracking_started_at,
        completed_at: row.completed_at,
      })
      assignedGoalsMap.set(row.template_id, arr)
    }

    // 組合結果
    const result = (templates as GoalTemplate[]).map((t) => ({
      ...t,
      events: linksMap.get(t.id) || [],
      assigned_goals: assignedGoalsMap.get(t.id) || [],
    }))

    return NextResponse.json({ success: true, templates: result })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch goal templates: ' + (err as Error).message
    }, { status: 500 })
  }
}
