import React from 'react';
import { 
  NotificationDropdown, 
  NotificationDropdownProps, 
  AppNotification, 
  NotificationSeverity, 
  playNotificationChime 
} from './NotificationDropdown';

export type NotificationCenterProps = NotificationDropdownProps;
export { NotificationDropdown, playNotificationChime };
export type { AppNotification, NotificationSeverity };

export const NotificationCenter: React.FC<NotificationCenterProps> = (props) => {
  return <NotificationDropdown {...props} />;
};
