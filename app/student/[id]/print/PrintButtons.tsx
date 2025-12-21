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
        }
        .no-print {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="no-print mb-4 flex justify-between items-center">
      <button
        onClick={() => window.print()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
      >
        🖨️ {t('printPage')}
      </button>
      <button
        onClick={() => window.close()}
        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
      >
        {tCommon('close')}
      </button>
    </div>
  )
}

