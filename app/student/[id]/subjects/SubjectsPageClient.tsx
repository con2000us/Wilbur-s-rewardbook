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
      <div className="flex flex-col sm:flex-row justify-end gap-3 mb-6">
        {/* 完成排序按鈕 - 只在排序模式時顯示 */}
        {isReordering && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSaveOrder()
              }}
              disabled={loading}
              data-reorder-action="save"
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <span>✓</span>
              <span>{tCommon('done') || '完成排序'}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCancelReorder()
              }}
              disabled={loading}
              data-reorder-action="cancel"
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <span>✕</span>
              <span>{tCommon('cancel')}</span>
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsGlobalRewardRulesModalOpen(true)
          }}
          data-subject-action="global-rules"
          className="bg-accent-gold hover:bg-amber-400 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-2 font-medium transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span className="material-icons-round" style={{ fontSize: '0.875rem' }}>diamond</span>
          <span>{tRewardRules('manageGlobalRules') || '通用獎金規則'}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleOpenAddModal()
          }}
          data-subject-action="add-subject"
          className="bg-accent-green hover:bg-emerald-400 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 font-medium transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span className="material-icons-round" style={{ fontSize: '1.25rem' }}>add</span>
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
            
            // 判斷是否為特殊樣式（例如數學科目可能有特殊背景）
            const isSpecialStyle = false // 可以根據需要調整
            
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
                  className={`glass-card p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-lg group ${
                    isDragging
                      ? 'opacity-50 scale-95'
                      : ''
                  } ${isDesktopLayout ? 'flex-row' : 'flex-col'}`}
                >
                  {/* #region agent log */}
                  {(() => {
                    if (index === 0) {
                      fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubjectsPageClient.tsx:310',message:'Rendering subject card',data:{isDesktopLayout,windowInnerWidth:typeof window !== 'undefined' ? window.innerWidth : 'N/A',layoutClass:isDesktopLayout ? 'flex-row' : 'flex-col'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    }
                    return null;
                  })()}
                  {/* #endregion */}
                  {/* 拖拽指示器 */}
                  <div className={`text-gray-400 cursor-grab active:cursor-grabbing p-2 ${isDesktopLayout ? 'block' : 'hidden'}`}>
                    <span className="material-icons-round text-3xl">drag_indicator</span>
                  </div>
                  
                  {/* 科目圖示 */}
                  <div className="w-16 h-16 flex-shrink-0 bg-blue-100 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-100 opacity-50"></div>
                    <span className="text-[2.59rem] relative z-10 leading-none flex items-center justify-center">{subject.icon}</span>
                  </div>
                  
                  {/* 科目資訊 */}
                  <div className={`flex-grow ${isDesktopLayout ? 'text-left' : 'text-center'}`}>
                    <h3 className="text-xl font-bold mb-1 subject-name-text" style={{ color: '#1f2937' }}>{subject.name}</h3>
                    <div
                      className="inline-flex items-center px-3 py-1 rounded-full text-white text-xs font-medium shadow-sm"
                      style={{
                        backgroundColor: subject.color || '#3B82F6',
                        boxShadow: `0 1px 2px 0 ${subject.color || '#3B82F6'}30`
                      }}
                    >
                      <span className="w-2 h-2 rounded-full bg-white mr-2 opacity-70"></span>
                      {t('colorTag')}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  {!isReordering && (
                    <div className={`flex gap-3 ${isDesktopLayout ? 'w-auto justify-end mt-0' : 'w-full justify-center mt-2'} opacity-90 group-hover:opacity-100 transition-opacity`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenRewardRulesModal(subject)
                        }}
                        data-subject-action="reward-rules"
                        className="bg-accent-purple hover:bg-purple-400 text-white px-4 py-2 rounded-full shadow-md shadow-purple-500/20 flex items-center gap-2 text-sm font-medium transition-transform active:scale-95 cursor-pointer"
                      >
                        <span className="material-icons-round" style={{ fontSize: '0.875rem' }}>diamond</span>
                        {t('rewardRules')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEditModal(subject)
                        }}
                        data-subject-action="edit-subject"
                        className="bg-accent-blue hover:bg-blue-400 text-white px-4 py-2 rounded-full shadow-md shadow-blue-500/20 flex items-center gap-2 text-sm font-medium transition-transform active:scale-95 cursor-pointer"
                      >
                        <span className="material-icons-round" style={{ fontSize: '0.875rem' }}>edit</span>
                        {tCommon('edit')}
                      </button>
                    </div>
                  )}
                </div>
                
              </div>
            )
          })}
          
          {/* 快速添加新科目按鈕 */}
          <div className="border-2 border-dashed rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors group" style={{ borderColor: 'rgba(107, 114, 128, 0.5)' }} onClick={handleOpenAddModal}>
            <span className="font-medium flex items-center gap-2 quick-add-subject-text" style={{ color: '#1f2937' }}>
              <span className="material-icons-round">add_circle_outline</span>
              {t('quickAddSubject') || '快速添加新科目'}
            </span>
          </div>
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
      
      {/* 確保科目名稱文字顏色在所有設備上都是深色 */}
      <style jsx global>{`
        .subject-name-text {
          color: #1f2937 !important;
        }
        .quick-add-subject-text {
          color: #1f2937 !important;
        }
      `}</style>
    </>
  )
}

