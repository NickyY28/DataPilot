import React from 'react';

export const TableSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-6 bg-gray-200 rounded w-32"></div>
      </div>
      
      {/* Table Headers */}
      <div className="grid grid-cols-5 gap-4 mb-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 bg-gray-200 rounded"></div>
        ))}
      </div>
      
      {/* Table Rows */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map(row => (
        <div key={row} className="grid grid-cols-5 gap-4 mb-3">
          {[1, 2, 3, 4, 5].map(col => (
            <div key={col} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
};

export const ChartSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-100 rounded"></div>
    </div>
  );
};