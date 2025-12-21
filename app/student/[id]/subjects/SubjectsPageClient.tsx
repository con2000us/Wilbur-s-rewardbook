'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import SubjectModal from './components/SubjectModal'
import SubjectRewardRulesModal from './components/SubjectRewardRulesModal'
import GlobalRewardRulesModal from './components/GlobalRewardRulesModal'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  order_index: number
}

interface RewardRule {
  id: string
  student_id: string | null
  subject_id: string | null
  rule_name: string
  condition: string
  min_score: number | null
  max_score: number | null
  reward_amount: number
  priority: number
  is_active: boolean
  assessment_type: string | null
}

interface Props {
  studentId: string
  studentName: string
  subjects: Subject[]
  allRewardRules: RewardRule[]
  globalRules: RewardRule[]
  studentRules: RewardRule[]
}

export default function SubjectsPageClient({ studentId, studentName, subjects, allRewardRules, globalRules, studentRules }: Props) {
  const router = useRouter()
  const t = useTranslations('subject')
  const tCommon = useTranslations('common')
  const tRewardRules = useTranslations('rewardRules')
  
  // 科目 Modal 狀態
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  
  // 獎金規則 Modal 狀態
  const [isRewardRulesModalOpen, setIsRewardRulesModalOpen] = useState(false)
  const [selectedSubjectForRules, setSelectedSubjectForRules] = useState<Subject | null>(null)
  
  // 通用獎金規則 Modal 狀態
  const [isGlobalRewardRulesModalOpen, setIsGlobalRewardRulesModalOpen] = useState(false)
  
  // 排序相關狀態
  const [isReordering, setIsReordering] = useState(false)
  const [draggedSubject, setDraggedSubject] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null) // 顯示指示器的位置
  const [loading, setLoading] = useState(false)
  const justSavedRef = useRef(false) // 使用 ref 標記是否剛剛保存完成，避免重複渲染
  
  // 排序後的科目列表
  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => a.order_index - b.order_index)
  }, [subjects])
  
  const [sortedSubjectsState, setSortedSubjectsState] = useState(sortedSubjects)
  
  // 當 props 變化時更新排序後的科目列表
  useEffect(() => {
    // 如果剛剛保存完成，不覆蓋當前狀態
    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }
    if (!isReordering) {
      setSortedSubjectsState(sortedSubjects)
    }
  }, [sortedSubjects, isReordering])

  // 科目 Modal 控制函數
  const handleOpenAddModal = () => {
    setEditingSubject(null)
    setIsSubjectModalOpen(true)
  }

  const handleOpenEditModal = (subject: Subject) => {
    setEditingSubject(subject)
    setIsSubjectModalOpen(true)
  }

  const handleCloseSubjectModal = () => {
    setIsSubjectModalOpen(false)
    setEditingSubject(null)
  }

  const handleSubjectModalSuccess = () => {
    router.refresh()
  }

  // 獎金規則 Modal 控制函數
  const handleOpenRewardRulesModal = (subject: Subject) => {
    setSelectedSubjectForRules(subject)
    setIsRewardRulesModalOpen(true)
  }

  const handleCloseRewardRulesModal = () => {
    setIsRewardRulesModalOpen(false)
    setSelectedSubjectForRules(null)
  }

  const handleRewardRulesModalSuccess = () => {
    router.refresh()
  }

  // 拖拽排序處理
  const handleDragStart = (subjectId: string, index: number) => {
    setIsReordering(true)
    setDraggedSubject(subjectId)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === targetIndex) {
      return
    }

    // 設置顯示指示器的位置
    setDropTargetIndex(targetIndex)

    const newSubjects = [...sortedSubjectsState]
    const draggedSubjectItem = newSubjects[draggedIndex]
    
    // 移除被拖曳的項目
    newSubjects.splice(draggedIndex, 1)
    // 插入到新位置
    newSubjects.splice(targetIndex, 0, draggedSubjectItem)
    
    setSortedSubjectsState(newSubjects)
    setDraggedIndex(targetIndex)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    // drop 事件已经在 handleDragOver 中处理了顺序更新
  }

  const handleSaveOrder = async () => {
    const updates = sortedSubjectsState.map((subject, index) => ({
      id: subject.id,
      order_index: index
    }))

    setLoading(true)
    try {
      const response = await fetch('/api/subjects/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectOrders: updates }),
      })

      if (response.ok) {
        // 標記剛剛保存完成，防止 useEffect 覆蓋當前順序
        justSavedRef.current = true
        // 清理狀態
        setIsReordering(false)
        setDraggedSubject(null)
        setDraggedIndex(null)
        setDropTargetIndex(null)
        // 不刷新頁面，直接使用當前排序狀態
        // router.refresh() - 移除，避免閃動
      } else {
        alert('排序失敗，請稍後再試')
        // 恢復原順序
        setSortedSubjectsState(sortedSubjects)
        setIsReordering(false)
        setDraggedSubject(null)
        setDraggedIndex(null)
        setDropTargetIndex(null)
      }
    } catch (err) {
      alert('發生錯誤：' + (err as Error).message)
      // 恢復原順序
      setSortedSubjectsState(sortedSubjects)
      setIsReordering(false)
      setDraggedSubject(null)
      setDraggedIndex(null)
      setDropTargetIndex(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelReorder = () => {
    setIsReordering(false)
    setDraggedSubject(null)
    setDraggedIndex(null)
    setDropTargetIndex(null)
    // 恢復原順序
    setSortedSubjectsState(sortedSubjects)
  }

  // 當拖拽結束時
  const handleDragEnd = () => {
    // 清理拖拽視覺效果，但保持排序模式
    setDropTargetIndex(null)
    setDraggedIndex(null)
  }

  // 轉換為 ExistingSubject 格式
  const existingSubjects = subjects.map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    order_index: s.order_index
  }))

  return (
    <>
      {/* 添加按鈕 */}
      <div className="flex justify-end gap-3 mb-6">
        {/* 完成排序按鈕 - 只在排序模式時顯示 */}
        {isReordering && (
          <>
            <button
              onClick={handleSaveOrder}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <span>✓</span>
              <span>{tCommon('done') || '完成排序'}</span>
            </button>
            <button
              onClick={handleCancelReorder}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <span>✕</span>
              <span>{tCommon('cancel')}</span>
            </button>
          </>
        )}
        <button
          onClick={() => setIsGlobalRewardRulesModalOpen(true)}
          className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>💎</span>
          <span>{tRewardRules('manageGlobalRules') || '通用獎金規則'}</span>
        </button>
        <button
          onClick={handleOpenAddModal}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>➕</span>
          <span>{t('addSubject')}</span>
        </button>
      </div>

      {/* 科目列表 */}
      {sortedSubjectsState && sortedSubjectsState.length > 0 ? (
        <div className="space-y-4">
          {sortedSubjectsState.map((subject, index) => {
            // 正在被拖拽的項目（只有在實際拖拽中才顯示拖拽效果）
            const isDragging = draggedIndex === index && dropTargetIndex !== null
            // 拖拽指示器：在目標位置顯示
            const showIndicator = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index
            
            return (
              <div key={subject.id}>
                {/* 拖拽指示器 - 在目標位置顯示 */}
                {showIndicator && (
                  <div className="h-1.5 mb-2 bg-blue-500 rounded-full shadow-lg animate-pulse"></div>
                )}
                
                <div
                  draggable={true}
                  onDragStart={() => handleDragStart(subject.id, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                    isDragging
                      ? 'cursor-move border-blue-400 bg-blue-50 opacity-50 scale-95 shadow-lg' 
                      : isReordering
                      ? 'cursor-move border-gray-200 hover:border-blue-400' 
                      : 'border-gray-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1'
                  }`}
                  style={{ 
                    backgroundColor: isDragging 
                      ? 'rgba(59, 130, 246, 0.1)' 
                      : `${subject.color}10` 
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {/* 拖拽手柄 */}
                      <div className="flex flex-col gap-1 cursor-move">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        </div>
                      </div>
                      
                      <div 
                        className="text-5xl"
                        style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))' }}
                      >
                        {subject.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">
                          {subject.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span 
                            className="px-3 py-1 rounded-full text-white text-sm font-semibold"
                            style={{ backgroundColor: subject.color }}
                          >
                            {t('colorTag')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isReordering && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleOpenRewardRulesModal(subject)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold cursor-pointer"
                        >
                          💎 {t('rewardRules')}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(subject)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-200 font-semibold cursor-pointer"
                        >
                          ✏️ {tCommon('edit')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            )
          })}
          {/* 拖拽到最底端的占位區域 - 只在拖拽時顯示 */}
          {draggedIndex !== null && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                if (draggedIndex !== null && draggedIndex < sortedSubjectsState.length - 1) {
                  setDropTargetIndex(sortedSubjectsState.length)
                  const newSubjects = [...sortedSubjectsState]
                  const draggedSubjectItem = newSubjects[draggedIndex]
                  newSubjects.splice(draggedIndex, 1)
                  newSubjects.push(draggedSubjectItem)
                  setSortedSubjectsState(newSubjects)
                  setDraggedIndex(newSubjects.length - 1)
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                if (draggedIndex !== null) {
                  setDropTargetIndex(sortedSubjectsState.length)
                }
              }}
              className={`h-16 mt-2 rounded-lg transition-all ${
                dropTargetIndex === sortedSubjectsState.length
                  ? 'bg-blue-100 border-2 border-dashed border-blue-500'
                  : 'bg-transparent border-2 border-dashed border-gray-300'
              }`}
            ></div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-2">📭 {t('noSubjectsAdded')}</p>
          <p className="text-gray-400 text-sm mb-4">{t('clickToAddSubject')}</p>
        </div>
      )}

      {/* 科目表單 Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={handleCloseSubjectModal}
        studentId={studentId}
        subject={editingSubject || undefined}
        existingSubjects={existingSubjects}
        onSuccess={handleSubjectModalSuccess}
      />

      {/* 獎金規則 Modal */}
      {selectedSubjectForRules && (
        <SubjectRewardRulesModal
          isOpen={isRewardRulesModalOpen}
          onClose={handleCloseRewardRulesModal}
          studentId={studentId}
          studentName={studentName}
          subjectId={selectedSubjectForRules.id}
          subjectName={selectedSubjectForRules.name}
          subjectIcon={selectedSubjectForRules.icon}
          subjectRules={allRewardRules.filter(r => r.subject_id === selectedSubjectForRules.id)}
          studentRules={studentRules}
          globalRules={globalRules}
          onSuccess={handleRewardRulesModalSuccess}
        />
      )}

      {/* 通用獎金規則 Modal */}
      <GlobalRewardRulesModal
        isOpen={isGlobalRewardRulesModalOpen}
        onClose={() => setIsGlobalRewardRulesModalOpen(false)}
        studentId={studentId}
        studentName={studentName}
        globalRules={globalRules}
        studentRules={studentRules}
        onSuccess={handleRewardRulesModalSuccess}
      />
    </>
  )
}

