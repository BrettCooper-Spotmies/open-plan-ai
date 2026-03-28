import { setImplicitRecoveryFlag } from "@/utils/recoveryFlowFlags";

/**
 * Run before any module imports `@/integrations/supabase/client`.
 * Supabase often redirects recovery links to the Site URL root; the fragment still
 * contains `type=recovery` + tokens. Rewriting to `/reset-password` keeps the hash
 * intact so GoTrue can parse it, while React Router matches the correct route.
 *
 * Default Supabase JS uses implicit flow for email links; PKCE `?code=` is not rewritten
 * here because OAuth providers use the same parameter.
 */
export function normalizeRecoveryUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const pathname = url.pathname;

  if (pathname === "/reset-password" || pathname.endsWith("/reset-password")) return;

  const fragment = url.hash.replace(/^#/, "");
  if (!fragment) return;

  const isImplicitRecovery =
    fragment.includes("type=recovery") ||
    fragment.includes("type%3Drecovery") ||
    fragment.includes("type%253Drecovery");

  if (!isImplicitRecovery) return;

  url.pathname = "/reset-password";
  setImplicitRecoveryFlag();
  window.history.replaceState(window.history.state, "", url.toString());
}

normalizeRecoveryUrl();
