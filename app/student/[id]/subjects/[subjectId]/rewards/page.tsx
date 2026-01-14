import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubjectRewardRulesManager from './SubjectRewardRulesManager'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function SubjectRewardsPage({ 
  params 
}: { 
  params: Promise<{ id: string; subjectId: string }> 
}) {
  const { id, subjectId } = await params
  const supabase = createClient()
  const t = await getTranslations('rewardRules')
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

  // 獲取該科目的專屬規則（科目+學生、僅科目）
  const { data: subjectRules } = await supabase
    .from('reward_rules')
    .select('*')
    .eq('subject_id', subjectId)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  // 獲取該學生的通用規則（不限科目）
  const { data: studentRules } = await supabase
    .from('reward_rules')
    .select('*')
    .eq('student_id', id)
    .is('subject_id', null)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  // 獲取全局規則（不限學生和科目）
  const { data: globalRules } = await supabase
    .from('reward_rules')
    .select('*')
    .is('student_id', null)
    .is('subject_id', null)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href={`/student/${id}/subjects`}
            className="text-white hover:text-gray-200 text-lg"
          >
            ← {t('backToSubjects')}
          </Link>
          <Link 
            href={`/student/${id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold"
          >
            {/* @ts-ignore - Supabase type inference issue with select queries */}
            {tStudent('returnToStudent', { name: (student as any).name })}
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              {/* @ts-ignore - Supabase type inference issue with select queries */}
              {(() => {
                const icon = (subject as any).icon
                const isEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon) || 
                               icon.length <= 2 || 
                               !/^[a-z_]+$/i.test(icon)
                return (
                  <>
                    {isEmoji ? (
                      <span>{icon}</span>
                    ) : (
                      <span className="material-icons-outlined">{icon}</span>
                    )}
                    <span>{(subject as any).name} - {t('manageRules')}</span>
                  </>
                )
              })()}
            </h1>
            <p className="text-gray-600">
              {/* @ts-ignore - Supabase type inference issue with select queries */}
              {t('setRulesFor', { studentName: (student as any).name, subjectName: (subject as any).name }) || `為 ${(student as any).name} 的 ${(subject as any).name} 設置獎金規則`}
            </p>
          </div>

          <SubjectRewardRulesManager 
            studentId={id}
            studentName={(student as any).name}
            subjectId={subjectId}
            subjectName={(subject as any).name}
            subjectIcon={(subject as any).icon}
            subjectRules={subjectRules || []}
            studentRules={studentRules || []}
            globalRules={globalRules || []}
          />
        </div>
      </div>
    </div>
  )
}

