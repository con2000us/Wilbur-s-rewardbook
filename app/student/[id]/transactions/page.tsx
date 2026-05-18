import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar } from '@/lib/utils/studentTheme'
import StudentSidebarHeader from '../components/StudentSidebarHeader'
import TransactionsContent, { TransactionsContentProvider, CategoryTagsSidebar, MainContent } from './TransactionsContent'

export default async function TransactionsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = createClient()
  const t = await getTranslations('transaction')

  // 獲取學生資料
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (!student) {
    notFound()
  }

  // 獲取該學生所有獎勵／存摺交易（含各自訂獎勵類型、評量獎金、手動紀錄等）
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('student_id', id)
    .order('transaction_date', { ascending: false })

  const transactions = allTransactions ?? []

  // 獎勵類型（用於存摺顯示對應單位）
  // 使用 select('*') 取得所有欄位
  const { data: rewardTypesRaw, error: rewardTypesError } = await supabase
    .from('custom_reward_types')
    .select('*')

  if (rewardTypesError) {
    console.error('Failed to load custom_reward_types:', rewardTypesError)
  }

  const rewardTypes = rewardTypesRaw || []

  // 獲取科目資料（用於分類）
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', id)
    .order('order_index')

  // 獲取評量資料（關聯存摺評量獎金 → 顯示科目、類型、標題）
  const subjectIds = subjects?.map((s: any) => s.id).filter(Boolean) || []
  const { data: assessments } = subjectIds.length > 0
    ? await supabase
        .from('assessments')
        .select('id, subject_id, title, assessment_type, due_date')
        .in('subject_id', subjectIds)
    : { data: [] as any[] }

  // 獲取所有學生（用於切換器）
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name, avatar_url')
    .order('display_order', { ascending: true })

  // @ts-ignore - Supabase type inference issue with select queries
  const avatar = parseStudentAvatar((student as any).avatar_url, (student as any).name)

  // 計算收支概況（列表內所有交易；跨類型加總僅供參考）
  // @ts-ignore - Supabase type inference issue with transactions
  const totalEarned = transactions?.filter((t: any) => t.amount > 0).reduce((sum: number, t: any) => sum + t.amount, 0) || 0
  // @ts-ignore - Supabase type inference issue with transactions
  const totalSpent = transactions?.filter((t: any) => t.amount < 0).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) || 0
  const balance = totalEarned - totalSpent
  const summary = {
    total_earned: totalEarned,
    total_spent: totalSpent,
    balance: balance
  }

  return (
    <div className="min-h-screen p-4 md:p-10 flex justify-center items-start text-gray-800" style={{
      background: 'linear-gradient(135deg, #a7d9ef 0%, #f7b2c9 50%, #fcd6b6 100%)'
    }}>
      <div className="w-full max-w-7xl glass-panel rounded-3xl p-6 md:p-10 min-h-[90vh] relative overflow-hidden flex flex-col lg:flex-row">
        {/* 裝飾性背景圓圈 */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-f7b2c9/40 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-a7d9ef/30 rounded-full blur-[90px] translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <TransactionsContentProvider
          studentId={id}
          transactions={transactions || []}
          studentName={(student as any).name}
          summary={summary}
        >
          {/* 左側欄 - 學生資訊和快速導覽 */}
          <div className="relative z-20 lg:w-80 lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8 p-4 lg:p-0 rounded-2xl lg:rounded-none lg:min-w-0">
            <header className="flex flex-col lg:items-start lg:sticky lg:top-0 w-full lg:min-w-0">
              <StudentSidebarHeader
                studentId={id}
                studentName={(student as any).name}
                studentAvatar={avatar}
                recordsTitle={t('passbook')}
                allStudents={allStudents || []}
                basePath="/transactions"
                currentPage="transactions"
                showHeader={true}
              />
              
              {/* 獎勵來源分類 */}
              <CategoryTagsSidebar
                transactions={transactions || []}
                summary={summary}
                subjects={subjects || []}
                assessments={assessments || []}
              />
            </header>
          </div>

          {/* 右側主內容區 */}
          <MainContent
            studentId={id}
            transactions={transactions || []}
            studentName={(student as any).name}
            subjects={subjects || []}
            assessments={assessments || []}
            rewardTypes={rewardTypes || []}
          />
        </TransactionsContentProvider>
      </div>
    </div>
  )
}

