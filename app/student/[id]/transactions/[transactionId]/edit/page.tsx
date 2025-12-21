import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditTransactionForm from './EditTransactionForm'
import { getTranslations } from 'next-intl/server'
import { parseStudentAvatar, getStudentBackgroundGradient } from '@/lib/utils/studentTheme'
import StudentSwitcher from '@/app/components/StudentSwitcher'

export default async function EditTransactionPage({ 
  params 
}: { 
  params: Promise<{ id: string; transactionId: string }> 
}) {
  const { id, transactionId } = await params
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

  // 獲取交易記錄
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('student_id', id)
    .single()

  if (!transaction) {
    notFound()
  }

  // 獲取所有學生（用於切換器）
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name, avatar_url')
    .order('display_order', { ascending: true })

  // @ts-ignore - Supabase type inference issue with select queries
  const avatarData = parseStudentAvatar((student as any).avatar_url, (student as any).name)
  const avatar = {
    emoji: avatarData.emoji,
    // @ts-ignore - Supabase type inference issue with select queries
    gradient: getStudentBackgroundGradient((student as any).avatar_url, (student as any).name)
  }
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
        <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link 
            href={`/student/${id}/transactions`}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold inline-flex items-center gap-2"
          >
            <span>←</span>
            <span>{t('passbook')}</span>
          </Link>
          
          <StudentSwitcher
            currentStudentId={id}
            currentStudentName={(student as any).name}
            currentStudentAvatar={avatar}
            allStudents={allStudents || []}
            basePath={`/transactions/${transactionId}/edit`}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ✏️ {t('editRecord')}
          </h1>
          <p className="text-gray-600 mb-6">
            {/* @ts-ignore - Supabase type inference issue with select queries */}
            {t('editOrDeleteRecord', { description: (transaction as any).description }) || `修改或刪除 ${(transaction as any).description} 的記錄`}
          </p>

          <EditTransactionForm 
            studentId={id} 
            transaction={transaction}
          />
        </div>
      </div>
      </div>
    </div>
  )
}

