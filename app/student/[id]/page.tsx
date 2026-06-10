import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StudentRecords from './StudentRecords'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import { fetchAssessmentTypes } from '@/lib/assessmentTypesServer'

export default async function StudentPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // Next.js 15+ 需要 await params
  const { id } = await params
  const supabase = createClient()
  const t = await getTranslations('student')
  const commonT = await getTranslations('common')

  // 獲取學生資料
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (!student || studentError) {
    notFound()
  }

  // 獲取科目
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', id)
    .order('order_index')

  // 獲取總餘額
  const { data: summary } = await supabase
    .from('student_summary')
    .select('*')
    .eq('student_id', id)
    .single()

  // 獲取評量列表
  // 使用基本查詢，grade_mapping 會在需要時從 subjects 中獲取
  const { data: assessments, error: assessmentError } = await supabase
    .from('assessments')
    .select(`
      *,
      subjects (
        name,
        color,
        icon
      )
    `)
    // @ts-ignore - Supabase type inference issue with select queries
    .in('subject_id', subjects?.map((s: any) => s.id) || [])
    .order('due_date', { ascending: false })
    .order('created_at', { ascending: false })
  
  if (assessmentError) {
    console.error('Error fetching assessments:', assessmentError)
  }

  const assessmentIds = (assessments || []).map((assessment: any) => assessment.id)
  const { data: mistakeRows } = assessmentIds.length > 0
    ? await supabase
        .from('assessment_mistakes')
        .select('*')
        .in('assessment_id', assessmentIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const mistakesByAssessment = new Map<string, any[]>()
  ;(mistakeRows || []).forEach((mistake: any) => {
    const current = mistakesByAssessment.get(mistake.assessment_id) || []
    current.push(mistake)
    mistakesByAssessment.set(mistake.assessment_id, current)
  })
  
  // 如果有評量資料，為每個評量添加對應科目的 grade_mapping
  if (assessments && subjects) {
    // @ts-ignore - Type inference issue with Supabase queries
    assessments.forEach((assessment: any) => {
      if (assessment.subjects && assessment.subject_id) {
        const subject = subjects.find((s: any) => s.id === assessment.subject_id)
        // @ts-ignore - Type inference issue with Supabase queries
        if (subject && subject.grade_mapping) {
          // @ts-ignore - Type assertion for grade_mapping
          assessment.subjects.grade_mapping = subject.grade_mapping
        }
      }
      assessment.mistakes = mistakesByAssessment.get(assessment.id) || []
    })
  }

  // 獲取交易記錄（用於計算累積獎金）
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('student_id', id)
    .order('transaction_date', { ascending: false })

  // 獲取獎金規則（用於 Modal）
  const { data: rewardRules } = await supabase
    .from('reward_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })

  const assessmentTypes = await fetchAssessmentTypes(supabase, { includeInactive: true })

  // 獲取所有學生（用於切換器）
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name, avatar_url')
    .order('display_order', { ascending: true })

  // @ts-ignore - Supabase type inference issue with select queries
  const avatar = parseStudentAvatar((student as any).avatar_url, (student as any).name)
  // @ts-ignore - Supabase type inference issue with select queries
  const backgroundGradient = getStudentBackgroundGradient((student as any).avatar_url, (student as any).name)

  return (
    <div className="app-shell-student min-h-screen p-4 md:p-10 flex justify-center items-start text-gray-800" style={{
      background: 'linear-gradient(135deg, #a7d9ef 0%, #c1d9f0 50%, #e0e7f2 100%)'
    }}>
      <div className="w-full max-w-7xl py-4 px-[5px] md:p-5 lg:p-10 min-h-[90vh] relative overflow-hidden flex flex-col lg:w-full lg:flex-row lg:mt-5 lg:glass-panel lg:rounded-3xl">
        {/* 裝飾性背景圓圈 */}
        <div className="absolute top-0 left-0 hidden h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-f7b2c9/30 blur-[80px] pointer-events-none lg:block"></div>
        <div className="absolute bottom-0 right-0 hidden h-[500px] w-[500px] translate-x-1/3 -translate-y-1/3 rounded-full bg-a7d9ef/20 blur-[90px] pointer-events-none lg:block"></div>

        {/* StudentRecords 組件會渲染完整的布局（側邊欄 + 主內容區） */}
        <StudentRecords
          studentId={id}
          // @ts-ignore - Supabase type inference issue with select queries
          studentName={(student as any).name}
          studentAvatar={avatar}
          allStudents={allStudents || []}
          subjects={subjects || []}
          assessments={assessments || []}
          transactions={transactions || []}
          summary={summary}
          rewardRules={rewardRules || []}
          assessmentTypes={assessmentTypes}
        />
      </div>
    </div>
  )
}
