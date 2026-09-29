import React from 'react';
import { ServerActivityFeedPanel } from './ServerActivityFeedPanel';
import { MasterActiveUser } from '../../lib/masterServerService';
import { Invoice, Medicine } from '../../types';

interface UserSyncTelemetrySectionProps {
  invoices?: Invoice[];
  medicines?: Medicine[];
  onNotify: (msg: string) => void;
  onOpenGranularModal?: (user: MasterActiveUser) => void;
  onOpenResetPasscodeModal?: (user: MasterActiveUser) => void;
}

export const UserSyncTelemetrySection: React.FC<UserSyncTelemetrySectionProps> = ({
  invoices = [],
  medicines = [],
  onNotify,
  onOpenGranularModal,
  onOpenResetPasscodeModal
}) => {
  return (
    <ServerActivityFeedPanel
      onNotify={onNotify}
      invoices={invoices}
      medicines={medicines}
      onOpenGranularModal={onOpenGranularModal}
      onOpenResetPasscodeModal={onOpenResetPasscodeModal}
    />
  );
};
