import React from 'react';

interface DashboardMainZoneProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardMainZone: React.FC<DashboardMainZoneProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-4 xl:border-r xl:border-slate-200/80 dark:xl:border-slate-800 xl:pr-6 ${className}`}>
      {children}
    </div>
  );
};

export default DashboardMainZone;
