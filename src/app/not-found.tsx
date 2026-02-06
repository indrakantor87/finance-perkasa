import Link from 'next/link'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-gray-100 p-4 rounded-full">
            <FileQuestion className="w-12 h-12 text-gray-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Halaman Tidak Ditemukan</h2>
          <p className="text-gray-500">
            Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}
