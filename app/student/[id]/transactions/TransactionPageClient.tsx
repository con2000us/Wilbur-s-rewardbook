'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import TransactionRecords from './TransactionRecords'
import TransactionModal from './components/TransactionModal'

interface Props {
  studentId: string
  transactions: any[]
}

export default function TransactionPageClient({ studentId, transactions }: Props) {
  const router = useRouter()
  const t = useTranslations('transaction')
  
  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)

  // Modal 控制函數
  const handleOpenAddModal = () => {
    setEditingTransaction(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (transaction: any) => {
    setEditingTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTransaction(null)
  }

  const handleModalSuccess = () => {
    router.refresh()
  }

  return (
    <>
      {/* 月份選擇器和記錄列表 */}
      <TransactionRecords 
        studentId={studentId} 
        transactions={transactions} 
        onEditTransaction={handleOpenEditModal}
        onAddTransaction={handleOpenAddModal}
      />

      {/* 交易表單 Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        studentId={studentId}
        transaction={editingTransaction}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}

