import { LucideIcon } from 'lucide-react';
import { ROLE_DEFINITIONS } from '../lib/permissions';

export interface NavSubItem {
  label: string;
  path: string;
  addPath?: string;
  hasAdd?: boolean;
  requiredTier?: 'BASIC' | 'BUSINESS' | 'ENTERPRISE';
  requiredPlan?: 'silver' | 'gold' | 'platinum';
}

export interface NavItem {
  id?: string;
  icon: LucideIcon | any;
  label: string;
  path: string;
  moduleKey: keyof typeof ROLE_DEFINITIONS['Primary Admin']['allowedModules'] | string;
  addPath?: string;
  hasDropdown?: boolean;
  hasAdd?: boolean;
  subItems?: NavSubItem[];
  requiredTier?: 'BASIC' | 'BUSINESS' | 'ENTERPRISE';
  isCore?: boolean;
}

export type CorePharmacyModule = 
  | 'dashboard'
  | 'sale'
  | 'items'
  | 'purchase'
  | 'parties'
  | 'shifts'
  | 'expenses'
  | 'bank'
  | 'reports'
  | 'settings'
  | 'syncShare'
  | 'aiGuide';

export const CORE_PHARMACY_MODULES: CorePharmacyModule[] = [
  'dashboard',
  'sale',
  'items',
  'purchase',
  'parties',
  'shifts',
  'expenses',
  'bank',
  'reports',
  'settings',
  'syncShare',
  'aiGuide'
];
