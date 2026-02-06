export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="sticky top-0 z-30 bg-blue-900 h-16 w-full animate-pulse" />
      <div className="bg-white h-14 w-full border-b border-gray-200 animate-pulse" />
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-32 animate-pulse" />
          ))}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 animate-pulse" />
      </div>
    </div>
  )
}
