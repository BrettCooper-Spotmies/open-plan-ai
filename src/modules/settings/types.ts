import type { Theme, UserPreferences } from '@/shared/types';

export type { Theme, UserPreferences };

export interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  avatar?: File;
  timezone?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  activeSessions: ActiveSession[];
}

export interface ActiveSession {
  id: string;
  device: string;
  location?: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface BillingInfo {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due';
  nextBillingDate?: string;
  seats?: number;
  usedSeats?: number;
}
