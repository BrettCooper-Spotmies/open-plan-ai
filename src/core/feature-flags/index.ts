import { appConfig } from '@/core/config';

export type FeatureFlag =
  | 'bom'
  | 'gantt'
  | 'ai_chat'
  | 'reports_advanced'
  | 'billing'
  | 'export_csv'
  | 'export_pdf'
  | 'offline_mode'
  | 'dark_mode'
  | 'admin_panel'
  | 'sso';

type UserContext = {
  role?: string;
  orgId?: string;
  userId?: string;
  planTier?: 'free' | 'pro' | 'enterprise';
};

const ENV_FLAGS: Partial<Record<FeatureFlag, boolean>> = (() => {
  try {
    const raw = appConfig.featureFlags.raw;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  bom: true,
  gantt: true,
  ai_chat: true,
  reports_advanced: true,
  billing: false,
  export_csv: true,
  export_pdf: false,
  offline_mode: false,
  dark_mode: true,
  admin_panel: false,
  sso: false,
};

const ROLE_FLAGS: Partial<Record<string, FeatureFlag[]>> = {
  owner: ['billing', 'admin_panel', 'sso'],
  admin: ['admin_panel'],
};

class FeatureFlagService {
  isEnabled(flag: FeatureFlag, user?: UserContext): boolean {
    // Env override takes priority
    if (flag in ENV_FLAGS) return ENV_FLAGS[flag] as boolean;

    // Role-based flags
    if (user?.role && ROLE_FLAGS[user.role]?.includes(flag)) return true;

    // Enterprise tier unlocks all
    if (user?.planTier === 'enterprise') return true;

    return DEFAULT_FLAGS[flag] ?? false;
  }

  getAll(user?: UserContext): Record<FeatureFlag, boolean> {
    return Object.fromEntries(
      (Object.keys(DEFAULT_FLAGS) as FeatureFlag[]).map((f) => [f, this.isEnabled(f, user)])
    ) as Record<FeatureFlag, boolean>;
  }
}

export const featureFlags = new FeatureFlagService();

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const ctx = useContext(AuthContext);
  const user = ctx?.user as (UserContext & { orgRole?: string }) | null;
  return featureFlags.isEnabled(flag, user ? { role: user.orgRole, userId: user.id as string } : undefined);
}
