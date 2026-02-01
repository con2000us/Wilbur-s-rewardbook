import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RewardsPageClient from './RewardsPageClient'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar } from '@/lib/utils/studentTheme'
import StudentSidebarHeader from '../components/StudentSidebarHeader'

export default async function RewardsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = createClient()
  const t = await getTranslations('studentRewardManager')

  // 获取学生资料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (!student) {
    notFound()
  }

  // 获取所有学生（用于切换）
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name, avatar_url')
    .order('display_order', { ascending: true })

  // @ts-ignore - Supabase type inference issue with select queries
  const avatar = parseStudentAvatar((student as any).avatar_url, (student as any).name)

  return (
    <div className="min-h-screen p-4 md:p-10 flex justify-center items-start text-gray-800" style={{
      background: 'linear-gradient(135deg, #a7d9ef 0%, #f7b2c9 50%, #fcd6b6 100%)'
    }}>
      <div className="w-full max-w-7xl glass-panel rounded-3xl p-6 md:p-10 min-h-[90vh] relative overflow-hidden flex flex-col lg:flex-row">
        {/* 裝飾性背景圓圈 */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-f7b2c9/40 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-a7d9ef/30 rounded-full blur-[90px] translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        {/* 左側欄 - 學生資訊和快速導覽 */}
        <div className="relative z-20 lg:w-80 lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8 p-4 lg:p-0 rounded-2xl lg:rounded-none lg:min-w-0">
          <header className="flex flex-col lg:items-start lg:sticky lg:top-0 w-full lg:min-w-0">
            <StudentSidebarHeader
              studentId={id}
              studentName={(student as any).name}
              studentAvatar={avatar}
              recordsTitle={t('title')}
              allStudents={allStudents || []}
              basePath="/rewards"
              currentPage="rewards"
              showHeader={true}
            />
          </header>
        </div>

        {/* 右側主內容區 - 獎勵類型與兌換管理 */}
        <main className="relative z-10 flex-1">
          <RewardsPageClient 
            studentId={id}
            student={student as any}
            avatar={avatar}
            allStudents={allStudents || []}
          />
        </main>
      </div>
    </div>
  )
}
