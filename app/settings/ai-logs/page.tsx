'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import HomeButton from '@/app/components/HomeButton'

interface AiLog {
  id: string
  job_id: string
  purpose: 'vision' | 'text' | 'multimodal'
  provider: string | null
  model: string | null
  system_prompt: string | null
  user_prompt: string | null
  raw_response: string | null
  success: boolean
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

const purposeLabels: Record<string, { zh: string; en: string; color: string }> = {
  multimodal: { zh: '多模態', en: 'Multimodal', color: 'bg-purple-100 text-purple-700' },
  vision: { zh: '識圖', en: 'Vision', color: 'bg-blue-100 text-blue-700' },
  text: { zh: '文本', en: 'Text', color: 'bg-green-100 text-green-700' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AiLogsPage() {
  const locale = useLocale()
  const isZh = locale === 'zh-TW'

  const [logs, setLogs] = useState<AiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const loadLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-assessment/logs')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const CodeBlock = ({ title, content }: { title: string; content?: string | null }) => (
    <div className="mt-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">{title}</p>
      <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap break-all">
        {content || (isZh ? '無內容' : 'No content')}
      </pre>
    </div>
  )

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-app-shell" />
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-sky-200/20" />

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">history</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                  {isZh ? 'AI 呼叫紀錄' : 'AI Call Logs'}
                </h1>
                <p className="text-slate-500 text-sm">
                  {isZh
                    ? '查看傳給 LLM 的 prompt 與回覆，保留最近 30 筆紀錄。'
                    : 'View prompts and responses sent to the LLM. Last 30 entries kept.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition shadow-sm"
              >
                <span className="material-icons-outlined text-base">arrow_back</span>
                {isZh ? '返回設定' : 'Settings'}
              </Link>
              <HomeButton />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-500">
              {logs.length > 0
                ? (isZh
                  ? `目前顯示 ${logs.length} 筆紀錄（系統自動保留最近 30 筆）`
                  : `Showing ${logs.length} entries (system keeps last 30)`)
                : ''}
            </p>
            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 shadow-sm"
            >
              <span className="material-icons-outlined text-base">refresh</span>
              {loading ? (isZh ? '載入中...' : 'Loading...') : (isZh ? '重新整理' : 'Refresh')}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && !logs.length ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <span className="material-icons-outlined text-5xl text-slate-300 mb-3 block animate-spin">refresh</span>
              <p className="text-slate-500 text-lg font-medium">
                {isZh ? '載入中...' : 'Loading...'}
              </p>
            </div>
          ) : !logs.length && !loading ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <span className="material-icons-outlined text-5xl text-slate-300 mb-3">history</span>
              <p className="text-slate-500 text-lg font-medium">
                {isZh ? '尚無 AI 呼叫紀錄' : 'No AI Call Logs Yet'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {isZh
                  ? '執行一次 AI 評量匯入後就會出現。'
                  : 'They will appear after an AI assessment import.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const purpose = purposeLabels[log.purpose] || purposeLabels.text
                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Summary row */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                    >
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${purpose.color}`}>
                        <span className="material-icons-outlined text-xs">
                          {log.purpose === 'vision' ? 'image_search' : log.purpose === 'multimodal' ? 'psychology' : 'description'}
                        </span>
                        {isZh ? purpose.zh : purpose.en}
                      </span>
                      <span className="text-sm font-medium text-slate-700 truncate flex-1">
                        {log.model || '-'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          log.success
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <span className="material-icons-outlined text-xs">
                          {log.success ? 'check' : 'close'}
                        </span>
                        {log.success ? 'OK' : 'FAIL'}
                      </span>
                      {log.duration_ms != null && (
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {(log.duration_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {formatTime(log.created_at)}
                      </span>
                      <span
                        className="material-icons-outlined text-slate-400 text-base transition-transform duration-200"
                        style={{ transform: expanded.has(log.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        expand_more
                      </span>
                    </button>

                    {/* Expanded content */}
                    {expanded.has(log.id) && (
                      <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/50">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                          <div>
                            <span className="font-semibold">Job:</span>{' '}
                            <span className="font-mono">{log.job_id.slice(0, 8)}...</span>
                          </div>
                          <div>
                            <span className="font-semibold">Provider:</span> {log.provider || '-'}
                          </div>
                          {log.error_message && (
                            <div className="col-span-2 text-red-600">
                              <span className="font-semibold">Error:</span> {log.error_message}
                            </div>
                          )}
                        </div>

                        <CodeBlock
                          title={isZh ? 'System Prompt' : 'System Prompt'}
                          content={log.system_prompt}
                        />
                        <CodeBlock
                          title={isZh ? 'User Prompt' : 'User Prompt'}
                          content={log.user_prompt}
                        />
                        <CodeBlock
                          title={isZh ? 'Raw Response' : 'Raw Response'}
                          content={log.raw_response}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
