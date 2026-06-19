import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Returns the active timezone for the current user, in priority order:
 * 1. Organization settings timezone (set on the Settings → General page)
 * 2. User profile timezone
 * 3. Browser's local timezone (fallback)
 */
export function useUserTimezone(): string {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const orgTimezone = (currentOrganization?.settings as Record<string, unknown>)?.timezone as string | undefined;
  return orgTimezone || user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}
