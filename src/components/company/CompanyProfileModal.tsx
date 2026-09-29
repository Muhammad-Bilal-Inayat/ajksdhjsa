import React from 'react';
import { CompanySettingsModal, CompanySettingsModalProps } from '../modals/CompanySettingsModal';

export interface CompanyProfileModalProps extends CompanySettingsModalProps {}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = (props) => {
  return <CompanySettingsModal {...props} />;
};
