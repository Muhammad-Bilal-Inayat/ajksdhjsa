import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from './Layout';

export interface UserLayoutProps {
  children?: React.ReactNode;
}

export const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased tracking-tight transition-colors duration-200 selection:bg-blue-500 selection:text-white">
      {children ? children : <Layout />}
    </div>
  );
};

export default UserLayout;
