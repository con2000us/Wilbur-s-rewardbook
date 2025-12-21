import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AssessmentForm from '../components/AssessmentForm'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import HomeButton from '@/app/components/HomeButton'

export default async function AddAssessmentPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = createClient()
  const t = await getTranslations('assessment')
  const tStudent = await getTranslations('student')
  const tSubject = await getTranslations('subject')

  // 獲取學生資料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (!student) {
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

  // 查詢該學生最常用的評量類型
  const { data: assessmentTypes } = await supabase
    .from('assessments')
    .select('assessment_type')
    .in('subject_id', subjects?.map(s => s.id) || [])
    .not('assessment_type', 'is', null)

  // 統計最常用的類型
  const typeCounts: Record<string, number> = {}
  assessmentTypes?.forEach(a => {
    if (a.assessment_type) {
      typeCounts[a.assessment_type] = (typeCounts[a.assessment_type] || 0) + 1
    }
  })
  const mostCommonType = Object.keys(typeCounts).length > 0
    ? Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'exam' // 預設為 exam

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
            recordsTitle={t('addAssessment')}
            allStudents={allStudents || []}
            basePath="/add-assessment"
            currentPage="records"
          />
          <HomeButton />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ➕ {t('addAssessment')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('addAssessmentFor', { name: student.name }) || `為 ${student.name} 添加考試或作業記錄`}
          </p>

          {subjects && subjects.length > 0 ? (
            <AssessmentForm 
              studentId={id} 
              subjects={subjects} 
              rewardRules={rewardRules || []}
              defaultAssessmentType={mostCommonType}
            />
          ) : (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-semibold mb-2">
                ⚠️ {t('noSubjectsYet')}
              </p>
              <p className="text-yellow-700 text-sm mb-4">
                {t('addSubjectsFirst')}
              </p>
              <div className="text-sm text-yellow-700">
                <p className="font-semibold mb-2">{t('howToAddSubjects')}</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>{t('goToSupabase')}</li>
                  <li>{t('openTableEditor')}</li>
                  <li>{t('clickInsert')}</li>
                  <li>{t('fillFields')}</li>
                </ol>
              </div>
              <div className="mt-4">
                <Link
                  href={`/student/${id}`}
                  className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  {tStudent('returnToStudent', { name: student.name })}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
