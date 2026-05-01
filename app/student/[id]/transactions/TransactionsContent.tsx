'use client'

import { useState, createContext, useContext } from 'react'
import TransactionPageClient from './TransactionPageClient'
import PassbookSidebarContent from './components/PassbookSidebarContent'

interface Props {
  studentId: string
  transactions: any[]
  studentName: string
  summary: any
  rewardTypes?: any[]
  renderSidebar?: boolean
}

// 創建 Context 來共享選中的獎勵種類狀態和月份選擇
const RewardTypeContext = createContext<{
  selectedRewardType: string | null
  setSelectedRewardType: (type: string | null) => void
  selectedMonth: string
  setSelectedMonth: (month: string) => void
} | null>(null)

export function useRewardType() {
  const context = useContext(RewardTypeContext)
  if (!context) {
    throw new Error('useRewardType must be used within TransactionsContentProvider')
  }
  return context
}

// Provider 組件
export function TransactionsContentProvider({ children, studentId, transactions, studentName, summary }: { children: React.ReactNode, studentId: string, transactions: any[], studentName: string, summary: any }) {
  const [selectedRewardType, setSelectedRewardType] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  return (
    <RewardTypeContext.Provider value={{ selectedRewardType, setSelectedRewardType, selectedMonth, setSelectedMonth }}>
      {children}
    </RewardTypeContext.Provider>
  )
}

// 獎勵類別組件
export function CategoryTagsSidebar({ transactions, summary, subjects, assessments }: { transactions: any[], summary: any, subjects?: any[], assessments?: any[] }) {
  const { selectedRewardType, setSelectedRewardType, selectedMonth } = useRewardType()

  return (
    <div className="mt-3 w-full">
      <PassbookSidebarContent
        transactions={transactions || []}
        summary={summary}
        selectedRewardType={selectedRewardType}
        onRewardTypeSelect={setSelectedRewardType}
        subjects={subjects || []}
        assessments={assessments || []}
        selectedMonth={selectedMonth}
      />
    </div>
  )
}

// 主內容區組件
export function MainContent({ studentId, transactions, studentName, subjects = [], assessments, rewardTypes = [] }: { studentId: string, transactions: any[], studentName: string, subjects?: any[], assessments?: any[], rewardTypes?: any[] }) {
  const { selectedRewardType, setSelectedRewardType } = useRewardType()

  return (
    <main className="relative z-10 flex-1">
      <TransactionPageClient 
        studentId={studentId} 
        transactions={transactions || []}
        studentName={studentName}
        selectedRewardType={selectedRewardType}
        onRewardTypeSelect={setSelectedRewardType}
        subjects={subjects || []}
        assessments={assessments || []}
        rewardTypes={rewardTypes}
      />
    </main>
  )
}

export default function TransactionsContent({ studentId, transactions, studentName, summary, rewardTypes = [], renderSidebar = false }: Props) {
  if (renderSidebar) {
    // 只渲染獎勵類別（在左側欄內）
    return <CategoryTagsSidebar transactions={transactions} summary={summary} />
  }

  // 渲染右側主內容區
  return <MainContent studentId={studentId} transactions={transactions} studentName={studentName} rewardTypes={rewardTypes} />
}
