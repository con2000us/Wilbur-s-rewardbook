'use client'

import React from 'react'

interface Props {
  studentId: string
  studentName: string
  studentAvatar: { emoji: string; gradientStyle: string }
}

export default function StudentInfo({ studentId, studentName, studentAvatar }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // 觸發自定義事件來打開設定 Modal
    window.dispatchEvent(new CustomEvent('openStudentSettings', { 
      detail: { studentId } 
    }))
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 group cursor-pointer"
    >
      {/* 學生頭像 */}
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center text-[2.35rem] shadow-2xl ring-4 ring-white/30 flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
        style={{ 
          background: studentAvatar.gradientStyle,
          filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))' 
        }}
      >
        {studentAvatar.emoji}
      </div>
      
      {/* 學生名稱 */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white break-words group-hover:text-purple-200 transition-colors duration-200" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 0, 0, 0.3)' }}>
          {studentName}
        </h1>
      </div>
    </button>
  )
}

