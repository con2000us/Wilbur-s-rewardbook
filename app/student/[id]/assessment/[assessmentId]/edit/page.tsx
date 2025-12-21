import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AssessmentForm from '../../../components/AssessmentForm'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import HomeButton from '@/app/components/HomeButton'

export default async function EditAssessmentPage({ 
  params 
}: { 
  params: Promise<{ id: string; assessmentId: string }> 
}) {
  const { id, assessmentId } = await params
  const supabase = createClient()
  const t = await getTranslations('assessment')
  const tStudent = await getTranslations('student')

  // 獲取學生資料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (!student) {
    notFound()
  }

  // 獲取評量資料
  const { data: assessment } = await supabase
    .from('assessments')
    .select(`
      *,
      subjects (
        id,
        name,
        color,
        icon,
        student_id
      )
    `)
    .eq('id', assessmentId)
    .single()

  if (!assessment || assessment.subjects?.student_id !== id) {
    notFound()
  }

  // 獲取該學生的所有科目
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', id)
    .order('order_index')

  // 獲取所有激活的獎金規則（含全局、學生、科目規則）
  const { data: rewardRules } = await supabase
    .from('reward_rules')
    .select('*')
    .or(`student_id.eq.${id},student_id.is.null`)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  // 獲取所有學生（用於切換器）
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name, avatar_url')
    .order('display_order', { ascending: true })

  const avatar = parseStudentAvatar(student.avatar_url, student.name)
  const backgroundGradient = getStudentBackgroundGradient(student.avatar_url, student.name)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景漸層 - 多層效果 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${backgroundGradient}`}></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-purple-200/30"></div>
      
      {/* 內容區域 */}
      <div className="relative z-10 p-8">
        <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex justify-between items-start gap-4">
          <StudentHeaderWithDropdown
            studentId={id}
            studentName={student.name}
            studentAvatar={avatar}
            recordsTitle={t('editAssessment')}
            allStudents={allStudents || []}
            basePath={`/assessment/${assessmentId}/edit`}
            currentPage="records"
          />
          <HomeButton />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ✏️ {t('editAssessment')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('editOrDelete', { title: assessment.title }) || `修改或刪除 ${assessment.title} 的記錄`}
          </p>

          <AssessmentForm 
            studentId={id}
            assessment={assessment}
            subjects={subjects || []}
            rewardRules={rewardRules || []}
          />
        </div>
      </div>
      </div>
    </div>
  )
}

