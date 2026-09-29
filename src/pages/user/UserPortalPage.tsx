import React from 'react';
import { Dashboard } from '../Dashboard';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

export const UserPortalPage: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    </div>
  );
};
