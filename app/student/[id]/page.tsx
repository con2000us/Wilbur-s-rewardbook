import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StudentRecords from './StudentRecords'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import HomeButton from '@/app/components/HomeButton'

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
  const { data: assessments } = await supabase
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
            studentId={id}
            // @ts-ignore - Supabase type inference issue with select queries
            studentName={(student as any).name}
            studentAvatar={avatar}
            recordsTitle={t('recordsTitle')}
            allStudents={allStudents || []}
            basePath=""
            currentPage="records"
          />
          <HomeButton />
        </div>
        
        <div className="bg-amber-50 rounded-2xl shadow-2xl p-8">
          {/* 月份選擇器、科目標籤和評量列表 */}
          <StudentRecords 
            studentId={id}
            // @ts-ignore - Supabase type inference issue with select queries
            studentName={(student as any).name}
            subjects={subjects || []} 
            assessments={assessments || []} 
            transactions={transactions || []}
            summary={summary}
            rewardRules={rewardRules || []}
          />
        </div>
      </div>
      </div>
    </div>
  )
}

