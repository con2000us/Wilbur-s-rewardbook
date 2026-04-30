'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import './print.css'

export default function PrintButtons() {
  const t = useTranslations('print')
  const tCommon = useTranslations('common')
  const printButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // 添加打印样式
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          background: white !important;
        }
        /* 確保列印時背景始終為白色，不受 dark mode 影響 */
        div, body, td, th, tr {
          background-color: white !important;
        }
        /* 確保所有邊框始終為灰色 */
        * {
          border-color: rgb(209 213 219) !important; /* gray-300 */
        }
        /* 確保統計卡片的背景色 */
        div[class*="bg-gray-50"] {
          background-color: rgb(249 250 251) !important; /* gray-50 */
        }
        /* 確保表頭背景 */
        tr[class*="bg-gray-100"] {
          background-color: rgb(243 244 246) !important; /* gray-100 */
        }
        /* 確保交替行背景 */
        tr[class*="bg-white"] {
          background-color: white !important;
        }
        tr[class*="bg-gray-50"] {
          background-color: rgb(249 250 251) !important; /* gray-50 */
        }
        .no-print {
          display: none !important;
        }
      }
      /* 修復手機 dark mode 下列印按鈕樣式 - 使用更強制的選擇器 */
      .no-print button.bg-blue-600,
      .no-print button[class*="bg-blue-600"],
      button.bg-blue-600.no-print,
      button[class*="bg-blue-600"][class*="no-print"] {
        background-color: rgb(37 99 235) !important; /* blue-600 */
        background: rgb(37 99 235) !important;
        border-color: transparent !important;
        border: none !important;
      }
      .no-print button.bg-primary,
      .no-print button[class*="bg-primary"],
      button.bg-primary.no-print,
      button[class*="bg-primary"][class*="no-print"] {
        background-color: rgb(106 153 224) !important; /* primary */
        background: rgb(106 153 224) !important;
        border-color: transparent !important;
        border: none !important;
      }
    `
    document.head.appendChild(style)

    // 調試：檢查按鈕樣式
    const checkButtonStyles = () => {
      if (printButtonRef.current) {
        const computedStyle = window.getComputedStyle(printButtonRef.current)
        fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'PrintButtons.tsx:checkButtonStyles',
            message: 'Print button computed styles',
            data: {
              backgroundColor: computedStyle.backgroundColor,
              background: computedStyle.background,
              borderColor: computedStyle.borderColor,
              isDarkMode: document.documentElement.classList.contains('dark'),
              windowWidth: window.innerWidth,
              className: printButtonRef.current.className
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'initial',
            hypothesisId: 'A'
          })
        }).catch(() => {})
      }
      if (closeButtonRef.current) {
        const computedStyle = window.getComputedStyle(closeButtonRef.current)
        fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'PrintButtons.tsx:checkButtonStyles',
            message: 'Close button computed styles',
            data: {
              backgroundColor: computedStyle.backgroundColor,
              background: computedStyle.background,
              borderColor: computedStyle.borderColor,
              isDarkMode: document.documentElement.classList.contains('dark'),
              windowWidth: window.innerWidth,
              className: closeButtonRef.current.className
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'initial',
            hypothesisId: 'B'
          })
        }).catch(() => {})
      }
    }

    // 立即檢查一次
    setTimeout(checkButtonStyles, 100)

    // 監聽窗口大小變化（手機旋轉等）
    window.addEventListener('resize', checkButtonStyles)

    return () => {
      document.head.removeChild(style)
      window.removeEventListener('resize', checkButtonStyles)
    }
  }, [])

  return (
    <div className="no-print mb-4 flex justify-between items-center gap-3">
      <button
        ref={printButtonRef}
        onClick={() => window.print()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
        style={{
          backgroundColor: 'rgb(37 99 235)',
          background: 'rgb(37 99 235)',
          boxShadow: '0 1px 3px 0 rgb(37 99 235)',
          border: 'none',
          borderColor: 'transparent'
        }}
      >
        🖨️ {t('printPage')}
      </button>
      <button
        ref={closeButtonRef}
        onClick={() => window.close()}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
        style={{
          backgroundColor: 'rgb(106 153 224)',
          background: 'rgb(106 153 224)',
          boxShadow: '0 1px 3px 0 rgb(106 153 224)',
          border: 'none',
          borderColor: 'transparent'
        }}
      >
        {tCommon('close')}
      </button>
    </div>
  )
}

