import React from 'react';
import { SoftwareSalesRevenueDashboard } from '../server/SoftwareSalesRevenueDashboard';

export interface SoftwareSalesMasterRevenueHubProps {
  onOpenNewLicense?: () => void;
  onOpenNewTenant?: () => void;
  onNotify?: (msg: string) => void;
}

export const SoftwareSalesMasterRevenueHub: React.FC<SoftwareSalesMasterRevenueHubProps> = (props) => {
  return <SoftwareSalesRevenueDashboard {...props} />;
};

export default SoftwareSalesMasterRevenueHub;
