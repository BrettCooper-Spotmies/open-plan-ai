import type { Session } from "@supabase/supabase-js";
import { hasActiveRecoveryFlowFlag } from "@/utils/recoveryFlowFlags";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function amrIncludesRecovery(amr: unknown): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (entry === "recovery") return true;
    if (typeof entry === "string" && entry.toLowerCase() === "recovery") return true;
    if (typeof entry === "object" && entry !== null && "method" in entry) {
      const m = (entry as { method: string }).method;
      return m === "recovery" || m?.toLowerCase?.() === "recovery";
    }
    return false;
  });
}

/**
 * True when the access token was issued for the email password-recovery flow.
 * Supabase sets AMR to include `recovery` until the user sets a new password.
 */
export function isPasswordRecoverySession(session: Session | null): boolean {
  if (!session?.access_token) return false;
  const payload = decodeJwtPayload(session.access_token);
  if (!payload) return false;
  return amrIncludesRecovery(payload.amr);
}

/**
 * User must finish on /reset-password (new + confirm password), not the main app.
 * Covers: JWT `amr` recovery, PASSWORD_RECOVERY, implicit `type=recovery` (URL normalized + flag),
 * and PKCE return with `?code=` after requesting a reset (URL normalized + flag).
 */
export function mustCompletePasswordResetFlow(session: Session | null): boolean {
  if (!session?.access_token) return false;
  if (isPasswordRecoverySession(session)) return true;
  return hasActiveRecoveryFlowFlag();
}
