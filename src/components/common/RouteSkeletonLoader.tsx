import React from 'react';

interface RouteSkeletonLoaderProps {
  type?: 'dashboard' | 'table' | 'form' | 'cards' | 'general';
  title?: string;
}

export const RouteSkeletonLoader: React.FC<RouteSkeletonLoaderProps> = ({
  type = 'general',
  title
}) => {
  return (
    <div className="w-full min-h-[60vh] p-4 sm:p-6 space-y-6 animate-pulse select-none">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-850 rounded-md"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-9 w-28 bg-blue-500/20 dark:bg-blue-600/20 rounded-xl"></div>
        </div>
      </div>

      {/* KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
            </div>
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-750 rounded-lg"></div>
            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-850 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-xs">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="h-10 w-full sm:w-72 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/60 gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-750 shrink-0"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded hidden sm:block"></div>
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RouteSkeletonLoader;
