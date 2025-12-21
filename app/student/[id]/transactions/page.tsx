import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TransactionPageClient from './TransactionPageClient'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentHeaderWithDropdown from '@/app/components/StudentHeaderWithDropdown'
import HomeButton from '@/app/components/HomeButton'

export default async function TransactionsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = createClient()
  const t = await getTranslations('transaction')
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

  // 獲取交易記錄，按 transaction_date 排序
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('student_id', id)
    .order('transaction_date', { ascending: false })

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
            recordsTitle={t('passbook')}
            allStudents={allStudents || []}
            basePath="/transactions"
            currentPage="transactions"
          />
          <HomeButton />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                💰 {t('passbook')}
              </h1>
              <p className="text-gray-600">
                {t('description', { name: student.name })}
              </p>
            </div>
          </div>

          {/* 月份選擇器和記錄列表（包含 Modal） */}
          <TransactionPageClient 
            studentId={id} 
            transactions={transactions || []}
          />
        </div>
      </div>
      </div>
    </div>
  )
}

