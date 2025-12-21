import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditSubjectForm from './EditSubjectForm'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentSwitcher from '@/app/components/StudentSwitcher'

export default async function EditSubjectPage({ 
  params 
}: { 
  params: Promise<{ id: string; subjectId: string }> 
}) {
  const { id, subjectId } = await params
  const supabase = createClient()
  const t = await getTranslations('subject')

  // 獲取學生資料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (!student) {
    notFound()
  }

  // 獲取科目資料
  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .eq('student_id', id)
    .single()

  if (!subject) {
    notFound()
  }

  // 獲取所有科目（用於排序預覽）
  const { data: allSubjects } = await supabase
    .from('subjects')
    .select('id, name, icon, order_index')
    .eq('student_id', id)
    .order('order_index')

  // 獲取所有學生（用於切換器）
  const { data: allStudentsData } = await supabase
    .from('students')
    .select('id, name, avatar_url')
    .order('display_order', { ascending: true })

  const avatarData = parseStudentAvatar(student.avatar_url, student.name)
  const avatar = {
    emoji: avatarData.emoji,
    gradient: getStudentBackgroundGradient(student.avatar_url, student.name)
  }
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
        <div className="mb-6 flex items-center gap-4">
          <Link 
            href={`/student/${id}/subjects`}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold inline-flex items-center gap-2"
          >
            <span>←</span>
            <span>{t('returnToManage')}</span>
          </Link>
          
          <StudentSwitcher
            currentStudentId={id}
            currentStudentName={student.name}
            currentStudentAvatar={avatar}
            allStudents={allStudentsData || []}
            basePath={`/subjects/${subjectId}/edit`}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ✏️ {t('editSubject')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('editOrDeleteSubject', { name: subject.name })}
          </p>

          <EditSubjectForm 
            studentId={id} 
            subject={subject} 
            allSubjects={allSubjects || []}
          />
        </div>
      </div>
      </div>
    </div>
  )
}

