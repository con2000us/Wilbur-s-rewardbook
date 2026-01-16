import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentSidebarHeader from '@/app/student/[id]/components/StudentSidebarHeader'
import SubjectsHeaderClient from './SubjectsHeaderClient'

export default async function SubjectsManagementPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = createClient()
  const t = await getTranslations('subject')
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

  // @ts-ignore - Supabase type inference issue with select queries
  const avatar = parseStudentAvatar((student as any).avatar_url, (student as any).name)
  // @ts-ignore - Supabase type inference issue with select queries
  const backgroundGradient = getStudentBackgroundGradient((student as any).avatar_url, (student as any).name)

  return (
    <div className="min-h-screen p-4 md:p-10 flex justify-center items-start text-gray-800" style={{
      background: 'linear-gradient(135deg, #a7d9ef 0%, #c1d9f0 50%, #e0e7f2 100%)'
    }}>
      <div className="w-full max-w-7xl glass-panel rounded-3xl p-6 md:p-10 min-h-[90vh] relative overflow-hidden flex flex-col lg:flex-row">
        {/* 裝飾性背景圓圈 */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-f7b2c9/30 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-a7d9ef/20 rounded-full blur-[90px] translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

        {/* 側邊欄 */}
        <div className="relative z-20 lg:w-80 lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8 p-4 lg:p-0 rounded-2xl lg:rounded-none lg:min-w-0">
          <header className="flex flex-col lg:items-start lg:sticky lg:top-0 w-full lg:min-w-0">
            {/* Student Sidebar Header - 包含學生頭像和快速導覽 */}
            <StudentSidebarHeader
              studentId={id}
              studentName={(student as any).name}
              studentAvatar={avatar}
              recordsTitle={t('manageSubjects')}
              allStudents={allStudents || []}
              basePath="/subjects"
              currentPage="subjects"
              showHeader={true}
            />
          </header>
        </div>

        {/* 主內容區 */}
        <main className="relative z-10 flex-1">
          {/* 標題區域、按鈕和科目列表 */}
          <SubjectsHeaderClient
            studentId={id}
            studentName={(student as any).name}
            globalRules={globalRules || []}
            studentRules={studentRules || []}
            subjects={subjects || []}
            allRewardRules={allRewardRules || []}
          />
        </main>
      </div>
    </div>
  )
}

