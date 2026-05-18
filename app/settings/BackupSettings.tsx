'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface Backup {
  id: string
  name: string
  description: string | null
  file_size: number
  created_at: string
  updated_at: string
}

export default function BackupSettings() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  
  const [isExporting, setIsExporting] = useState(false)
  const [isFullExporting, setIsFullExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isLoadingBackups, setIsLoadingBackups] = useState(true)
  const [backups, setBackups] = useState<Backup[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [backupName, setBackupName] = useState('')
  const [backupDescription, setBackupDescription] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 載入備份列表
  const loadBackups = async () => {
    setIsLoadingBackups(true)
    try {
      const response = await fetch('/api/backup/list')
      if (response.ok) {
        const data = await response.json()
        setBackups(data.backups || [])
      }
    } catch (error) {
      console.error('Failed to load backups:', error)
    } finally {
      setIsLoadingBackups(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  // 格式化檔案大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 下載備份檔案
  const handleExport = async () => {
    setIsExporting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/backup/export')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export backup')
      }

      // 下載檔案
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `backup-${new Date().toISOString().split('T')[0]}.json`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: t('backupExportSuccess') })
    } catch (error) {
      console.error('Export error:', error)
      setMessage({ 
        type: 'error', 
        text: `${t('backupExportFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsExporting(false)
    }
  }

  // 匯出完整備份（DB + 圖片）
  const handleFullExport = async () => {
    setIsFullExporting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/backup/full-export')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export full backup')
      }

      // 下載 ZIP 檔案
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `backup-full-${new Date().toISOString().slice(0, 10)}.zip`

      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: t('backupFullExportSuccess') })
    } catch (error) {
      console.error('Full export error:', error)
      setMessage({
        type: 'error',
        text: `${t('backupFullExportFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      setIsFullExporting(false)
    }
  }

  // 生成自動備份名稱
  const generateBackupName = () => {
    const now = new Date()
    const date = now.toISOString().split('T')[0].replace(/-/g, '')
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '')
    return `快照${date}${time}`
  }

  // 保存備份到資料庫
  const handleSave = async () => {
    // 如果名稱為空，自動生成
    const finalName = backupName.trim() || generateBackupName()

    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: finalName,
          description: backupDescription.trim() || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMsg = result.details || result.error || 'Failed to save backup'
        console.error('Backup save API error:', result)
        throw new Error(errorMsg)
      }

      setMessage({ type: 'success', text: t('backupSaveSuccess') })
      setBackupName('')
      setBackupDescription('')
      await loadBackups()
    } catch (error) {
      console.error('Save error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessage({ 
        type: 'error', 
        text: `${t('backupSaveFailed')}: ${errorMessage}` 
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 觸發檔案選擇
  const triggerFileSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
          setMessage({ type: 'error', text: t('backupFileInvalidFormat') })
          return
        }
        // 選擇檔案後直接執行還原
        await handleImportFromFileDirect(file)
      }
    }
    input.click()
  }

  // 選擇檔案
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setMessage({ type: 'error', text: t('backupFileInvalidFormat') })
        return
      }
      setSelectedFile(file)
      setMessage(null)
    }
  }

  // 驗證備份格式
  const validateBackupFormat = (backup: any): { valid: boolean; error?: string } => {
    // 檢查基本結構
    if (!backup || typeof backup !== 'object') {
      return { valid: false, error: '無效的 JSON 格式：檔案內容不是有效的 JSON 物件' }
    }

    // 檢查版本
    if (!backup.version) {
      return { valid: false, error: '無效的備份格式：缺少版本資訊' }
    }

    // 檢查資料表結構
    if (!backup.tables || typeof backup.tables !== 'object') {
      return { valid: false, error: '無效的備份格式：缺少資料表區塊' }
    }

    // 檢查必要的資料表欄位
    const requiredTables = ['students', 'subjects', 'assessments', 'transactions', 'reward_rules', 'site_settings']
    const missingTables = requiredTables.filter(table => !(table in backup.tables))
    
    if (missingTables.length > 0) {
      return { 
        valid: false, 
        error: `無效的備份格式：缺少必要的資料表（${missingTables.join('、')}）` 
      }
    }

    // 檢查陣列欄位是否為陣列
    const arrayTables = ['students', 'subjects', 'assessments', 'transactions', 'reward_rules', 'site_settings']
    const invalidArrayTables = arrayTables.filter(table => 
      !Array.isArray(backup.tables[table])
    )
    
    if (invalidArrayTables.length > 0) {
      return { 
        valid: false, 
        error: `無效的備份格式：以下資料表應為陣列格式（${invalidArrayTables.join('、')}）` 
      }
    }

    return { valid: true }
  }

  // 從檔案直接匯入備份（選擇檔案後自動執行）
  const handleImportFromFileDirect = async (file: File) => {
    setIsImporting(true)
    setMessage(null)

    try {
      // 讀取檔案內容
      const fileContent = await file.text()
      
      // 嘗試解析 JSON
      let backup: any
      try {
        backup = JSON.parse(fileContent)
      } catch (parseError) {
        throw new Error('❌ JSON 解析失敗：檔案內容不是有效的 JSON 格式。請確認檔案是否損壞或格式不正確。')
      }

      // 驗證備份格式
      const validation = validateBackupFormat(backup)
      if (!validation.valid) {
        throw new Error(validation.error || '備份格式驗證失敗')
      }

      // 確認匯入
      const confirmed = window.confirm(
        `${t('backupConfirmTitle')}\n\n${t('backupConfirmMessage')}`
      )

      if (!confirmed) {
        setIsImporting(false)
        return
      }

      const response = await fetch('/api/backup/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backup, mode: 'full' })
      })

      const result = await response.json()

      if (!response.ok) {
        // 處理後端返回的詳細錯誤訊息
        const errorMessage = result.details 
          ? `${result.error}\n\n詳細資訊：${typeof result.details === 'string' ? result.details : JSON.stringify(result.details)}`
          : result.error || '匯入失敗，請稍後再試'
        throw new Error(errorMessage)
      }

      const importedDetails = [
        `${result.imported?.students || 0} students`,
        `${result.imported?.subjects || 0} subjects`,
        `${result.imported?.assessments || 0} assessments`
      ].join(', ')
      
      setMessage({ 
        type: 'success', 
        text: `${t('backupImportSuccess')} (${importedDetails})` 
      })
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Import error:', error)
      // 顯示友好的錯誤訊息
      const errorMessage = error instanceof Error 
        ? error.message 
        : '匯入失敗，請稍後再試。請確認檔案格式是否正確。'
      setMessage({ 
        type: 'error', 
        text: errorMessage
      })
    } finally {
      setIsImporting(false)
    }
  }

  // 從檔案匯入備份（舊版本，保留以備不時之需）
  const handleImportFromFile = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: t('backupFileRequired') })
      return
    }

    await handleImportFromFileDirect(selectedFile)
    setSelectedFile(null)
  }

  // 從資料庫還原備份
  const handleRestoreFromDB = async (backupId: string, backupName: string) => {
    const confirmed = window.confirm(
      `${t('backupConfirmTitle')}\n\n${t('backupConfirmMessage')}\n\n備份名稱：${backupName}`
    )

    if (!confirmed) {
      return
    }

    setIsImporting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/backup/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backup_id: backupId, mode: 'full' })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to restore backup')
      }

      const importedDetails = [
        `${result.imported?.students || 0} students`,
        `${result.imported?.subjects || 0} subjects`,
        `${result.imported?.assessments || 0} assessments`
      ].join(', ')
      
      setMessage({ 
        type: 'success', 
        text: `${t('backupImportSuccess')} (${importedDetails})` 
      })
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Restore error:', error)
      setMessage({ 
        type: 'error', 
        text: `${t('backupImportFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsImporting(false)
    }
  }

  // 刪除備份
  const handleDelete = async (backupId: string, backupName: string) => {
    if (!window.confirm(`${t('backupDeleteConfirm')} "${backupName}"?`)) {
      return
    }

    setIsDeleting(backupId)
    setMessage(null)

    try {
      const response = await fetch(`/api/backup/${backupId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete backup')
      }

      setMessage({ type: 'success', text: t('backupDeleteSuccess') })
      await loadBackups()
    } catch (error) {
      console.error('Delete error:', error)
      setMessage({ 
        type: 'error', 
        text: `${t('backupDeleteFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-7 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">{t('backupSettings')}</h2>
        <p className="text-sm text-slate-500 mt-1">{t('backupDesc')}</p>
      </div>
      <div className="p-6 sm:p-7">
        {/* 保存備份和備份列表 - 同一列 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-0 lg:divide-x lg:divide-gray-200">
          {/* 保存備份到資料庫 */}
          <div className="bg-white lg:pr-6">
            <div className="mb-2">
              <h3 className="text-md font-semibold text-slate-800">{t('backupSaveToDB')}</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              {t('backupSaveToDBDesc')}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backupNameLabel')} <span className="text-gray-500 text-xs">({t('backupNameOptional')})</span>
                </label>
                <input
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder={t('backupNamePlaceholder')}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backupDescriptionLabel')}
                </label>
                <textarea
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  placeholder={t('backupDescriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  disabled={isSaving}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isSaving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSaving ? t('backupSaving') : t('backupSaveToDB')}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-gray-400">或</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isExporting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isExporting ? t('backupExporting') : t('exportJSON')}
              </button>

              <button
                onClick={handleFullExport}
                disabled={isFullExporting}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isFullExporting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md'
                }`}
              >
                {isFullExporting ? t('backupFullExporting') : t('backupFullExport')}
              </button>
            </div>
          </div>

          {/* 已保存的備份列表 */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 flex flex-col lg:ml-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-slate-800">{t('backupList')}</h3>
              <button
                onClick={triggerFileSelect}
                disabled={isImporting}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isImporting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isImporting ? t('backupImporting') : t('importJSON')}
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              {isLoadingBackups ? (
                <div className="text-center py-8">
                  <div className="animate-pulse text-gray-500">{tCommon('loading')}</div>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('backupListEmpty')}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ maxHeight: '300px' }}>
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{backup.name}</div>
                        {backup.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{backup.description}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {formatDate(backup.created_at)} • {formatFileSize(backup.file_size)}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleRestoreFromDB(backup.id, backup.name)}
                          disabled={isImporting}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            isImporting
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {t('backupRestore')}
                        </button>
                        <button
                          onClick={() => handleDelete(backup.id, backup.name)}
                          disabled={isDeleting === backup.id}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            isDeleting === backup.id
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200'
                              : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                          }`}
                        >
                          {isDeleting === backup.id ? tCommon('loading') : tCommon('delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>


        {message && (
          <div className={`mt-5 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            <span className="whitespace-pre-line break-words">{message.text}</span>
          </div>
        )}
      </div>
    </section>
  )
}
