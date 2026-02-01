'use client'

import { useState, useMemo, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import SubjectModal from './components/SubjectModal'
import SubjectRewardRulesModal from './components/SubjectRewardRulesModal'

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

export interface SubjectsPageClientRef {
  handleOpenAddModal: () => void
}

const SubjectsPageClient = forwardRef<SubjectsPageClientRef, Props>(({ studentId, studentName, subjects, allRewardRules, globalRules, studentRules }, ref) => {
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
  
  
  // 排序相關狀態
  const [isReordering, setIsReordering] = useState(false)
  const [draggedSubject, setDraggedSubject] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null) // 顯示指示器的位置
  const [loading, setLoading] = useState(false)
  const justSavedRef = useRef(false) // 使用 ref 標記是否剛剛保存完成，避免重複渲染
  
  // 響應式佈局狀態 - 檢測視窗寬度
  const [isDesktopLayout, setIsDesktopLayout] = useState(false)
  
  // 檢測視窗寬度並更新佈局狀態
  useEffect(() => {
    // 確保在客戶端執行
    if (typeof window === 'undefined') return
    
    const checkLayout = () => {
      // #region agent log
      const width = window.innerWidth;
      const shouldBeDesktop = width >= 1100;
      fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectsPageClient.tsx:76',message:'Window width check',data:{windowInnerWidth:width,shouldBeDesktop,currentState:isDesktopLayout,userAgent:navigator.userAgent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      // 使用 window.innerWidth 來檢測實際視窗寬度
      setIsDesktopLayout(shouldBeDesktop)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectsPageClient.tsx:78',message:'Layout state updated',data:{newState:shouldBeDesktop},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }
    
    // 初始檢查
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectsPageClient.tsx:85',message:'Initial layout check starting',data:{initialState:isDesktopLayout},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,E'})}).catch(()=>{});
    // #endregion
    checkLayout()
    
    // 監聽視窗大小變化
    window.addEventListener('resize', checkLayout)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectsPageClient.tsx:92',message:'Resize listener added',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // 也監聽設備方向變化（手機旋轉）
    const handleOrientationChange = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectsPageClient.tsx:96',message:'Orientation change detected',data:{windowInnerWidth:window.innerWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // 延遲一下確保寬度已更新
      setTimeout(checkLayout, 100)
    }
    window.addEventListener('orientationchange', handleOrientationChange)
    
    return () => {
      window.removeEventListener('resize', checkLayout)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [isDesktopLayout])
  
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

  // 暴露方法給父組件
  useImperativeHandle(ref, () => ({
    handleOpenAddModal
  }))

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
      {/* 科目列表 */}
      {sortedSubjectsState && sortedSubjectsState.length > 0 ? (
        <div className="space-y-4">
          {sortedSubjectsState.map((subject, index) => {
            // 正在被拖拽的項目（只有在實際拖拽中才顯示拖拽效果）
            const isDragging = draggedIndex === index && dropTargetIndex !== null
            // 拖拽指示器：在目標位置顯示
            const showIndicator = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index
            
            // 判斷是否為特殊樣式（例如數學科目可能有特殊背景）
            const isSpecialStyle = false // 可以根據需要調整
            
            return (
              <div key={subject.id}>
                {/* 拖拽指示器 - 在目標位置顯示 */}
                {showIndicator && (
                  <div className="h-1.5 mb-2 bg-blue-500 rounded-full shadow-lg animate-pulse"></div>
                )}
                
                <div
                  draggable={isReordering}
                  onDragStart={(e) => {
                    if (isReordering) {
                      handleDragStart(subject.id, index)
                      e.dataTransfer.effectAllowed = 'move'
                    } else {
                      e.preventDefault()
                    }
                  }}
                  onDragOver={(e) => {
                    if (isReordering) {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      handleDragOver(e, index)
                    }
                  }}
                  onDrop={(e) => {
                    if (isReordering) {
                      e.preventDefault()
                      handleDrop(e)
                    }
                  }}
                  onDragEnd={(e) => {
                    if (isReordering) {
                      handleDragEnd()
                    }
                  }}
                  className={`glass-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md group ${
                    isDragging
                      ? 'opacity-50 scale-95'
                      : ''
                  }`}
                >
                  {/* 拖拽指示器 - 始终显示，点击或拖拽时进入排序模式 */}
                  <div
                    className={`text-gray-300 cursor-grab active:cursor-grabbing drag-handle ${isReordering ? '' : 'opacity-50'}`}
                    draggable={true}
                    onDragStart={(e) => {
                      e.stopPropagation()
                      if (!isReordering) {
                        setIsReordering(true)
                      }
                      handleDragStart(subject.id, index)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isReordering) {
                        setIsReordering(true)
                      }
                    }}
                  >
                    <span className="material-icons-outlined" style={{ fontSize: '36px' }}>drag_indicator</span>
                  </div>
                  
                  {/* 科目圖示和資訊容器 */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* 科目圖示 - 外框增大20%，图标本身也增大 */}
                    <div className="w-[4.2rem] h-[4.2rem] md:w-[4.8rem] md:h-[4.8rem] flex-shrink-0 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: subject.color ? `${subject.color}20` : '#EFF6FF',
                      }}
                    >
                      {(() => {
                        // 判斷是否為 emoji（用於向後兼容）
                        const isEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(subject.icon) || 
                                       subject.icon.length <= 2 || 
                                       !/^[a-z_]+$/i.test(subject.icon)
                        return isEmoji ? (
                          <span style={{ fontSize: '40px' }}>{subject.icon}</span>
                        ) : (
                          <span className="material-icons-outlined" style={{ fontSize: '40px', color: subject.color || '#3B82F6' }}>
                            {subject.icon}
                          </span>
                        )
                      })()}
                    </div>
                    
                    {/* 科目資訊 */}
                    <div className="flex flex-col">
                      <h3 className="text-xl font-bold text-slate-800">{subject.name}</h3>
                      <div className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-white text-xs font-medium"
                        style={{
                          backgroundColor: subject.color || '#3B82F6',
                        }}
                      >
                        <span className="w-2 h-2 rounded-full bg-white mr-2"></span>
                        {t('colorTag')}
                      </div>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  {!isReordering && (
                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenRewardRulesModal(subject)
                        }}
                        data-subject-action="reward-rules"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-[0.4375rem] rounded-full bg-[#A855F7] hover:bg-[#9333EA] text-white text-sm font-medium shadow-lg shadow-purple-200 transition-transform active:scale-95 cursor-pointer"
                      >
                        <span className="material-icons-outlined text-sm">diamond</span>
                        <span className="text-[1.1em]">{t('rewardRules')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEditModal(subject)
                        }}
                        data-subject-action="edit-subject"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-[0.4375rem] rounded-full bg-accent-blue hover:bg-blue-600 text-white text-sm font-medium shadow-lg shadow-blue-200 transition-transform active:scale-95 cursor-pointer"
                      >
                        <span className="material-icons-outlined text-sm">edit</span>
                        <span className="text-[1.1em]">{tCommon('edit')}</span>
                      </button>
                    </div>
                  )}
                </div>
                
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-2">📭 {t('noSubjectsAdded')}</p>
          <p className="text-gray-400 text-sm mb-4">{t('clickToAddSubject')}</p>
        </div>
      )}

      {/* 完成排序按鈕 - 只在排序模式時顯示，放在列表底部 */}
      {isReordering && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSaveOrder()
            }}
            disabled={loading}
            data-reorder-action="save"
            className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons-outlined text-lg">check_circle</span>
            <span>{tCommon('done') || '完成排序'}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCancelReorder()
            }}
            disabled={loading}
            data-reorder-action="cancel"
            className="bg-primary hover:bg-opacity-90 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons-outlined text-lg">cancel</span>
            <span>{tCommon('cancel')}</span>
          </button>
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

      {/* 確保科目名稱文字顏色在所有設備上都是深色 */}
      <style jsx global>{`
        .subject-name-text {
          color: #1f2937 !important;
        }
      `}</style>
    </>
  )
})

SubjectsPageClient.displayName = 'SubjectsPageClient'

export default SubjectsPageClient

