import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import type { IssueSeverity } from '@/types';

export interface IssueSeverityDisplay {
  value: IssueSeverity;
  label: string;
  color: string;
  icon: LucideIcon;
}

export const ISSUE_SEVERITY_OPTIONS: IssueSeverityDisplay[] = [
  { value: 'critical', label: 'Critical', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
  { value: 'major', label: 'Major', color: 'bg-orange-500 text-white', icon: AlertCircle },
  { value: 'minor', label: 'Minor', color: 'bg-yellow-500 text-black', icon: Info },
  { value: 'trivial', label: 'Trivial', color: 'bg-muted text-muted-foreground', icon: Info },
];

export const ISSUE_SEVERITY_DISPLAY: Record<IssueSeverity, IssueSeverityDisplay> = {
  critical: ISSUE_SEVERITY_OPTIONS[0],
  major: ISSUE_SEVERITY_OPTIONS[1],
  minor: ISSUE_SEVERITY_OPTIONS[2],
  trivial: ISSUE_SEVERITY_OPTIONS[3],
};
