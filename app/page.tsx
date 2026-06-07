import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import HomePageClient from './components/HomePageClient'

type SiteNameSetting = {
  value?: string | null
}

type StudentRow = {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
  display_order: number
}

type StudentSummaryRow = {
  student_id: string
  total_subjects: number | null
  total_assessments: number | null
  completed_assessments: number | null
  total_earned: number | string | null
  total_spent: number | string | null
  balance: number | string | null
}

type RewardTypeRow = {
  id: string
  type_key: string
  display_name: string
  icon: string
  default_unit: string | null
  display_order: number | null
}

type AssessmentAvgRow = {
  percentage: number | null
  subjects: { student_id: string } | { student_id: string }[] | null
}

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  themeColor: '#6a99e0',
  viewportFit: 'cover',
}

export default async function Home() {
  const supabase = createClient()
  const t = await getTranslations('home')

  const { data: students } = await supabase
    .from('students')
    .select('*')
    .order('display_order', { ascending: true })

  const { data: siteNameSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'site_name')
    .single()

  const { data: studentSummaries } = await supabase
    .from('student_summary')
    .select('student_id, total_subjects, total_assessments, completed_assessments, total_earned, total_spent, balance')

  const { data: rewardTypes } = await supabase
    .from('custom_reward_types')
    .select('id, type_key, display_name, icon, default_unit, display_order')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  const { data: completedAssessments } = await supabase
    .from('assessments')
    .select('percentage, subjects!inner(student_id)')
    .eq('status', 'completed')
    .not('percentage', 'is', null)

  const studentAverageScores: Record<string, number> = {}
  const averageBuckets = new Map<string, { sum: number; count: number }>()

  ;((completedAssessments || []) as AssessmentAvgRow[]).forEach((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects
    const studentId = subject?.student_id
    if (!studentId || row.percentage == null) {
      return
    }
    const bucket = averageBuckets.get(studentId) || { sum: 0, count: 0 }
    bucket.sum += Number(row.percentage)
    bucket.count += 1
    averageBuckets.set(studentId, bucket)
  })

  averageBuckets.forEach((bucket, studentId) => {
    studentAverageScores[studentId] = Math.round((bucket.sum / bucket.count) * 10) / 10
  })

  const siteName = ((siteNameSetting as SiteNameSetting | null)?.value) || t('title')

  return (
    <HomePageClient
      students={(students || []) as StudentRow[]}
      siteName={siteName}
      studentSummaries={(studentSummaries || []) as StudentSummaryRow[]}
      studentAverageScores={studentAverageScores}
      rewardTypes={(rewardTypes || []) as RewardTypeRow[]}
    />
  )
}
