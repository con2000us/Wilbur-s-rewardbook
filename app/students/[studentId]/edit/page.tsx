import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditStudentForm from './EditStudentForm'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import HomeButton from '@/app/components/HomeButton'

export default async function EditStudentPage({ 
  params 
}: { 
  params: Promise<{ studentId: string }> 
}) {
  const { studentId } = await params
  const supabase = createClient()
  const tStudent = await getTranslations('student')

  // 獲取學生資料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()

  if (!student) {
    notFound()
  }

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
            studentId={studentId}
            studentName={(student as any).name}
            studentAvatar={avatar}
            recordsTitle={tStudent('editStudentData')}
            allStudents={allStudents || []}
            basePath=""
            currentPage="settings"
          />
          <HomeButton />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ✏️ {tStudent('editStudentData')}
          </h1>
          <p className="text-gray-600 mb-6">
            {/* @ts-ignore - Supabase type inference issue with select queries */}
            {tStudent.rich('editStudentDesc', {
              name: (chunks) => (
                <span className="font-semibold text-blue-600">{chunks}</span>
              ),
            })}
          </p>

          <EditStudentForm student={student} />
        </div>
      </div>
      </div>
    </div>
  )
}

