'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  widthPercent?: number  // 自定義寬度百分比（相對於主容器）
}

export default function Modal({ isOpen, onClose, title, children, size = 'lg', widthPercent }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // 確保只在客戶端渲染
  useEffect(() => {
    setMounted(true)
  }, [])

  // 處理 ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // 防止背景滾動
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // 點擊背景關閉
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !mounted) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-7xl'
  }

  // 如果指定了寬度百分比，使用自定義樣式
  // 主容器是 max-w-6xl (1152px)，所以計算 70% 的寬度
  const widthStyle = widthPercent 
    ? { 
        width: `min(${widthPercent}%, ${1152 * widthPercent / 100}px)`, 
        maxWidth: `${1152 * widthPercent / 100}px` 
      } 
    : {}
  const widthClass = widthPercent ? '' : sizeClasses[size]

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
    >
      {/* 模糊背景 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      {/* Modal 內容 */}
      <div
        ref={modalRef}
        className={`relative bg-white rounded-2xl shadow-2xl ${widthClass} w-full max-h-[90vh] flex flex-col animate-slideUp`}
        style={widthStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
            aria-label="關閉"
          >
            <svg
              className="w-6 h-6 text-gray-500 group-hover:text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body - 可滾動 */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )

  // 使用 Portal 渲染到 document.body
  return createPortal(modalContent, document.body)
}

