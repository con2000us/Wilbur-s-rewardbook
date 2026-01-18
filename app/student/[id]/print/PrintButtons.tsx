'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import './print.css'

export default function PrintButtons() {
  const t = useTranslations('print')
  const tCommon = useTranslations('common')

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
      /* 修復手機 dark mode 下列印按鈕樣式 */
      .no-print button.bg-blue-600 {
        background-color: rgb(37 99 235) !important; /* blue-600 */
        border-color: transparent !important;
      }
      .no-print button.bg-gray-600 {
        background-color: rgb(75 85 99) !important; /* gray-600 */
        border-color: transparent !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="no-print mb-4 flex justify-between items-center gap-3">
      <button
        onClick={() => window.print()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
        style={{boxShadow: '0 1px 3px 0 rgb(37 99 235)'}}
      >
        🖨️ {t('printPage')}
      </button>
      <button
        onClick={() => window.close()}
        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
        style={{boxShadow: '0 1px 3px 0 rgb(75 85 99)'}}
      >
        {tCommon('close')}
      </button>
    </div>
  )
}

