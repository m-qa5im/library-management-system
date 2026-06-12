import React from 'react';

export function Shimmer({ className = '', style = {} }) {
  return (
    <div
      className={`bg-slate-200 animate-pulse rounded-md ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite linear',
        ...style
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="db-stat-card border border-slate-100 p-6 flex items-center gap-4 bg-white rounded-2xl shadow-sm">
      <Shimmer className="w-12 h-12 rounded-xl" />
      <div className="flex-1 flex flex-col gap-2">
        <Shimmer className="w-20 h-3" />
        <Shimmer className="w-12 h-6" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Shimmer className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4">
                <Shimmer className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
