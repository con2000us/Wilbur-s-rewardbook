import { createClient } from '@/lib/supabase/server'

export default async function TestConnection() {
  const supabase = createClient()
  
  // 測試連接
  let connectionStatus = {
    envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    envKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    envKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
  }
  
  // 嘗試查詢
  let queryResult: any = { success: false, error: null, data: null, count: 0 }
  
  try {
    const { data, error, count } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
    
    queryResult = {
      success: !error,
      error: error?.message || null,
      data: data,
      count: count || 0
    }
  } catch (err: any) {
    queryResult.error = err.message
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Supabase 連接診斷</h1>
        
        {/* 環境變量檢查 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">1️⃣ 環境變量檢查</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className={connectionStatus.envUrl.includes('supabase.co') ? 'text-green-600' : 'text-red-600'}>
                {connectionStatus.envUrl}
              </span>
            </div>
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className={connectionStatus.envKeyExists ? 'text-green-600' : 'text-red-600'}>
                {connectionStatus.envKeyExists ? '✅ 已設置' : '❌ 未設置'}
              </span>
            </div>
            {connectionStatus.envKeyExists && (
              <div className="text-xs text-gray-500 mt-2">
                Key 前綴: {connectionStatus.envKeyPreview}
              </div>
            )}
          </div>
        </div>

        {/* 查詢結果 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">2️⃣ 數據庫查詢測試</h2>
          
          {queryResult.success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-semibold">✅ 連接成功！</p>
                <p className="text-green-700 mt-2">找到 {queryResult.count} 個學生</p>
              </div>
              
              {queryResult.data && queryResult.data.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">學生列表：</h3>
                  <div className="space-y-2">
                    {queryResult.data.map((student: any) => (
                      <div key={student.id} className="p-3 bg-gray-50 rounded border">
                        <div className="font-semibold">{student.name}</div>
                        <div className="text-sm text-gray-600">ID: {student.id}</div>
                        {student.email && (
                          <div className="text-sm text-gray-600">Email: {student.email}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold">❌ 查詢失敗</p>
              <p className="text-red-700 mt-2 font-mono text-sm">
                {queryResult.error || '未知錯誤'}
              </p>
            </div>
          )}
        </div>

        {/* 建議操作 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">💡 故障排除建議</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>確認 .env.local 文件在項目根目錄</li>
            <li>確認已重啟開發服務器（Ctrl+C 後 npm run dev）</li>
            <li>確認 Supabase RLS 已禁用</li>
            <li>確認 API keys 沒有多餘空格</li>
            <li>嘗試在 Supabase Dashboard 直接查詢 students 表</li>
          </ol>
        </div>

        {/* 返回首頁 */}
        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回首頁
          </a>
        </div>
      </div>
    </div>
  )
}


