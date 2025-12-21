'use client'

import { useTranslations } from 'next-intl'
import Modal from '@/app/components/Modal'
import TransactionForm from './TransactionForm'

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  description: string
  category: string
  transaction_date: string
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  transaction?: Transaction
  onSuccess?: () => void
}

export default function TransactionModal({
  isOpen,
  onClose,
  studentId,
  transaction,
  onSuccess
}: TransactionModalProps) {
  const t = useTranslations('transaction')

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
    // 延遲關閉以顯示成功訊息
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? `✏️ ${t('editRecord')}` : `➕ ${t('addRecord')}`}
      size="xl"
      widthPercent={70}
    >
      <TransactionForm
        studentId={studentId}
        transaction={transaction}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

