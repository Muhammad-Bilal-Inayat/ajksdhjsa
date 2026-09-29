import React from 'react';

interface DashboardSidebarZoneProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardSidebarZone: React.FC<DashboardSidebarZoneProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-4 xl:pl-2 ${className}`}>
      {children}
    </div>
  );
};

export default DashboardSidebarZone;
