import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubjectsPageClient from './SubjectsPageClient'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import HomeButton from '@/app/components/HomeButton'

export default async function SubjectsManagementPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = createClient()
  const t = await getTranslations('subject')
  const tStudent = await getTranslations('student')
  const tCommon = await getTranslations('common')

  // 獲取學生資料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (!student) {
    notFound()
  }

  // 獲取科目列表
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', id)
    .order('order_index')
  
  // 獲取所有獎金規則（用於 Modal）
  const { data: allRewardRules } = await supabase
    .from('reward_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
  
  // 獲取全局規則（用於通用獎金規則管理）
  const { data: globalRules } = await supabase
    .from('reward_rules')
    .select('*')
    .is('student_id', null)
    .is('subject_id', null)
    .order('priority', { ascending: false })
  
  // 獲取該學生的通用規則（不限科目）
  const { data: studentRules } = await supabase
    .from('reward_rules')
    .select('*')
    .eq('student_id', id)
    .is('subject_id', null)
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
        <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
          <StudentHeaderWithDropdown
            studentId={id}
            studentName={student.name}
            studentAvatar={avatar}
            recordsTitle={t('manageSubjects')}
            allStudents={allStudents || []}
            basePath="/subjects"
            currentPage="subjects"
          />
          <HomeButton />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              📚 {t('manageSubjects')}
            </h1>
            <p className="text-gray-600">
              {t('manageAllSubjects', { name: student.name }) || `管理 ${student.name} 的所有科目`}
            </p>
          </div>

          {/* 科目列表和 Modal */}
          <SubjectsPageClient 
            studentId={id} 
            studentName={student.name}
            subjects={subjects || []}
            allRewardRules={allRewardRules || []}
            globalRules={globalRules || []}
            studentRules={studentRules || []}
          />
        </div>
      </div>
      </div>
    </div>
  )
}

