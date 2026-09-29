import React from 'react';
import { DeviceApprovalModal } from '../modals/DeviceApprovalModal';

interface DeviceUnauthorizedModalProps {
  tenantId?: string;
  userId?: string;
}

export const DeviceUnauthorizedModal: React.FC<DeviceUnauthorizedModalProps> = ({
  tenantId,
  userId
}) => {
  return <DeviceApprovalModal tenantId={tenantId} userId={userId} isOpen={true} />;
};

export default DeviceUnauthorizedModal;
