import AddStudentForm from './AddStudentForm'
import Link from 'next/link'

export default function AddStudentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/"
            className="text-white hover:text-gray-200 text-lg"
          >
            ← 返回首頁
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ➕ 添加新學生
          </h1>
          <p className="text-gray-600 mb-6">
            創建新的學生檔案
          </p>

          <AddStudentForm />
        </div>
      </div>
    </div>
  )
}

