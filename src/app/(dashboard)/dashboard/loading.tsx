import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="h-16 bg-white rounded-lg animate-pulse w-full mb-4"></div>
      
      {/* Nav Skeleton */}
      <div className="h-12 bg-white rounded-lg animate-pulse w-full mb-8"></div>
      
      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white rounded-2xl animate-pulse"></div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-white rounded-2xl animate-pulse"></div>
        <div className="h-80 bg-white rounded-2xl animate-pulse"></div>
      </div>
    </div>
  );
}
